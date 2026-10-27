type Props = { type: string; color: string };
// Original inline vector pieces: consistent across platforms, without emoji fonts.
export default function ChessPiece({ type, color }: Props) {
  const paths: Record<string, React.ReactNode> = {
    p: (
      <>
        <circle cx="24" cy="13" r="7" />
        <path d="M20 20h8l-1 9 6 9H15l6-9z" />
      </>
    ),
    r: (
      <>
        <path d="M12 8h6v6h4V8h4v6h4V8h6v14l-5 4 1 12H16l1-12-5-4z" />
        <path d="M17 23h14" fill="none" />
      </>
    ),
    n: (
      <>
        <path d="m14 38 1-10 11-9-6-2-5 6-6-5 8-11 5 3 8-5 1 9c9 7 9 17 5 24z" />
        <path d="m20 12 3 1M17 29l13-7" fill="none" />
      </>
    ),
    b: (
      <>
        <path d="M24 5c-3 5-11 9-11 16 0 5 5 9 9 10l-7 7h18l-7-7c4-1 9-5 9-10 0-7-8-11-11-16z" />
        <path d="m27 13-7 10" fill="none" />
      </>
    ),
    q: (
      <>
        <path d="m12 17 6 7 6-13 6 13 6-7-5 21H17z" />
        <circle cx="10" cy="13" r="3" />
        <circle cx="24" cy="7" r="3" />
        <circle cx="38" cy="13" r="3" />
        <path d="M17 32h14" fill="none" />
      </>
    ),
    k: (
      <>
        <path d="M24 3v12M19 8h10" fill="none" />
        <path d="M24 17c-7-8-18-1-12 10l6 10h12l6-10c6-11-5-18-12-10z" />
        <path d="M18 30h12" fill="none" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 48 48"
      className="h-[88%] w-[88%]"
      fill={color === 'w' ? '#f2f0e9' : '#555555'}
      stroke={color === 'w' ? '#343539' : '#17191d'}
      strokeWidth="2"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <g>
        {paths[type]}
        <path d="M14 38h20l3 6H11z" />
      </g>
    </svg>
  );
}
