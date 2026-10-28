// Shared pieces for link-preview images (Telegram, Facebook, etc.).
export const OG_SIZE = { width: 1200, height: 630 };

export function OgMark({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <rect width="64" height="64" rx="15" fill="#2346A0" />
      <path d="M17 58V31C17 21 23.5 13.5 32 9C40.5 13.5 47 21 47 31V58Z" fill="#FFFFFF" />
      <path d="M25.5 58V46C25.5 42 28.3 39.2 32 37.5C35.7 39.2 38.5 42 38.5 46V58Z" fill="#19A097" />
      <rect x="29" y="23" width="6" height="6" fill="#2346A0" />
      <rect x="29" y="23" width="6" height="6" fill="#2346A0" transform="rotate(45 32 26)" />
    </svg>
  );
}
