import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';

type Profile = {
  id: string;
  username: string;
  email: string;
  role: string;
};

type LinkedAccount = {
  id: string;
  platform: 'CHESSCOM' | 'LICHESS';
  platformUsername: string;
  connectedAt: string;
};

type FormValues = {
  username: string;
  email: string;
  password: string;
};

const emptyForm: FormValues = { username: '', email: '', password: '' };

function validate(values: FormValues) {
  if (values.username.trim().length < 3) return 'Lietotājvārdam jābūt vismaz 3 rakstzīmes garam.';
  if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) return 'Ievadiet derīgu e-pasta adresi.';
  if (values.password && values.password.length < 7)
    return 'Parolei jābūt vismaz 7 rakstzīmes garai.';
  return '';
}

export default function ProfilePage() {
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [saved, setSaved] = useState<FormValues>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [accountUsername, setAccountUsername] = useState('');
  const [accountPlatform, setAccountPlatform] = useState<LinkedAccount['platform']>('CHESSCOM');
  const [accountPending, setAccountPending] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [accountSuccess, setAccountSuccess] = useState('');

  useEffect(() => {
    let active = true;
    api<Profile>('/user/me')
      .then((profile) => {
        if (!active) return;
        const values = { username: profile.username, email: profile.email, password: '' };
        setForm(values);
        setSaved(values);
      })
      .catch((caughtError) => {
        if (active) {
          setError(
            caughtError instanceof ApiError ? caughtError.message : 'Neizdevās ielādēt profilu.',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    api<LinkedAccount[]>('/accounts')
      .then(setLinkedAccounts)
      .catch((caughtError) => {
        setAccountError(
          caughtError instanceof ApiError
            ? caughtError.message
            : 'Neizdevās ielādēt piesaistītos kontus.',
        );
      });
  }, []);

  const dirty =
    form.username !== saved.username || form.email !== saved.email || form.password !== '';
  const validationError = validate(form);

  function updateField(field: keyof FormValues, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
    setSuccess('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dirty || validationError) {
      setError(validationError || 'Nav neizmainītu datu, ko saglabāt.');
      return;
    }

    setPending(true);
    setError('');
    setSuccess('');
    try {
      const updated = await api<Profile>('/user/me', {
        method: 'PATCH',
        body: JSON.stringify({
          username: form.username.trim(),
          email: form.email.trim(),
          ...(form.password ? { password: form.password } : {}),
        }),
      });
      const values = { username: updated.username, email: updated.email, password: '' };
      setForm(values);
      setSaved(values);
      setSuccess('Profils ir veiksmīgi atjaunināts.');
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError ? caughtError.message : 'Neizdevās saglabāt izmaiņas.',
      );
    } finally {
      setPending(false);
    }
  }

  async function handleLinkAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const username = accountUsername.trim();
    if (!username) {
      setAccountError('Ievadiet ārējās platformas lietotājvārdu.');
      return;
    }

    setAccountPending(true);
    setAccountError('');
    setAccountSuccess('');
    try {
      const linked = await api<LinkedAccount>(
        `/accounts/${accountPlatform === 'CHESSCOM' ? 'chesscom' : 'lichess'}`,
        {
          method: 'POST',
          body: JSON.stringify({ username }),
        },
      );
      setLinkedAccounts((current) => [...current, linked]);
      setAccountUsername('');
      setAccountSuccess(
        `${accountPlatform === 'CHESSCOM' ? 'Chess.com' : 'Lichess'} konts ir piesaistīts.`,
      );
    } catch (caughtError) {
      setAccountError(
        caughtError instanceof ApiError ? caughtError.message : 'Neizdevās piesaistīt kontu.',
      );
    } finally {
      setAccountPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#202020] font-sans text-stone-100">
      <section className="mx-auto grid w-full max-w-5xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:gap-20 lg:py-20">
        <div className="max-w-md border-l border-[#bd5d2a]/70 pl-6">
          <Link className="text-sm text-stone-400 no-underline hover:text-white" to="/home">
            ← Home
          </Link>
          <p className="mb-5 mt-10 text-[10px] tracking-[.2em] text-[#d47440] uppercase">
            Jūsu konts
          </p>
          <h1 className="text-4xl leading-none font-extralight tracking-[-.04em] text-stone-100 sm:text-6xl">
            Profils
          </h1>
          <p className="mt-6 text-sm leading-relaxed text-stone-400">
            Pārvaldiet savu konta informāciju vienuviet.
          </p>
        </div>
        <div className="border border-white/10 bg-[#1c1c1c] p-5 shadow-2xl shadow-black/20 sm:p-8">
          <div className="mb-7 flex items-center justify-between border-b border-white/10 pb-4">
            <span className="text-xs tracking-[.16em] text-stone-400 uppercase">
              Konta informācija
            </span>
            <span className="size-1.5 rounded-full bg-[#dc6930] shadow-[0_0_10px_#dc6930]" />
          </div>
          {loading ? (
            <p className="py-12 text-center text-sm text-stone-500" role="status">
              Ielādējam profilu...
            </p>
          ) : (
            <form className="grid gap-5" onSubmit={handleSubmit} noValidate>
              <label className="grid gap-2 text-sm text-stone-300">
                Lietotājvārds
                <input
                  className="min-h-12 rounded-md border border-white/10 bg-black/15 px-4 text-stone-100 outline-none focus:border-[#bd5d2a]"
                  value={form.username}
                  onChange={(event) => updateField('username', event.target.value)}
                  minLength={3}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm text-stone-300">
                E-pasts
                <input
                  className="min-h-12 rounded-md border border-white/10 bg-black/15 px-4 text-stone-100 outline-none focus:border-[#bd5d2a]"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm text-stone-300">
                Jauna parole{' '}
                <span className="text-xs text-stone-500">Atstājiet tukšu, lai nemainītu</span>
                <input
                  className="min-h-12 rounded-md border border-white/10 bg-black/15 px-4 text-stone-100 outline-none focus:border-[#bd5d2a]"
                  type="password"
                  value={form.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  minLength={7}
                  autoComplete="new-password"
                />
              </label>
              {error && (
                <p
                  className="border border-red-400/30 bg-red-950/30 px-3 py-2.5 text-[13px] text-red-200"
                  role="alert"
                >
                  {error}
                </p>
              )}
              {success && (
                <p
                  className="border border-emerald-400/30 bg-emerald-950/30 px-3 py-2.5 text-[13px] text-emerald-200"
                  role="status"
                >
                  {success}
                </p>
              )}
              <button
                className="min-h-12 border border-[#c56531] bg-[#a94e22] px-5 text-sm font-medium text-white transition hover:bg-[#c25d2a] disabled:cursor-not-allowed disabled:opacity-50"
                type="submit"
                disabled={pending || !dirty || Boolean(validationError)}
              >
                {pending ? 'Saglabā...' : 'Saglabāt izmaiņas'}{' '}
                <span className="ml-3 text-lg font-light" aria-hidden="true">
                  →
                </span>
              </button>
            </form>
          )}
        </div>
        <div className="border border-white/10 bg-[#1c1c1c] p-5 shadow-2xl shadow-black/20 sm:p-8 lg:col-span-2">
          <div className="mb-7 flex items-center justify-between border-b border-white/10 pb-4">
            <span className="text-xs tracking-[.16em] text-stone-400 uppercase">
              Piesaistītie konti
            </span>
            <span className="text-xs text-stone-600">Chess.com / Lichess</span>
          </div>
          <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
            <div className="grid gap-3">
              {linkedAccounts.length === 0 ? (
                <p className="text-sm text-stone-500">Nav piesaistītu ārējo kontu.</p>
              ) : (
                linkedAccounts.map((account) => (
                  <div
                    className="flex items-center justify-between border border-white/8 px-4 py-3"
                    key={account.id}
                  >
                    <div>
                      <p className="text-sm text-stone-200">
                        {account.platform === 'CHESSCOM' ? 'Chess.com' : 'Lichess'}
                      </p>
                      <p className="text-xs text-stone-500">{account.platformUsername}</p>
                    </div>
                    <span className="text-xs text-emerald-400">Connected</span>
                  </div>
                ))
              )}
            </div>
            <form className="grid gap-4" onSubmit={handleLinkAccount}>
              <div className="flex gap-2">
                {(['CHESSCOM', 'LICHESS'] as const).map((platform) => (
                  <button
                    className={`flex-1 border px-3 py-3 text-xs ${accountPlatform === platform ? 'border-[#bd5d2a] text-white' : 'border-white/10 text-stone-500'}`}
                    key={platform}
                    type="button"
                    onClick={() => setAccountPlatform(platform)}
                  >
                    {platform === 'CHESSCOM' ? 'Chess.com' : 'Lichess'}
                  </button>
                ))}
              </div>
              <input
                className="min-h-12 rounded-md border border-white/10 bg-black/15 px-4 text-stone-100 outline-none focus:border-[#bd5d2a]"
                value={accountUsername}
                onChange={(event) => setAccountUsername(event.target.value)}
                placeholder="Platform username"
              />
              {accountError && (
                <p className="text-sm text-red-300" role="alert">
                  {accountError}
                </p>
              )}
              {accountSuccess && (
                <p className="text-sm text-emerald-300" role="status">
                  {accountSuccess}
                </p>
              )}
              <button
                className="min-h-12 border border-[#c56531] bg-[#a94e22] px-5 text-sm text-white disabled:opacity-50"
                type="submit"
                disabled={accountPending}
              >
                {accountPending ? 'Checking...' : 'Connect account'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
