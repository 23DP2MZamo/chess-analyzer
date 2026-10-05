import { Outlet } from 'react-router-dom';

function MainLayout() {
  return (
    <div>
      <nav>Navbar</nav>
      <button onClick={login}></button>
      <main>
        <Outlet />
      </main>

      <footer>Footer</footer>
    </div>
  );
}

async function login() {
  // 1. Create verifier
  const codeVerifier = crypto.randomUUID();

  sessionStorage.setItem('code_verifier', codeVerifier);

  // 2. Create challenge
  const data = new TextEncoder().encode(codeVerifier);

  const hash = await crypto.subtle.digest('SHA-256', data);

  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  // 3. Create state
  const state = crypto.randomUUID();

  sessionStorage.setItem('oauth_state', state);

  // 4. Go to Lichess
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: 'my-chess-app',
    redirect_uri: 'http://localhost:5173/oauth',
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    state,
  });

  window.location.href = `https://oauth.lichess.org/oauth/authorize?${params}`;
}

export default MainLayout;
