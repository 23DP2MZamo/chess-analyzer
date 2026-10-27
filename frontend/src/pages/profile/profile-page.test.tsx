import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfilePage from './profile-page';
import { api, ApiError } from '../../lib/api';
vi.mock('../../lib/api', async (original) => ({
  ...(await original<typeof import('../../lib/api')>()),
  api: vi.fn(),
}));
const mockApi = vi.mocked(api);
const account = {
  id: 'a',
  platform: 'CHESSCOM',
  platformUsername: 'ExternalPlayer',
  connectedAt: '2026-01-01',
};
const fixture = {
  user: { id: 'u', username: 'Player', createdAt: '2026-01-01', role: 'USER' },
  accounts: [account],
  summary: { total: 3, wins: 2, losses: 1, draws: 0, winRate: 66.7 },
  ratingSeries: [
    {
      platform: 'CHESSCOM',
      username: 'ExternalPlayer',
      currentRating: 1450,
      points: [
        { gameId: 'g1', date: '2026-01-01', rating: 1400 },
        { gameId: 'g2', date: '2026-01-02', rating: 1450 },
      ],
    },
  ],
  recentGames: [
    {
      id: 'g2',
      platform: 'CHESSCOM',
      opponent: 'Opponent',
      opponentRating: 1500,
      outcome: 'WIN',
      format: 'BLITZ',
      mode: 'RATED',
      timeControl: '180+2',
      playedAt: '2026-01-02',
      moveCount: 30,
      opening: { eco: 'C50', name: 'Italian Game' },
    },
  ],
};
const open = () =>
  render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>,
  );
beforeEach(() => {
  mockApi.mockReset();
  mockApi.mockResolvedValue(fixture);
});
describe('Profile dashboard', () => {
  it('shows actual ratings, matches, chart and connections while settings have their own route', async () => {
    open();
    expect(await screen.findByRole('heading', { name: 'ExternalPlayer' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Rating history/ })).toBeInTheDocument();
    expect(screen.getByText('1450')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Account settings/ })).toHaveAttribute(
      'href',
      '/settings',
    );
    expect(screen.queryByLabelText('Jauna parole')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Opponent.*Analyze/ })).toHaveAttribute(
      'href',
      '/analyze/games/g2',
    );
  });
  it('switches platform and rating format instead of mixing ratings', async () => {
    open();
    await screen.findByRole('heading', { name: 'ExternalPlayer' });
    await userEvent.click(screen.getByRole('tab', { name: 'Lichess' }));
    await waitFor(() =>
      expect(mockApi).toHaveBeenLastCalledWith('/user/me/dashboard?platform=LICHESS&format=BLITZ'),
    );
    await userEvent.selectOptions(screen.getByLabelText('Rating format'), 'RAPID');
    await waitFor(() =>
      expect(mockApi).toHaveBeenLastCalledWith('/user/me/dashboard?platform=LICHESS&format=RAPID'),
    );
  });
  it('supports connecting an account from an honest empty profile', async () => {
    let connected = false;
    mockApi.mockImplementation(async (_path, init) => {
      if (init?.method === 'POST') {
        connected = true;
        return account;
      }
      return {
        ...fixture,
        accounts: connected ? [account] : [],
        ratingSeries: [],
        recentGames: [],
        summary: { total: 0, wins: 0, losses: 0, draws: 0, winRate: null },
      };
    });
    open();
    await screen.findByRole('heading', { name: 'Player' });
    expect(screen.getByText(/No rated games for this format/)).toBeInTheDocument();
    expect(screen.getByText('No imported matches for this platform yet.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Platform username'), 'ExternalPlayer');
    await userEvent.click(screen.getByRole('button', { name: 'Connect account' }));
    expect(await screen.findByRole('status')).toHaveTextContent('account connected');
    expect(mockApi).toHaveBeenCalledWith('/accounts/chesscom', {
      method: 'POST',
      body: '{"username":"ExternalPlayer"}',
    });
  });
  it('handles a failed dashboard request and retry without showing fake data', async () => {
    mockApi.mockRejectedValueOnce(new ApiError('Database temporarily unavailable', 503));
    open();
    expect(await screen.findByRole('alert')).toHaveTextContent('Database temporarily unavailable');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'ExternalPlayer' })).toBeInTheDocument();
  });
});
