'use client';

import { useFavorite, type FavType } from '@/lib/favorites-client';
import { T, type Lang } from '@/lib/i18n';

/** Heart toggle. "icon" sits on cards, "button" next to a page title. */
export default function FavoriteButton({ lang, type, id, variant = 'icon' }: { lang: Lang; type: FavType; id: string; variant?: 'icon' | 'button' }) {
  const t = T(lang);
  const { on, toggle } = useFavorite(type, id);

  async function click(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const r = await toggle();
    if (r === 'login') window.location.href = `/kirish?keyin=${encodeURIComponent(window.location.pathname)}`;
  }

  const label = on ? t('Sevimlilardan olib tashlash') : t('Sevimlilarga saqlash');
  const heart = (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.9 4.5 6.6 4.1c2-.2 3.9.8 5.4 2.6 1.5-1.8 3.4-2.8 5.4-2.6 3.7.4 5.7 4.3 4.2 7.7C19.5 16.4 12 21 12 21z"
        fill={on ? '#D64545' : 'none'} stroke={on ? '#D64545' : 'currentColor'} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );

  if (variant === 'button') {
    return (
      <button type="button" className="btn ghost small fav-btn" aria-pressed={on} onClick={click}>
        {heart}{on ? t('Saqlangan') : t('Saqlash')}
      </button>
    );
  }
  return (
    <button type="button" className="fav-icon" aria-pressed={on} aria-label={label} title={label} onClick={click}>{heart}</button>
  );
}
