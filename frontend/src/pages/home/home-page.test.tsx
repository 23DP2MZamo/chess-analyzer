import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import HomePage from './home-page';
vi.mock('../../lib/use-current-user', () => ({ useCurrentUser: () => ({ user: null }) }));
describe('Home cards', () => {
  it.each([
    ['Start analysis', '/analyze'],
    ['Open games', '/games'],
    ['View statistics', '/stats'],
  ])('makes the whole %s card a keyboard-accessible link', async (name, destination) => {
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path={destination} element={<p>Destination reached</p>} />
        </Routes>
      </MemoryRouter>,
    );
    const card = screen.getByRole('link', { name });
    expect(card).toHaveAttribute('href', destination);
    expect(card.querySelector('h2')).not.toBeNull();
    expect(card.querySelector('a')).toBeNull();
    expect(card.querySelector('svg')).not.toBeNull();
    expect(card.textContent).not.toContain('↗');
    await userEvent.click(card.querySelector('p')!);
    expect(screen.getByText('Destination reached')).toBeInTheDocument();
  });
});
