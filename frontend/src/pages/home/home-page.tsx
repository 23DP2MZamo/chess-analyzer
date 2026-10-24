import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useCurrentUser } from '../../lib/use-current-user';

const features = [
  {
    number: '01',
    label: 'ANALYSIS',
    title: (
      <>
        Analyze
        <br />
        your game
      </>
    ),
    description: 'Upload a PGN or enter a position and let the engine analyze every move.',
    href: '/analyze',
    linkLabel: 'Start analysis',
    featured: true,
  },
  {
    number: '02',
    label: 'GAMES',
    title: (
      <>
        Your
        <br />
        games
      </>
    ),
    description: 'Browse your previous games and review your performance.',
    href: '/games',
    linkLabel: 'Open games',
  },
  {
    number: '03',
    label: 'IMPROVEMENT',
    title: (
      <>
        Improve
        <br />
        your chess
      </>
    ),
    description: 'Understand your mistakes and discover where you can improve.',
    href: '/stats',
    linkLabel: 'View statistics',
  },
];

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  const { user } = useCurrentUser();
  const accountPath = user ? '/profile' : '/login';
  const accountLabel = user ? 'Profile' : 'Log in';

  return (
    <main className="min-h-screen overflow-hidden bg-[#1b1b1b] bg-[radial-gradient(circle_at_70%_20%,rgba(122,79,48,0.18),transparent_32%)] font-sans text-[#e8e5df]">
      <header className="relative z-20 flex h-[58px] items-center justify-between border-b border-white/8 px-[18px] sm:h-16 sm:px-7">
        <Link
          to="/home"
          className="flex items-center gap-2.5 text-[9px] font-medium tracking-[.18em] text-[#e8e5df] no-underline sm:text-[11px]"
          onClick={closeMenu}
        >
          <span className="text-[17px] opacity-80">♞</span>
          <span>CHESS ANALYZER</span>
        </Link>

        <nav
          className="ml-auto hidden items-center gap-[34px] sm:flex"
          aria-label="Main navigation"
        >
          {['Home', 'Analyze', 'Games'].map((item) => (
            <NavLink
              key={item}
              to={`/${item.toLowerCase()}`}
              end={item === 'Home'}
              className={({ isActive }) =>
                `relative text-[11px] tracking-[.12em] no-underline transition-colors duration-200 hover:text-[#e8e5df] ${
                  isActive
                    ? "text-[#e8e5df] after:absolute after:right-0 after:-bottom-[23px] after:left-0 after:h-px after:bg-[#e8e5df] after:content-['']"
                    : 'text-[#777]'
                }`
              }
            >
              {item}
            </NavLink>
          ))}
          <Link
            to={accountPath}
            className="inline-flex min-h-9 items-center border border-[#c56531]/70 px-4 text-[11px] tracking-[.12em] text-[#e8e5df] transition-colors hover:bg-[#a94e22] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d47440]"
          >
            {accountLabel}
          </Link>
        </nav>

        <div className="ml-auto mr-4 sm:hidden">
          <Link
            to={accountPath}
            className="inline-flex min-h-9 items-center border border-[#c56531]/70 px-3 text-[10px] tracking-[.1em] text-[#e8e5df] hover:bg-[#a94e22]"
            onClick={closeMenu}
          >
            {accountLabel}
          </Link>
        </div>

        <button
          className="flex size-[30px] cursor-pointer flex-col justify-center gap-[5px] border-0 bg-transparent sm:hidden"
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span
            className={`block h-px w-[18px] bg-[#aaa] transition-transform duration-200 ${
              menuOpen ? 'translate-y-[6px] rotate-45' : ''
            }`}
          />
          <span
            className={`block h-px w-[18px] bg-[#aaa] transition-opacity duration-200 ${
              menuOpen ? 'opacity-0' : ''
            }`}
          />
          <span
            className={`block h-px w-[18px] bg-[#aaa] transition-transform duration-200 ${
              menuOpen ? '-translate-y-[6px] -rotate-45' : ''
            }`}
          />
        </button>

        <nav
          id="mobile-navigation"
          className={`absolute top-[58px] right-0 left-0 grid gap-px border-b border-white/8 bg-[#1b1b1b]/98 p-[18px] transition duration-200 sm:hidden ${
            menuOpen
              ? 'visible translate-y-0 opacity-100'
              : 'pointer-events-none invisible -translate-y-2 opacity-0'
          }`}
          aria-label="Mobile navigation"
        >
          {['Home', 'Analyze', 'Games'].map((item) => (
            <NavLink
              key={item}
              to={`/${item.toLowerCase()}`}
              end={item === 'Home'}
              onClick={closeMenu}
              className={({ isActive }) =>
                `border-b border-white/6 px-3 py-[15px] text-[10px] tracking-[.16em] no-underline uppercase transition-colors last:border-b-0 hover:text-[#e8e5df] ${
                  isActive ? 'text-[#e8e5df]' : 'text-[#888]'
                }`
              }
            >
              {item}
            </NavLink>
          ))}
        </nav>
      </header>

      <section className="relative flex min-h-[620px] items-start overflow-hidden border-b border-white/7 px-7 py-[75px] sm:min-h-[570px] sm:items-center sm:px-[7vw] sm:py-[100px] lg:min-h-[620px] lg:px-[8vw]">
        <div className="relative z-10 max-w-[650px]">
          <p className="mb-6 text-[8px] tracking-[.25em] text-[#777] sm:mb-[30px] sm:text-[10px]">
            CHESS ANALYSIS PLATFORM
          </p>

          <h1 className="m-0 text-[clamp(55px,17vw,90px)] leading-[.84] font-light tracking-[-.055em] sm:text-[clamp(64px,9vw,130px)]">
            CHESS
            <br />
            <span className="text-transparent [-webkit-text-stroke:1px_#aaa]">ANALYZER</span>
          </h1>

          <p className="mt-[35px] mb-8 text-xs leading-[1.7] tracking-[.02em] text-[#858585] sm:mt-[42px] sm:text-sm">
            Analyze your games. Find your mistakes.
            <br />
            Improve your chess.
          </p>

          <div className="flex w-full max-w-[300px] flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:items-center">
            <Link
              to="/analyze"
              className="flex h-[46px] w-full items-center justify-center gap-5 bg-[#e5e1d9] px-5 text-[11px] tracking-[.1em] text-[#171717] no-underline transition-colors duration-200 hover:bg-white sm:w-auto"
            >
              Analyze a game
              <span className="text-base">→</span>
            </Link>
            <Link
              to="/games"
              className="flex h-[46px] w-full items-center justify-center border border-white/12 px-5 text-[11px] tracking-[.1em] text-[#aaa] no-underline transition-colors duration-200 hover:border-white/30 hover:text-white sm:w-auto"
            >
              View games
            </Link>
          </div>
        </div>

        <div className="absolute -right-[90px] -bottom-20 w-[370px] opacity-10 blur-[.2px] sm:top-1/2 sm:-right-[8vw] sm:bottom-auto sm:w-[55vw] sm:-translate-y-1/2 sm:opacity-[.14] lg:right-[7vw] lg:w-[min(38vw,470px)] lg:opacity-25">
          <div className="grid aspect-square w-full grid-cols-8 border border-white/10">
            {Array.from({ length: 64 }).map((_, index) => (
              <div
                key={index}
                className={`aspect-square ${
                  (Math.floor(index / 8) + index) % 2 === 0
                    ? 'bg-[rgba(210,205,195,.08)]'
                    : 'bg-[rgba(40,35,30,.5)]'
                }`}
              />
            ))}
          </div>
          <div className="absolute bottom-[12%] left-[12%] text-[clamp(35px,5vw,65px)] text-[#ddd] [text-shadow:0_0_30px_rgba(255,255,255,.2)]">
            ♟
          </div>
          <div className="absolute top-[12%] left-[38%] text-[clamp(35px,5vw,65px)] text-[#ddd] [text-shadow:0_0_30px_rgba(255,255,255,.2)]">
            ♘
          </div>
          <div className="absolute right-[14%] bottom-[10%] text-[clamp(35px,5vw,65px)] text-[#ddd] [text-shadow:0_0_30px_rgba(255,255,255,.2)]">
            ♔
          </div>
          <div className="absolute top-[35%] right-[30%] text-[clamp(35px,5vw,65px)] text-[#ddd] [text-shadow:0_0_30px_rgba(255,255,255,.2)]">
            ♜
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 px-[18px] py-[45px] sm:grid-cols-2 sm:px-[7vw] sm:py-[70px] min-[901px]:grid-cols-[2fr_1fr_1fr]">
        {features.map((feature) => (
          <article
            key={feature.number}
            className={`relative min-h-[320px] border border-white/7 bg-white/[.025] p-[26px] transition duration-200 hover:-translate-y-[3px] hover:border-white/14 hover:bg-white/[.04] sm:min-h-[350px] ${
              feature.featured ? 'sm:col-span-2 sm:min-h-[430px] min-[901px]:col-span-1' : ''
            }`}
          >
            <span className="text-[10px] tracking-[.15em] text-[#555]">{feature.number}</span>
            <div className="absolute right-[26px] bottom-[26px] left-[26px]">
              <p className="mb-[15px] text-[9px] tracking-[.22em] text-[#777]">{feature.label}</p>
              <h2 className="mb-5 text-[38px] leading-[.95] font-light tracking-[-.04em] text-[#ddd] sm:text-[clamp(28px,3vw,48px)]">
                {feature.title}
              </h2>
              <p className="mb-[25px] max-w-[300px] text-xs leading-[1.6] text-[#777]">
                {feature.description}
              </p>
              <Link
                to={feature.href}
                className="text-[10px] tracking-[.1em] text-[#aaa] no-underline transition-colors duration-200 hover:text-white"
              >
                {feature.linkLabel} <span className="ml-2 text-[13px]">↗</span>
              </Link>
            </div>
          </article>
        ))}
      </section>

      <footer className="flex min-h-20 flex-col items-start justify-center gap-2.5 border-t border-white/6 px-[18px] py-[25px] text-[9px] tracking-[.18em] text-[#555] sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:px-[7vw] sm:py-0">
        <span>CHESS ANALYZER</span>
        <span>BUILT FOR CHESS PLAYERS</span>
        <span>2026</span>
      </footer>
    </main>
  );
}
