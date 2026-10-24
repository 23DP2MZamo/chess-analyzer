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

  it('redirects Analyze a game to login and returns to Analyze after successful login', async () => {
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
    expect(await screen.findByRole('heading', { name: 'Analyze a game' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/analyze');
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

  it('rejects external redirects and keeps valid local return paths', () => {
    for (const path of ['https://evil.example', '//evil.example', '/login', '/unknown']) {
      expect(loginDestination('?redirect=' + encodeURIComponent(path))).toBe('/profile');
    }
    expect(loginDestination('?redirect=%2Fanalyze%3Ffen%3Dtest')).toBe('/analyze?fen=test');
  });
});
