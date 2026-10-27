import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
export type LinkedAccount = {
  id: string;
  platform: 'CHESSCOM' | 'LICHESS';
  platformUsername: string;
  connectedAt: string;
};
const control =
  'min-h-12 rounded-sm border border-white/20 bg-[#1b1b1b] px-4 text-base text-[#f3eee7] focus:outline-2 focus:outline-[#eaa879] disabled:opacity-50';
export default function LinkedAccountsPanel({
  accounts,
  onChanged,
}: {
  accounts: LinkedAccount[];
  onChanged: (message: string) => void;
}) {
  const [platform, setPlatform] = useState<'CHESSCOM' | 'LICHESS'>('CHESSCOM');
  const [username, setUsername] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');
  const selectedConnected = accounts.some((account) => account.platform === platform);
  async function connect(event: FormEvent) {
    event.preventDefault();
    if (pending || !username.trim() || selectedConnected) return;
    setPending('connect');
    setError('');
    try {
      await api('/accounts/' + (platform === 'CHESSCOM' ? 'chesscom' : 'lichess'), {
        method: 'POST',
        body: JSON.stringify({ username: username.trim() }),
      });
      onChanged(
        `${platform === 'CHESSCOM' ? 'Chess.com' : 'Lichess'} account connected. Import games to populate your profile.`,
      );
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Could not connect your account. Try again.',
      );
    } finally {
      setPending(null);
    }
  }
  async function importGames(account: LinkedAccount) {
    if (pending) return;
    setPending(account.id);
    setError('');
    try {
      const result = await api<{ imported: number; skipped: number }>(
        '/games/' + (account.platform === 'CHESSCOM' ? 'chesscom' : 'lichess') + '/import',
        { method: 'POST' },
      );
      onChanged(`${result.imported} games imported; ${result.skipped} already in your library.`);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Import failed. Previously saved games are safe; try again.',
      );
    } finally {
      setPending(null);
    }
  }
  return (
    <section
      id="connections"
      tabIndex={-1}
      aria-labelledby="connections-title"
      className="scroll-mt-24 rounded-md border border-white/15 bg-[#22211f] p-5 focus:outline-none sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-[.18em] text-[#df9d73]">YOUR CHESS ACCOUNTS</p>
          <h2 id="connections-title" className="mt-2 text-2xl font-light">
            Connected accounts
          </h2>
        </div>
        <Link to="/games" className="min-h-11 py-2 text-sm text-[#efb38e] hover:text-white">
          Open game library →
        </Link>
      </div>
      <p className="mt-3 max-w-2xl text-base leading-7 text-[#c9c1b7]">
        Connect your public username to import finished games. Your Chess.com or Lichess password is
        never needed.
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          {accounts.length ? (
            accounts.map((account) => (
              <article
                key={account.id}
                className="rounded-sm border border-white/15 bg-[#1d1c1a] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-[#e4ac86]">
                      {account.platform === 'CHESSCOM' ? 'Chess.com' : 'Lichess'} · Connected
                    </p>
                    <p className="mt-1 break-all text-lg">{account.platformUsername}</p>
                  </div>
                  <button
                    type="button"
                    disabled={!!pending}
                    onClick={() => void importGames(account)}
                    className={control + ' cursor-pointer text-sm hover:border-[#eaa879]'}
                  >
                    {pending === account.id ? 'Importing…' : 'Import games'}
                  </button>
                </div>
              </article>
            ))
          ) : (
            <p className="rounded-sm border border-dashed border-white/20 p-5 text-base leading-7 text-[#c9c1b7]">
              No accounts connected yet. Choose a platform and enter your username to get started.
            </p>
          )}
        </div>
        <form onSubmit={connect} className="grid content-start gap-4">
          <div className="flex gap-2" aria-label="Choose account platform">
            {(['CHESSCOM', 'LICHESS'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={platform === value}
                disabled={!!pending}
                onClick={() => {
                  setPlatform(value);
                  setError('');
                }}
                className={
                  'min-h-12 flex-1 cursor-pointer border px-4 text-base ' +
                  (platform === value
                    ? 'border-[#dda070] bg-[#392b20] text-[#f3c3a3]'
                    : 'border-white/20 text-[#c9c1b7]')
                }
              >
                {value === 'CHESSCOM' ? 'Chess.com' : 'Lichess'}
              </button>
            ))}
          </div>
          {selectedConnected ? (
            <p className="py-3 text-base leading-7 text-[#d5c7b9]">
              This platform is connected. Use Import games to update your history, or choose the
              other platform.
            </p>
          ) : (
            <>
              <label className="grid gap-2 text-sm text-[#d1c8bd]">
                Platform username
                <input
                  aria-describedby="username-tip"
                  className={control}
                  value={username}
                  maxLength={50}
                  onChange={(event) => setUsername(event.target.value)}
                  disabled={!!pending}
                  required
                  placeholder="Your chess username"
                />
              </label>
              <p id="username-tip" className="text-sm leading-6 text-[#bdb3a6]">
                Use the name at the end of your profile URL: chess.com/member/
                <strong>yourname</strong> or lichess.org/@/<strong>yourname</strong>. Enter just the
                username.
              </p>
              <button
                className="min-h-12 cursor-pointer border border-[#d58a57] bg-[#a94e22] px-5 text-base text-white transition hover:bg-[#bc5c2b] disabled:opacity-50"
                disabled={!!pending || !username.trim()}
              >
                {pending === 'connect' ? 'Checking account…' : 'Connect account'}
              </button>
            </>
          )}
        </form>
      </div>
      {error && (
        <p role="alert" className="mt-5 border border-red-400/30 p-4 text-base text-red-200">
          {error}
        </p>
      )}
    </section>
  );
}
