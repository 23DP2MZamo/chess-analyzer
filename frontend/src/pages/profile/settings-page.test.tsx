import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsPage from './settings-page';
import { api, ApiError } from '../../lib/api';

vi.mock('../../lib/api', async (original) => {
  const actual = await original<typeof import('../../lib/api')>();
  return { ...actual, api: vi.fn() };
});
const mockApi = vi.mocked(api);
const initial = { id: 'u1', username: 'Player', email: 'player@example.com', role: 'USER' };
function openProfile() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  );
}
async function loaded() {
  return screen.findByDisplayValue('Player');
}

describe('Account settings', () => {
  beforeEach(() => {
    mockApi.mockReset();
    mockApi.mockImplementation(async (path) => (path === '/accounts' ? [] : initial));
  });
  it('shows the current profile and disables saving unchanged fields', async () => {
    openProfile();
    await loaded();
    expect(screen.getByDisplayValue(initial.email)).toBeInTheDocument();
    expect(screen.getByText('Loma: USER')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Saglabāt izmaiņas/ })).toBeDisabled();
  });
  it('shows validation errors and prevents invalid submissions', async () => {
    const user = userEvent.setup();
    openProfile();
    await user.clear(await loaded());
    await user.type(screen.getByLabelText('Lietotājvārds'), 'ab');
    expect(screen.getByRole('alert')).toHaveTextContent('vismaz 3');
    expect(screen.getByRole('button', { name: /Saglabāt izmaiņas/ })).toBeDisabled();
    expect(mockApi.mock.calls.filter(([, init]) => init?.method === 'PATCH')).toHaveLength(0);
  });
  it('saves edited data, clears the password, and reloads persisted values on reopening', async () => {
    const user = userEvent.setup();
    let persisted = { ...initial };
    mockApi.mockImplementation(async (path, init) => {
      if (path === '/accounts') return [];
      if (init?.method === 'PATCH') persisted = { ...persisted, ...JSON.parse(String(init.body)) };
      return persisted;
    });
    const view = openProfile();
    const name = await loaded();
    await user.clear(name);
    await user.type(name, 'NewPlayer');
    await user.click(screen.getByRole('button', { name: /Saglabāt izmaiņas/ }));
    expect(await screen.findByRole('status')).toHaveTextContent('veiksmīgi');
    expect(screen.getByRole('button', { name: /Saglabāt izmaiņas/ })).toBeDisabled();
    view.unmount();
    openProfile();
    expect(await screen.findByDisplayValue('NewPlayer')).toBeInTheDocument();
  });
  it('locks fields while saving and displays API failures without discarding edits', async () => {
    const user = userEvent.setup();
    let rejectSave!: (error: Error) => void;
    mockApi.mockImplementation(async (path, init) => {
      if (path === '/accounts') return [];
      if (init?.method === 'PATCH')
        return new Promise((_resolve, reject) => {
          rejectSave = reject;
        });
      return initial;
    });
    openProfile();
    await user.type(await loaded(), '2');
    await user.click(screen.getByRole('button', { name: /Saglabāt izmaiņas/ }));
    expect(screen.getByLabelText('Lietotājvārds')).toBeDisabled();
    rejectSave(new ApiError('Username already taken', 409));
    expect(await screen.findByRole('alert')).toHaveTextContent('Username already taken');
    expect(screen.getByDisplayValue('Player2')).toBeEnabled();
  });
  it('shows loading then a recoverable error if the profile cannot be fetched', async () => {
    let rejectLoad!: (error: Error) => void;
    mockApi.mockImplementation(async (path) =>
      path === '/accounts'
        ? []
        : new Promise((_resolve, reject) => {
            rejectLoad = reject;
          }),
    );
    openProfile();
    expect(screen.getByText('Ielādējam profilu...')).toBeInTheDocument();
    rejectLoad(new ApiError('Authentication required', 401));
    expect(await screen.findByRole('alert')).toHaveTextContent('Authentication required');
    expect(screen.queryByLabelText('Lietotājvārds')).not.toBeInTheDocument();
    mockApi.mockImplementation(async (path) => (path === '/accounts' ? [] : initial));
    await userEvent.click(screen.getByRole('button', { name: 'Mēģināt vēlreiz' }));
    await waitFor(() => expect(screen.getByDisplayValue('Player')).toBeInTheDocument());
  });
});
