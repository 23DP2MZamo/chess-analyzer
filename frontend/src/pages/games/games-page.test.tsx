import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GamesPage from './games-page';
import { api, ApiError } from '../../lib/api';
vi.mock('../../lib/api', async (original) => ({
  ...(await original<typeof import('../../lib/api')>()),
  api: vi.fn(),
}));
const mockApi = vi.mocked(api);
const fixture = {
  total: 26,
  page: 1,
  pageSize: 25,
  groups: [{ key: 'B20|Sicilian', eco: 'B20', name: 'Sicilian', count: 26 }],
  items: [
    {
      id: 'game1',
      platform: 'LICHESS',
      whiteUsername: 'Player',
      blackUsername: 'Opponent',
      playedAt: '2026-10-01T10:00:00Z',
      format: 'BLITZ',
      mode: 'RATED',
      opening: { eco: 'B20', name: 'Sicilian' },
      groupKey: 'B20|Sicilian',
      playerResult: 'WIN',
      playerElo: 1500,
      playerAccuracy: 85.5,
    },
  ],
};
const open = (url = '/games') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <GamesPage />
    </MemoryRouter>,
  );
beforeEach(() => {
  mockApi.mockReset();
  mockApi.mockResolvedValue(fixture);
});
describe('Game history filters', () => {
  it('requests combined filters, resets pagination, and keeps URL state on reopening', async () => {
    open('/games?format=BLITZ&result=WIN&mode=RATED&sortBy=accuracy&order=asc&groupBy=opening');
    expect(await screen.findByText('85.5%')).toBeInTheDocument();
    expect(screen.getByLabelText('Format')).toHaveValue('BLITZ');
    expect(screen.getByText('B20 · Sicilian — 26 games')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() =>
      expect(mockApi).toHaveBeenLastCalledWith(expect.stringContaining('page=2')),
    );
    await userEvent.selectOptions(screen.getByLabelText('Format'), 'RAPID');
    await waitFor(() =>
      expect(mockApi).toHaveBeenLastCalledWith(expect.stringContaining('format=RAPID')),
    );
    const path = mockApi.mock.calls.at(-1)![0];
    expect(path).toContain('result=WIN');
    expect(path).toContain('sortBy=accuracy');
    expect(path).not.toContain('page=2');
    await userEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    await waitFor(() => expect(mockApi).toHaveBeenLastCalledWith('/games/search'));
  });
  it('rejects reversed date ranges without submitting and handles empty matches', async () => {
    open('/games?dateFrom=2026-10-05&dateTo=2026-10-01');
    expect(await screen.findByRole('alert')).toHaveTextContent('Start date');
    expect(mockApi).not.toHaveBeenCalled();
    mockApi.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25, groups: [] });
    await userEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(await screen.findByText('No matching games')).toBeInTheDocument();
  });
  it('handles API errors with retry', async () => {
    mockApi.mockRejectedValueOnce(new ApiError('Database unavailable', 503));
    open();
    expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('85.5%')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('keeps the import limit and reloads the filtered page after importing', async () => {
    mockApi.mockImplementation(async (path) =>
      path.includes('/import') ? { imported: 2, skipped: 1 } : fixture,
    );
    open('/games?format=BLITZ');
    await screen.findByText('85.5%');
    await userEvent.clear(screen.getByLabelText('Lichess game limit'));
    expect(screen.getByRole('button', { name: 'Import Lichess games' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Lichess game limit'), '25');
    await userEvent.click(screen.getByRole('button', { name: 'Import Lichess games' }));
    expect(await screen.findByText('2 games imported, 1 already existed.')).toBeInTheDocument();
    expect(mockApi).toHaveBeenCalledWith('/games/lichess/import', {
      method: 'POST',
      body: '{"limit":25}',
    });
    await waitFor(() => expect(mockApi).toHaveBeenLastCalledWith('/games/search?format=BLITZ'));
  });
  it('provides a direct game analysis action and a clearly labeled empty-library sample preview', async () => {
    open();
    expect(await screen.findByRole('link', { name: /Analyze game/ })).toHaveAttribute(
      'href',
      '/analyze/games/game1',
    );
  });
  it('shows samples separately from personal history when no games have been synced', async () => {
    mockApi.mockImplementation(async (path) =>
      path === '/analysis/samples'
        ? [
            {
              id: 'sample-scholar',
              title: 'A quick mating attack',
              opening: 'King’s Pawn Game',
              format: 'BLITZ',
            },
          ]
        : { items: [], total: 0, totalOwned: 0, page: 1, pageSize: 25, groups: [] },
    );
    open();
    expect(await screen.findByRole('link', { name: /Analyze sample/ })).toHaveAttribute(
      'href',
      '/analyze/games/sample-scholar',
    );
    expect(screen.getByText(/These are practice games/)).toBeInTheDocument();
    expect(screen.getByText('0 matching games')).toBeInTheDocument();
  });
});
