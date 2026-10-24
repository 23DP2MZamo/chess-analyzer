const destinations = new Set(['/home', '/analyze', '/games', '/stats', '/profile']);

export function loginDestination(search: string): string {
  const requested = new URLSearchParams(search).get('redirect');
  if (!requested || !destinations.has(requested.split(/[?#]/, 1)[0])) return '/profile';
  return requested;
}
