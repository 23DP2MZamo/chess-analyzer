import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Chess, DEFAULT_POSITION } from 'chess.js';
import { api, ApiError } from '../lib/api';
import GameReviewPage from './game-review-page';
vi.mock('../lib/api', async (original) => ({
  ...(await original<typeof import('../lib/api')>()),
  api: vi.fn(),
}));
const mockApi = vi.mocked(api);
const chess = new Chess();
const move = chess.move('e4');
const game = {
  id: 'owned',
  whiteUsername: 'Player',
  blackUsername: 'Opponent',
  initialFen: DEFAULT_POSITION,
  moves: [{ san: 'e4', color: 'w', before: move.before, after: move.after }],
  isSample: false,
};
const completed = {
  status: 'completed',
  completed: 1,
  total: 1,
  result: {
    depth: 8,
    engine: 'Stockfish',
    blunderCount: 0,
    mistakeCount: 0,
    inaccuracyCount: 0,
    moves: [{ san: 'e4', classification: 'BEST', bestMove: 'e2e4', evalAfterCp: 30, mateIn: null }],
  },
};
const open = () =>
  render(
    <MemoryRouter initialEntries={['/analyze/games/owned']}>
      <Routes>
        <Route path="/analyze/games/:gameId" element={<GameReviewPage />} />
      </Routes>
    </MemoryRouter>,
  );
beforeEach(() => {
  mockApi.mockReset();
});
describe('Imported game review', () => {
  it('opens an imported game, starts analysis without a FEN, and supports move navigation', async () => {
    mockApi.mockImplementation(async (path, init) =>
      path.endsWith('/status') ? { status: 'idle' } : init?.method === 'POST' ? completed : game,
    );
    open();
    expect(await screen.findByText('Review complete')).toBeInTheDocument();
    expect(mockApi).toHaveBeenCalledWith('/analysis/games/owned', { method: 'POST' });
    await userEvent.click(screen.getByRole('button', { name: 'Next move' }));
    expect(screen.getByRole('region', { name: 'Move feedback' })).toHaveTextContent('e4 · best');
    expect(screen.getByRole('button', { name: 'Next move' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Previous move' }));
    expect(screen.getByText('Starting position')).toBeInTheDocument();
  });
  it('uses a saved review without restarting it', async () => {
    mockApi.mockImplementation(async (path) => (path.endsWith('/status') ? completed : game));
    open();
    await screen.findByText('Review complete');
    expect(mockApi.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });
  it('shows progress then polls until complete', async () => {
    let checks = 0;
    mockApi.mockImplementation(async (path) =>
      path.endsWith('/status')
        ? ++checks === 1
          ? { status: 'running', completed: 0, total: 1 }
          : completed
        : game,
    );
    open();
    expect(await screen.findByText('Analyzing your game…')).toBeInTheDocument();
    expect(await screen.findByText('Review complete', {}, { timeout: 3000 })).toBeInTheDocument();
  });
  it('handles missing games and failed reviews with retry', async () => {
    mockApi
      .mockRejectedValueOnce(new ApiError('Game not found', 404))
      .mockResolvedValue({ status: 'idle' });
    open();
    expect(await screen.findByRole('alert')).toHaveTextContent('Game not found');
    mockApi.mockImplementation(async (path) =>
      path.endsWith('/status') ? { status: 'failed', error: 'Engine unavailable' } : game,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Engine unavailable')).toBeInTheDocument();
    mockApi.mockResolvedValue(completed);
    await userEvent.click(screen.getByRole('button', { name: 'Analyze game' }));
    await waitFor(() => expect(screen.getByText('Review complete')).toBeInTheDocument());
  });
});
