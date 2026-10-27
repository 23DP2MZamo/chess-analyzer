import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { api, ApiError } from './lib/api';
import { loginDestination } from './lib/login-destination';

vi.mock('./lib/api', async (original) => {
  const actual = await original<typeof import('./lib/api')>();
  return { ...actual, api: vi.fn() };
});
const mockApi = vi.mocked(api);
const user = { id: 'user-id', username: 'Player', email: 'player@example.com', role: 'USER' };
let signedIn = false;

describe('Account navigation', () => {
  beforeEach(() => {
    signedIn = false;
    window.history.replaceState(null, '', '/home');
    mockApi.mockReset();
    mockApi.mockImplementation(async (path) => {
      if (path === '/auth/protected') {
        if (!signedIn) throw new ApiError('Authentication required', 401);
        return user;
      }
      if (path === '/auth/signin') {
        signedIn = true;
        return { accessToken: 'test-token' };
      }
      if (path === '/accounts' || path === '/games') return [];
      if (path.startsWith('/user/me/dashboard'))
        return {
          user,
          accounts: [],
          summary: { total: 0, wins: 0, losses: 0, draws: 0, winRate: null },
          ratingSeries: [],
          recentGames: [],
        };
      if (path === '/auth/signup') {
        signedIn = true;
        return { user };
      }
      return user;
    });
  });

  it('provides a visible login entry on the home page', async () => {
    render(<App />);
    const links = await screen.findAllByRole('link', { name: 'Log in' });
    expect(links.every((link) => link.getAttribute('href') === '/login')).toBe(true);
    await userEvent.click(links[0]);
    expect(await screen.findByRole('button', { name: /Pieslēgties/ })).toBeInTheDocument();
  });

  it('redirects Analyze to login and lands on Profile after successful login', async () => {
    const visitor = userEvent.setup();
    render(<App />);
    await visitor.click(screen.getByRole('link', { name: /Analyze a game/ }));
    await screen.findByRole('button', { name: /Pieslēgties/ });
    expect(window.location.pathname).toBe('/login');
    expect(new URLSearchParams(window.location.search).get('redirect')).toBe('/analyze');
    expect(screen.queryByRole('heading', { name: 'Analyze a game' })).not.toBeInTheDocument();
    await visitor.type(screen.getByLabelText('Lietotājvārds vai e-pasts'), 'Player');
    await visitor.type(screen.getByLabelText('Parole'), 'test-password');
    await visitor.click(screen.getByRole('button', { name: /Pieslēgties/ }));
    expect(await screen.findByRole('heading', { name: 'Your profile' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/profile');
  });

  it.each(['/analyze', '/games', '/stats', '/profile'])(
    'protects a direct visit to %s',
    async (path) => {
      window.history.replaceState(null, '', path + '?source=home#content');
      render(<App />);
      await screen.findByRole('button', { name: /Pieslēgties/ });
      expect(window.location.pathname).toBe('/login');
      expect(new URLSearchParams(window.location.search).get('redirect')).toBe(
        path + '?source=home#content',
      );
    },
  );

  it('lets a signed-in user open Analyze and shows Profile in the home navbar', async () => {
    signedIn = true;
    render(<App />);
    expect((await screen.findAllByRole('link', { name: 'Profile' }))[0]).toHaveAttribute(
      'href',
      '/profile',
    );
    await userEvent.click(screen.getByRole('link', { name: /Analyze a game/ }));
    expect(await screen.findByRole('heading', { name: 'Analyze a game' })).toBeInTheDocument();
  });

  it('keeps protected content hidden while checking the session', async () => {
    window.history.replaceState(null, '', '/analyze');
    let resolveCheck!: (value: typeof user) => void;
    mockApi.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCheck = resolve;
        }),
    );
    render(<App />);
    expect(screen.getByRole('status')).toHaveTextContent('Checking your session');
    expect(screen.queryByRole('heading', { name: 'Analyze a game' })).not.toBeInTheDocument();
    resolveCheck(user);
    expect(await screen.findByRole('heading', { name: 'Analyze a game' })).toBeInTheDocument();
  });

  it('shows a retryable server error instead of pretending the user is signed out', async () => {
    window.history.replaceState(null, '', '/analyze');
    mockApi.mockRejectedValue(new ApiError('Server unavailable', 503));
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not verify your session');
    expect(window.location.pathname).toBe('/analyze');
    mockApi.mockResolvedValue(user);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Analyze a game' })).toBeInTheDocument(),
    );
  });

  it('always uses Profile as the authentication landing page', () => {
    for (const path of ['https://evil.example', '//evil.example', '/login', '/unknown']) {
      expect(loginDestination('?redirect=' + encodeURIComponent(path))).toBe('/profile');
    }
    expect(loginDestination('?redirect=%2Fanalyze%3Ffen%3Dtest')).toBe('/profile');
  });
  it('signs a new account in automatically and opens its profile', async () => {
    window.history.replaceState(null, '', '/signup');
    render(<App />);
    await userEvent.type(screen.getByLabelText('Lietotājvārds'), 'Player');
    await userEvent.type(screen.getByLabelText('E-pasts'), 'player@example.com');
    await userEvent.type(screen.getByLabelText('Parole', { exact: true }), 'test-password');
    await userEvent.type(screen.getByLabelText('Apstipriniet paroli'), 'test-password');
    await userEvent.click(screen.getByRole('button', { name: 'Izveidot kontu' }));
    expect(await screen.findByRole('heading', { name: 'Your profile' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/profile');
    expect(mockApi).toHaveBeenCalledWith(
      '/auth/signup',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(mockApi).not.toHaveBeenCalledWith('/auth/signin', expect.anything());
  });
  it('includes Profile, Games, Analyze and Settings navigation on the analyzer', async () => {
    signedIn = true;
    window.history.replaceState(null, '', '/analyze');
    render(<App />);
    const navigation = await screen.findByRole('navigation', { name: 'Account navigation' });
    expect(navigation).toHaveTextContent('Profile');
    expect(navigation).toHaveTextContent('Games');
    expect(navigation).toHaveTextContent('Analyze');
    expect(navigation).toHaveTextContent('Settings');
  });
});
