import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ApiError, api } from '../../lib/api';

type AdminUser = {
  id: string;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN';
  isBlocked: boolean;
  createdAt: string;
};

type AdminStats = {
  users: number;
  games: number;
  analyses: number;
};

type UserFilter = 'ALL' | 'ACTIVE' | 'BLOCKED';

const panelClass = 'border border-white/10 bg-[#211f1d]';
const controlClass =
  'min-h-11 border border-white/12 bg-[#191817] px-3 text-sm text-stone-200 outline-none transition focus:border-[#c56531] focus:ring-1 focus:ring-[#c56531]/50';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export default function AdminPage() {
  const currentUser = useOutletContext<{ id: string }>();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<UserFilter>('ALL');
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([api<AdminUser[]>('/user'), api<AdminStats>('/user/admin/stats')])
      .then(([loadedUsers, loadedStats]) => {
        if (!active) return;
        setUsers(loadedUsers);
        setStats(loadedStats);
      })
      .catch((caughtError: unknown) => {
        if (active) setError(getErrorMessage(caughtError, 'Neizdevās ielādēt admina datus.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload]);

  const visibleUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return users.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        item.username.toLowerCase().includes(normalizedQuery) ||
        item.email.toLowerCase().includes(normalizedQuery);
      const matchesFilter =
        filter === 'ALL' || (filter === 'BLOCKED' ? item.isBlocked : !item.isBlocked);
      return matchesQuery && matchesFilter;
    });
  }, [filter, query, users]);

  async function toggleBlocked(account: AdminUser) {
    setPendingUserId(account.id);
    setActionError('');
    setNotice('');
    try {
      const updated = await api<AdminUser>(`/user/${account.id}/block`, {
        method: 'PATCH',
        body: JSON.stringify({ blocked: !account.isBlocked }),
      });
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setNotice(
        updated.isBlocked
          ? `Lietotājs “${updated.username}” ir bloķēts.`
          : `Lietotājs “${updated.username}” ir atbloķēts.`,
      );
    } catch (caughtError) {
      setActionError(getErrorMessage(caughtError, 'Neizdevās mainīt lietotāja statusu.'));
    } finally {
      setPendingUserId(null);
    }
  }

  async function deleteUser(account: AdminUser) {
    if (
      !window.confirm(
        `Vai tiešām dzēst lietotāju “${account.username}”? Šo darbību nevar atsaukt.`,
      )
    ) {
      return;
    }
    setPendingUserId(account.id);
    setActionError('');
    setNotice('');
    try {
      await api<{ id: string }>(`/user/${account.id}`, { method: 'DELETE' });
      setUsers((current) => current.filter((item) => item.id !== account.id));
      setNotice(`Lietotājs “${account.username}” ir dzēsts.`);
      setReload((value) => value + 1);
    } catch (caughtError) {
      setActionError(getErrorMessage(caughtError, 'Neizdevās dzēst lietotāju.'));
    } finally {
      setPendingUserId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#1b1b1b] px-5 py-8 font-sans text-[#e8e5df] sm:px-[7vw] sm:py-12">
      <div className="mx-auto max-w-[1440px]">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <Link
            className="text-sm tracking-[.12em] text-stone-400 no-underline hover:text-white"
            to="/home"
          >
            ← Sākumlapa
          </Link>
          <span className="border border-[#c56531]/50 px-3 py-1.5 text-[11px] tracking-[.16em] text-[#e9a47d] uppercase">
            Administratora panelis
          </span>
        </header>

        <section className="mt-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs tracking-[.2em] text-[#d47440] uppercase">Pārvaldība</p>
            <h1 className="mt-3 text-4xl font-light tracking-[-.04em] sm:text-6xl">
              Admin panelis
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-stone-400">
              Pārskatiet sistēmas statistiku un pārvaldiet lietotāju piekļuvi.
            </p>
          </div>
          <button
            className={`${controlClass} px-4 hover:border-white/30 disabled:cursor-wait disabled:opacity-60`}
            type="button"
            disabled={loading}
            onClick={() => setReload((value) => value + 1)}
          >
            {loading ? 'Ielādē…' : 'Atjaunot datus'}
          </button>
        </section>

        {error && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border border-red-400/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">
            <p role="alert">{error}</p>
            <button
              className="underline underline-offset-4 hover:text-white"
              type="button"
              onClick={() => setReload((value) => value + 1)}
            >
              Mēģināt vēlreiz
            </button>
          </div>
        )}

        <section className="mt-8 grid gap-3 sm:grid-cols-3" aria-label="Sistēmas statistika">
          {[
            { label: 'Lietotāji', value: stats?.users, symbol: '♙' },
            { label: 'Partijas', value: stats?.games, symbol: '♟' },
            { label: 'Analīzes', value: stats?.analyses, symbol: '⌁' },
          ].map((item) => (
            <article
              className={`${panelClass} relative overflow-hidden p-5 sm:p-6`}
              key={item.label}
            >
              <span className="absolute top-3 right-5 text-4xl text-[#d47440]/25" aria-hidden="true">
                {item.symbol}
              </span>
              <p className="text-xs tracking-[.17em] text-stone-400 uppercase">{item.label}</p>
              <p className="mt-6 text-4xl font-light tabular-nums">
                {item.value === undefined ? '—' : item.value.toLocaleString('lv-LV')}
              </p>
            </article>
          ))}
        </section>

        <section className={`${panelClass} mt-8`} aria-labelledby="users-heading">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 p-5 sm:p-6">
            <div>
              <p className="text-xs tracking-[.17em] text-stone-500 uppercase">Konti</p>
              <h2 id="users-heading" className="mt-2 text-2xl font-light">
                Lietotāji
                {!loading && <span className="ml-3 text-sm text-stone-500">{users.length}</span>}
              </h2>
            </div>
            <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-[minmax(220px,1fr)_170px]">
              <label className="sr-only" htmlFor="user-search">
                Meklēt pēc vārda vai e-pasta
              </label>
              <input
                id="user-search"
                className={controlClass}
                type="search"
                placeholder="Meklēt lietotāju…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <label className="sr-only" htmlFor="user-filter">
                Filtrēt pēc statusa
              </label>
              <select
                id="user-filter"
                className={controlClass}
                value={filter}
                onChange={(event) => setFilter(event.target.value as UserFilter)}
              >
                <option value="ALL">Visi statusi</option>
                <option value="ACTIVE">Aktīvie</option>
                <option value="BLOCKED">Bloķētie</option>
              </select>
            </div>
          </div>

          {actionError && (
            <p
              className="border-b border-red-400/20 bg-red-950/20 px-5 py-3 text-sm text-red-200"
              role="alert"
            >
              {actionError}
            </p>
          )}
          {notice && (
            <p
              className="border-b border-emerald-400/20 bg-emerald-950/20 px-5 py-3 text-sm text-emerald-200"
              role="status"
            >
              {notice}
            </p>
          )}

          {loading && users.length === 0 ? (
            <p className="p-6 text-sm text-stone-400" role="status">
              Ielādē lietotājus…
            </p>
          ) : !error && visibleUsers.length === 0 ? (
            <p className="p-6 text-sm text-stone-400">
              {users.length === 0
                ? 'Lietotāju vēl nav.'
                : 'Pēc izvēlētajiem kritērijiem lietotāji nav atrasti.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="bg-white/[.025] text-[11px] tracking-[.13em] text-stone-500 uppercase">
                  <tr>
                    <th className="px-5 py-3 font-medium">Lietotājs</th>
                    <th className="px-5 py-3 font-medium">Loma</th>
                    <th className="px-5 py-3 font-medium">Statuss</th>
                    <th className="px-5 py-3 font-medium">Reģistrēts</th>
                    <th className="px-5 py-3 text-right font-medium">Darbības</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[.07]">
                  {visibleUsers.map((account) => {
                    const isSelf = account.id === currentUser?.id;
                    const pending = pendingUserId === account.id;
                    return (
                      <tr className="transition-colors hover:bg-white/[.025]" key={account.id}>
                        <td className="px-5 py-4">
                          <p className="font-medium text-stone-100">
                            {account.username}
                            {isSelf && <span className="ml-2 text-xs text-stone-500">(jūs)</span>}
                          </p>
                          <p className="mt-1 text-xs text-stone-500">{account.email}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={
                              account.role === 'ADMIN'
                                ? 'border border-[#c56531]/40 px-2 py-1 text-[11px] text-[#e9a47d]'
                                : 'text-xs text-stone-400'
                            }
                          >
                            {account.role === 'ADMIN' ? 'Administrators' : 'Lietotājs'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-2 text-xs ${
                              account.isBlocked ? 'text-red-300' : 'text-emerald-300'
                            }`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${
                                account.isBlocked ? 'bg-red-400' : 'bg-emerald-400'
                              }`}
                            />
                            {account.isBlocked ? 'Bloķēts' : 'Aktīvs'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-stone-400">
                          {new Date(account.createdAt).toLocaleDateString('lv-LV')}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              className="min-h-9 border border-white/12 px-3 text-xs text-stone-300 transition hover:border-[#c56531]/70 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                              type="button"
                              disabled={pendingUserId !== null || isSelf}
                              aria-label={`${account.isBlocked ? 'Atbloķēt' : 'Bloķēt'} ${account.username}`}
                              onClick={() => void toggleBlocked(account)}
                              title={isSelf ? 'Nevar mainīt sava konta statusu' : undefined}
                            >
                              {pending ? 'Apstrādā…' : account.isBlocked ? 'Atbloķēt' : 'Bloķēt'}
                            </button>
                            <button
                              className="min-h-9 border border-red-300/20 px-3 text-xs text-red-300 transition hover:border-red-300/60 hover:bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-40"
                              type="button"
                              disabled={pendingUserId !== null || isSelf}
                              aria-label={`Dzēst ${account.username}`}
                              onClick={() => void deleteUser(account)}
                              title={isSelf ? 'Nevar dzēst savu kontu' : undefined}
                            >
                              Dzēst
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!loading && users.length > 0 && (
            <p className="border-t border-white/[.07] px-5 py-3 text-xs text-stone-500">
              Rādīti {visibleUsers.length} no {users.length} lietotājiem
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
