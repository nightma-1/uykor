export function Mark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="15" fill="#2346A0" />
      <path d="M17 58V31C17 21 23.5 13.5 32 9C40.5 13.5 47 21 47 31V58Z" fill="#FFFFFF" />
      <path d="M25.5 58V46C25.5 42 28.3 39.2 32 37.5C35.7 39.2 38.5 42 38.5 46V58Z" fill="#19A097" />
      <rect x="29" y="23" width="6" height="6" fill="#2346A0" />
      <rect x="29" y="23" width="6" height="6" fill="#2346A0" transform="rotate(45 32 26)" />
    </svg>
  );
}

export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <span className="wordmark" style={{ fontSize: size }} aria-hidden="true">
      Uyk
      <svg viewBox="0 0 30 38">
        <path
          fill="#2346A0"
          fillRule="evenodd"
          d="M15 0A14.5 14.5 0 0 1 29.5 14.5C29.5 23 21.5 30 15 38C8.5 30 .5 23 .5 14.5A14.5 14.5 0 0 1 15 0ZM15 8A6.5 6.5 0 1 0 15 21A6.5 6.5 0 1 0 15 8Z"
        />
      </svg>
      r
    </span>
  );
}
