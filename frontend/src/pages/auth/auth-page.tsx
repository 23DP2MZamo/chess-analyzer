import type { FormEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';

type AuthPageProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
  submitLabel: string;
  pending: boolean;
  error: string;
  footerText: string;
  footerLink: string;
  footerLabel: string;
};

export const authLabelClass = 'grid gap-2 text-sm font-normal text-stone-300';
export const authInputClass =
  'min-h-12 w-full rounded-md border border-white/10 bg-black/15 px-4 text-[15px] text-stone-100 outline-none transition placeholder:text-stone-600 focus:border-[#bd5d2a] focus:ring-1 focus:ring-[#bd5d2a]/60';

export default function AuthPage({
  eyebrow,
  title,
  subtitle,
  onSubmit,
  children,
  submitLabel,
  pending,
  error,
  footerText,
  footerLink,
  footerLabel,
}: AuthPageProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#202020] font-sans text-stone-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_35%_at_83%_3%,#75432180,transparent_65%)]" />
      <div className="relative mx-auto min-h-screen max-w-[1440px] border-x border-white/6">
        <header className="flex h-12 items-center justify-between px-4 text-[10px] text-stone-400 sm:px-7">
          <Link
            className="inline-flex items-center gap-2 text-stone-300 no-underline transition hover:text-white"
            to="/login"
            aria-label="Chess Analyzer sākumlapa"
          >
            <span className="text-base leading-none text-[#e47536]">♞</span>
            <span className="hidden sm:inline">Home</span>
          </Link>
          <nav className="hidden items-center gap-6 sm:flex" aria-label="Galvenā navigācija">
            <span>Lorem</span>
            <span>Lorem</span>
            <span>Lorem</span>
            <span>Lorem</span>
          </nav>
          <button
            className="grid size-7 place-items-center text-lg leading-none text-stone-300 sm:hidden"
            type="button"
            aria-label="Atvērt navigāciju"
          >
            <span>☰</span>
          </button>
        </header>

        <section className="relative mx-auto grid min-h-[calc(100vh-48px)] w-full max-w-[1080px] items-center gap-12 px-6 py-12 sm:px-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-24 lg:px-0">
          <div className="max-w-sm border-l border-[#bd5d2a]/70 pl-6">
            <p className="mb-5 text-[10px] tracking-[.2em] text-[#d47440] uppercase">{eyebrow}</p>
            <h1 className="max-w-md text-4xl leading-[1.04] font-extralight tracking-[-.05em] text-stone-100 uppercase sm:text-6xl">
              {title}
            </h1>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-stone-400">{subtitle}</p>
            <div className="mt-10 hidden h-px w-full max-w-sm bg-linear-to-r from-[#bd5d2a] via-white/10 to-transparent lg:block" />
            <p className="mt-5 hidden max-w-sm text-xs leading-relaxed text-stone-500 lg:block">
              Analizējiet savas partijas, atrodiet svarīgākos momentus un attīstiet savu spēli.
            </p>
          </div>

          <div className="relative border border-white/10 bg-[#1c1c1c]/90 p-5 shadow-2xl shadow-black/20 sm:p-7">
            <span className="absolute -top-px -left-px h-10 w-10 border-t border-l border-[#c56531]" />
            <span className="absolute -right-px -bottom-px h-10 w-10 border-r border-b border-[#c56531]" />
            <div className="mb-7 flex items-center justify-between border-b border-white/10 pb-4">
              <span className="text-xs tracking-[.16em] text-stone-400 uppercase">
                Chess Analyzer
              </span>
              <span className="size-1.5 rounded-full bg-[#dc6930] shadow-[0_0_10px_#dc6930]" />
            </div>
            <form className="grid gap-5" onSubmit={onSubmit}>
              {children}
              {error && (
                <p
                  className="border border-red-400/30 bg-red-950/30 px-3 py-2.5 text-[13px] text-red-200"
                  role="alert"
                >
                  {error}
                </p>
              )}
              <button
                className="mt-1 min-h-12 border border-[#c56531] bg-[#a94e22] px-5 text-sm font-medium text-white transition hover:bg-[#c25d2a] disabled:cursor-wait disabled:opacity-70"
                type="submit"
                disabled={pending}
              >
                {pending ? 'Lūdzu, uzgaidiet…' : submitLabel}
                <span className="ml-3 text-lg font-light" aria-hidden="true">
                  →
                </span>
              </button>
            </form>
            <p className="mt-6 border-t border-white/10 pt-5 text-sm text-stone-500">
              {footerText}{' '}
              <Link
                className="text-stone-200 no-underline hover:text-[#e47536] hover:underline"
                to={footerLink}
              >
                {footerLabel}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
