import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loginDestination } from '../../lib/login-destination';
import { api, ApiError } from '../../lib/api';
import AuthPage, { authInputClass, authLabelClass } from './auth-page';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const identifier = String(data.get('identifier') ?? '').trim();
    const password = String(data.get('password') ?? '');
    if (!identifier || !password) {
      setError('Lūdzu, ievadiet lietotājvārdu vai e-pastu un paroli.');
      return;
    }

    setPending(true);
    setError('');
    try {
      await api('/auth/signin', { method: 'POST', body: JSON.stringify({ identifier, password }) });
      navigate(loginDestination(location.search), { replace: true });
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : 'Neizdevās pieslēgties. Mēģiniet vēlreiz.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthPage
      eyebrow="Laipni lūgti atpakaļ"
      title="Pieslēdzieties savai spēlei"
      subtitle="Turpiniet analizēt partijas un attīstīt savu stratēģiju."
      onSubmit={handleSubmit}
      submitLabel="Pieslēgties"
      pending={pending}
      error={error}
      footerText="Vēl nav konta?"
      footerLink={'/signup' + location.search}
      footerLabel="Izveidot kontu"
    >
      <label className={authLabelClass}>
        Lietotājvārds vai e-pasts
        <input
          className={authInputClass}
          name="identifier"
          type="text"
          autoComplete="username"
          placeholder="piem., anna@epasts.lv"
          autoFocus
        />
      </label>
      <label className={authLabelClass}>
        Parole
        <input
          className={authInputClass}
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Ievadiet paroli"
        />
      </label>
    </AuthPage>
  );
}
