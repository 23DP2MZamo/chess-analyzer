import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ToolPage from './tool-page';
import { api, ApiError } from '../lib/api';
vi.mock('../lib/api', async (original) => ({
  ...(await original<typeof import('../lib/api')>()),
  api: vi.fn(),
}));
const mockApi = vi.mocked(api);
const result = {
  engine: 'Stockfish 19',
  fen: 'fixture',
  bestMove: 'e2e4',
  depth: 8,
  score: { type: 'cp', value: 35 },
  pv: ['e2e4', 'e7e5'],
  elapsedMs: 100,
};
const open = () =>
  render(
    <MemoryRouter>
      <ToolPage />
    </MemoryRouter>,
  );
beforeEach(() => {
  mockApi.mockReset();
});
describe('Position analysis', () => {
  it('submits a FEN and displays White-perspective evaluation, move and completed depth', async () => {
    mockApi.mockResolvedValue(result);
    open();
    await userEvent.click(screen.getByRole('button', { name: 'Analyze position' }));
    expect(await screen.findByText('+0.35')).toBeInTheDocument();
    expect(screen.getByText('e2e4')).toBeInTheDocument();
    expect(screen.getByText(/Depth 8/)).toBeInTheDocument();
    expect(mockApi).toHaveBeenCalledWith(
      '/analysis/position',
      expect.objectContaining({ method: 'POST', body: expect.stringContaining('"depth":12') }),
    );
    await userEvent.clear(screen.getByLabelText('FEN position'));
    expect(screen.queryByText('+0.35')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analyze position' })).toBeDisabled();
  });
  it('disables invalid depths and prevents duplicate submissions during loading', async () => {
    let resolve!: (value: unknown) => void;
    mockApi.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    open();
    const depth = screen.getByLabelText('Search depth (1–18)');
    await userEvent.clear(depth);
    await userEvent.type(depth, '19');
    expect(screen.getByRole('button', { name: 'Analyze position' })).toBeDisabled();
    await userEvent.clear(depth);
    await userEvent.type(depth, '3');
    await userEvent.click(screen.getByRole('button', { name: 'Analyze position' }));
    expect(screen.getByRole('button', { name: 'Analyzing…' })).toBeDisabled();
    expect(screen.getByLabelText('FEN position')).toBeDisabled();
    resolve(result);
    await screen.findByText('+0.35');
    expect(mockApi).toHaveBeenCalledTimes(1);
  });
  it('shows actionable API failures and allows retry', async () => {
    mockApi
      .mockRejectedValueOnce(new ApiError('Invalid FEN position', 400))
      .mockResolvedValueOnce(result);
    open();
    await userEvent.click(screen.getByRole('button', { name: 'Analyze position' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid FEN position');
    await userEvent.click(screen.getByRole('button', { name: 'Analyze position' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(await screen.findByText('+0.35')).toBeInTheDocument();
  });
});
