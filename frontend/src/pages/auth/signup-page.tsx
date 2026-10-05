import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import AuthPage, { authInputClass, authLabelClass } from './auth-page';

export default function SignupPage() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const username = String(data.get('username') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');
    const confirmPassword = String(data.get('confirmPassword') ?? '');
    if (username.length < 3) {
      setError('Lietotājvārdam jābūt vismaz 3 rakstzīmes garam.');
      return;
    }
    if (!email || !password) {
      setError('Lūdzu, aizpildiet visus laukus.');
      return;
    }
    if (password.length < 7) {
      setError('Parolei jābūt vismaz 7 rakstzīmes garai.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Paroles nesakrīt.');
      return;
    }

    setPending(true);
    setError('');
    try {
      await api('/user', { method: 'POST', body: JSON.stringify({ username, email, password }) });
      navigate('/login');
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : 'Neizdevās izveidot kontu. Mēģiniet vēlreiz.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthPage
      eyebrow="Sāciet savu ceļu"
      title="Izveidojiet kontu"
      subtitle="Saglabājiet savas partijas un sekojiet līdzi progresam."
      onSubmit={handleSubmit}
      submitLabel="Izveidot kontu"
      pending={pending}
      error={error}
      footerText="Jau ir konts?"
      footerLink="/login"
      footerLabel="Pieslēgties"
    >
      <label className={authLabelClass}>
        Lietotājvārds
        <input
          className={authInputClass}
          name="username"
          type="text"
          autoComplete="username"
          placeholder="Jūsu lietotājvārds"
          autoFocus
          minLength={3}
        />
      </label>
      <label className={authLabelClass}>
        E-pasts
        <input
          className={authInputClass}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="anna@epasts.lv"
        />
      </label>
      <label className={authLabelClass}>
        Parole
        <input
          className={authInputClass}
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Vismaz 7 rakstzīmes"
          minLength={7}
        />
      </label>
      <label className={authLabelClass}>
        Apstipriniet paroli
        <input
          className={authInputClass}
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Ievadiet paroli vēlreiz"
        />
      </label>
    </AuthPage>
  );
}
