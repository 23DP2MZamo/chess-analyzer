export type RatingSeries = {
  platform: string;
  username: string;
  currentRating: number | null;
  points: { gameId: string; date: string; rating: number }[];
};
const colors = ['#ef914d', '#d1c5b5'];
export default function RatingChart({ series }: { series: RatingSeries[] }) {
  const rated = series.filter((item) => item.points.length);
  const values = rated.flatMap((item) => item.points.map((point) => point.rating));
  if (!values.length)
    return (
      <div className="mt-5 flex min-h-48 items-center justify-center rounded-sm border border-dashed border-white/20 px-6 text-center">
        <p className="max-w-lg text-base leading-7 text-[#c4bbaf]">
          No rated games for this format yet. Import games or choose another rating format to see
          your progress.
        </p>
      </div>
    );
  const min = Math.floor((Math.min(...values) - 30) / 50) * 50;
  const max = Math.ceil((Math.max(...values) + 30) / 50) * 50;
  const y = (rating: number) => 158 - ((rating - min) / (max - min || 1)) * 136;
  return (
    <figure className="mt-5">
      <svg
        viewBox="0 0 640 190"
        className="w-full rounded-sm border border-white/10 bg-[#1b1b1a]"
        role="img"
        aria-label="Rating history from your imported rated games"
      >
        {[min, (min + max) / 2, max].map((rating) => (
          <g key={rating}>
            <line
              x1="46"
              x2="624"
              y1={y(rating)}
              y2={y(rating)}
              stroke="#ffffff"
              strokeOpacity=".08"
            />
            <text x="8" y={y(rating) + 4} fill="#c4b9aa" fontSize="11">
              {Math.round(rating)}
            </text>
          </g>
        ))}
        {rated.map((item, index) => {
          const x = (i: number) =>
            item.points.length === 1 ? 333 : 54 + (i / (item.points.length - 1)) * 558;
          return (
            <g key={item.platform}>
              <polyline
                points={item.points.map((point, i) => `${x(i)},${y(point.rating)}`).join(' ')}
                stroke={colors[index % colors.length]}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                fill="none"
              />
              {item.points.map((point, i) => (
                <circle
                  key={point.gameId}
                  cx={x(i)}
                  cy={y(point.rating)}
                  r={item.points.length === 1 ? 4 : 2}
                  fill={colors[index % colors.length]}
                >
                  <title>
                    {item.username}: {point.rating} · {new Date(point.date).toLocaleDateString()}
                  </title>
                </circle>
              ))}
            </g>
          );
        })}
        <text x="48" y="181" fill="#b5aa9a" fontSize="10">
          Earlier games
        </text>
        <text x="620" y="181" textAnchor="end" fill="#b5aa9a" fontSize="10">
          Latest games
        </text>
      </svg>
      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#bfb5a7]">
        {rated.map((item, index) => (
          <span key={item.platform} className="flex items-center gap-2">
            <span
              className="size-2 rounded-full"
              style={{ background: colors[index % colors.length] }}
            />
            {item.platform === 'CHESSCOM' ? 'Chess.com' : 'Lichess'} · {item.username}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
