import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
type Sample = {
  id: string;
  title: string;
  whiteUsername: string;
  blackUsername: string;
  opening: string;
  format: string;
};
export default function SampleGames() {
  const [games, setGames] = useState<Sample[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    api<Sample[]>('/analysis/samples')
      .then((value) => {
        if (active) setGames(Array.isArray(value) ? value : []);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <section className="mt-8" aria-label="Sample games">
      <h2 className="text-2xl font-medium">Try a sample game</h2>
      <p className="mt-2 max-w-2xl text-base leading-7 text-[#ccc]">
        These are practice games, not your imported history. Review one instantly while you get your
        accounts ready. Samples do not change your statistics.
      </p>
      {failed ? (
        <p className="mt-4 text-[#ddd]">
          Samples are unavailable right now.{' '}
          <Link to="/analyze" className="text-[#f3b187] underline">
            Try a sample position instead.
          </Link>
        </p>
      ) : !games.length ? (
        <p role="status" className="mt-4 text-[#ccc]">
          Loading sample games…
        </p>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {games.map((game) => (
            <Link
              key={game.id}
              to={'/analyze/games/' + game.id}
              className="group flex cursor-pointer flex-col gap-3 border border-white/20 bg-[#242424] p-6 text-[#f3f0ea] transition hover:-translate-y-1 hover:border-[#e89b70] hover:bg-[#302720] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f3b187]"
            >
              <span className="text-sm font-medium text-[#f3b187]">SAMPLE · {game.format}</span>
              <h3 className="text-xl font-medium">{game.title}</h3>
              <p className="text-base leading-6 text-[#d3cdc4]">{game.opening}</p>
              <span className="mt-auto pt-3 text-base font-medium text-[#f3b187] group-hover:text-white">
                Analyze sample →
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
