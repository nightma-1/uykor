'use client';

import Link from 'next/link';
import { lp, T, type Lang } from '@/lib/i18n';
import type { Apartment, Block, FloorPlan } from '@/lib/shaxmatka';
import FloorPlanSvg from './FloorPlanSvg';
import ApartmentCard, { type CardComplex } from './ApartmentCard';
import '@/app/shaxmatka.css';

type Props = { lang: Lang; complex: CardComplex; block: Block; plan: FloorPlan; apartment: Apartment; floorApartments: Apartment[]; showBlock: boolean };

/** Alohida xonadon sahifasi: planirovka (xonalar bilan), qavatdagi joyi va karta. */
export default function ApartmentView({ lang, complex, block, plan, apartment, floorApartments, showBlock }: Props) {
  const t = T(lang);
  const q = `?${showBlock ? `blok=${encodeURIComponent(block.name)}&` : ''}qavat=${apartment.floor}&xonadon=${encodeURIComponent(apartment.number)}`;
  return (
    <div className="two-col">
      <div className="main">
        <section className="card section">
          <h2 className="h2">{t('Planirovka')}</h2>
          <FloorPlanSvg t={t} block={block} plan={plan} apartments={floorApartments} focusKey={apartment.unit_key} />
        </section>
        <section className="card section">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <h2 className="h2">{t('Qavatdagi joyi')}</h2>
            <Link href={`${lp(lang, `/jk/${complex.slug}`)}${q}#xonadonlar`} style={{ fontWeight: 600, textDecoration: 'none' }}>{t("3D binoda ko'rish →")}</Link>
          </div>
          <FloorPlanSvg t={t} block={block} plan={plan} apartments={floorApartments} selected={apartment.id} compact />
        </section>
      </div>
      <aside>
        <ApartmentCard lang={lang} complex={complex} block={block} plan={plan} apartment={apartment} showBlock={showBlock} standalone />
      </aside>
    </div>
  );
}
