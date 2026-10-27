import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { api, ApiError } from './lib/api';

vi.mock('./lib/api', async (original) => {
  const actual = await original<typeof import('./lib/api')>();
  return { ...actual, api: vi.fn() };
});

const mockApi = vi.mocked(api);
const admin = {
  id: 'admin-id',
  username: 'Admin',
  email: 'admin@example.com',
  role: 'ADMIN' as const,
};
const regularUser = {
  id: 'player-id',
  username: 'Player',
  email: 'player@example.com',
  role: 'USER' as const,
  isBlocked: false,
  createdAt: '2026-01-15T10:00:00.000Z',
};
const adminRow = {
  ...admin,
  isBlocked: false,
  createdAt: '2026-01-10T10:00:00.000Z',
};
let playerDeleted = false;

function openAdminPage() {
  window.history.replaceState(null, '', '/admin');
  return render(<App />);
}

describe('Admin panel', () => {
  beforeEach(() => {
    playerDeleted = false;
    mockApi.mockReset();
    mockApi.mockImplementation(async (path, init) => {
      if (path === '/auth/protected') return admin;
      if (path === '/user') return playerDeleted ? [adminRow] : [adminRow, regularUser];
      if (path === '/user/admin/stats') return { users: 2, games: 12, analyses: 8 };
      if (path === '/user/player-id/block') {
        return { ...regularUser, isBlocked: JSON.parse(init?.body as string).blocked };
      }
      if (path === '/user/player-id' && init?.method === 'DELETE') {
        playerDeleted = true;
        return { id: regularUser.id };
      }
      throw new ApiError(`Unexpected request: ${path}`, 500);
    });
  });

  it('shows system statistics and the searchable user list to an administrator', async () => {
    openAdminPage();

    expect(await screen.findByRole('heading', { name: 'Admin panelis' })).toBeInTheDocument();
    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('player@example.com')).toBeInTheDocument();

    await userEvent.type(screen.getByRole('searchbox'), 'player@');
    expect(screen.getByText('player@example.com')).toBeInTheDocument();
    expect(screen.queryByText('admin@example.com')).not.toBeInTheDocument();
  });

  it('blocks a user and updates the row after the API confirms the change', async () => {
    openAdminPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Bloķēt Player' }));

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith(
        '/user/player-id/block',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ blocked: true }),
        }),
      );
    });
    expect(await screen.findByText('Lietotājs “Player” ir bloķēts.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Atbloķēt Player' })).toBeInTheDocument();
  });

  it('does not expose admin data to a regular user', async () => {
    mockApi.mockImplementation(async (path) => {
      if (path === '/auth/protected') return { ...admin, role: 'USER' };
      throw new ApiError('Forbidden', 403);
    });
    openAdminPage();

    expect(await screen.findByText('Šī sadaļa paredzēta administratoriem.')).toBeInTheDocument();
    expect(mockApi).toHaveBeenCalledTimes(1);
    expect(mockApi).not.toHaveBeenCalledWith('/user');
  });

  it('requires explicit confirmation before deleting a user', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    openAdminPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Dzēst Player' }));

    expect(confirm).toHaveBeenCalledOnce();
    expect(mockApi).not.toHaveBeenCalledWith('/user/player-id', { method: 'DELETE' });
    confirm.mockRestore();
  });

  it('deletes the user and refreshes the list after confirmation', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    openAdminPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Dzēst Player' }));

    await waitFor(() =>
      expect(mockApi).toHaveBeenCalledWith('/user/player-id', { method: 'DELETE' }),
    );
    expect(await screen.findByText('Lietotājs “Player” ir dzēsts.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('player@example.com')).not.toBeInTheDocument());
    confirm.mockRestore();
  });
});
