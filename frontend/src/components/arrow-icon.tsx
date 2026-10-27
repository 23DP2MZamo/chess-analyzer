export default function ArrowIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={'inline-block size-[18px] shrink-0 align-middle ' + className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 18 18 6M6 6h12v12" />
    </svg>
  );
}
