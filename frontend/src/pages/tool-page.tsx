import { Link, useLocation } from 'react-router-dom';

const pageDetails = {
  '/analyze': {
    eyebrow: 'ANALYSIS',
    title: 'Analyze a game',
    description: 'Upload a PGN or enter a position to review every move.',
  },
  '/games': {
    eyebrow: 'GAMES',
    title: 'Your games',
    description: 'Your imported games and analysis history will appear here.',
  },
  '/stats': {
    eyebrow: 'IMPROVEMENT',
    title: 'Your progress',
    description: 'Performance trends and improvement insights will appear here.',
  },
} as const;

export default function ToolPage() {
  const { pathname } = useLocation();
  const details = pageDetails[pathname as keyof typeof pageDetails] ?? pageDetails['/analyze'];

  return (
    <main className="min-h-screen bg-[#1b1b1b] px-6 py-16 font-sans text-[#e8e5df] sm:px-[8vw] sm:py-24">
      <div className="max-w-2xl border-l border-[#bd5d2a]/70 pl-6">
        <p className="mb-5 text-[10px] tracking-[.2em] text-[#d47440]">{details.eyebrow}</p>
        <h1 className="text-5xl font-light tracking-[-.04em] sm:text-7xl">{details.title}</h1>
        <p className="mt-6 max-w-md text-sm leading-relaxed text-[#858585]">{details.description}</p>
        <Link className="mt-10 inline-block border border-white/20 px-5 py-3 text-xs tracking-[.1em] text-[#e8e5df] no-underline hover:border-white/50" to="/home">
          Back to home
        </Link>
      </div>
    </main>
  );
}