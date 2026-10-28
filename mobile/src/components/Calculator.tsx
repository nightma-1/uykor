import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { mln, som, unitPrice } from '@/lib/format';
import { useLang } from '@/lib/i18n';
import { C, R } from '@/lib/theme';
import type { UnitType } from '@/lib/types';
import { Card, F, H2, Seg, Txt } from './ui';

export default function Calculator({ units, priceM2, maxMonths, minFirstPct }: { units: UnitType[]; priceM2: number; maxMonths: number; minFirstPct: number }) {
  const { t } = useLang();
  const [unit, setUnit] = useState(units[Math.min(1, units.length - 1)]?.id ?? '');
  const firsts = useMemo(() => [...new Set([minFirstPct, 30, 50].filter((v) => v >= minFirstPct))].sort((a, b) => a - b), [minFirstPct]);
  const terms = useMemo(() => [12, 24, 36, 48, 60].filter((m) => m <= maxMonths), [maxMonths]);
  const [first, setFirst] = useState(firsts.includes(30) ? 30 : firsts[0]);
  const [term, setTerm] = useState(terms[terms.length - 1] ?? 0);

  if (!units.length) return null;
  const u = units.find((x) => x.id === unit) ?? units[0];
  const total = unitPrice(u, priceM2);
  const firstSum = (total * first) / 100;
  const monthly = term ? (total - firstSum) / term : 0;
  const sum = (n: number) => t("{n} so'm", { n: som(n) });

  return (
    <Card>
      <View style={{ gap: 2 }}>
        <H2>{t("Bo'lib to'lash kalkulyatori")}</H2>
        <Txt size={14} muted>{t("Xonadon, boshlang'ich to'lov va muddatni tanlang.")}</Txt>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {units.map((x) => {
          const on = x.id === u.id;
          return (
            <Pressable
              key={x.id}
              onPress={() => setUnit(x.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={{ flexBasis: '47%', flexGrow: 1, padding: 10, borderRadius: R.md, borderWidth: 1, borderColor: on ? C.lapis : C.lineStrong, backgroundColor: on ? C.lapis : C.card }}
            >
              <Txt weight="bold" color={on ? '#fff' : C.ink}>{t('{n} xonali', { n: x.rooms })}</Txt>
              <Txt size={12} color={on ? '#E8EDF8' : C.muted}>{x.area} m² · {mln(unitPrice(x, priceM2))} {t('mln')}</Txt>
            </Pressable>
          );
        })}
      </View>
      {terms.length > 0 ? (
        <>
          <Txt size={13} weight="medium" muted>{t("Boshlang'ich to'lov")}</Txt>
          <Seg options={firsts.map((f) => ({ value: f, label: `${f}%` }))} value={first} onChange={setFirst} />
          <Txt size={13} weight="medium" muted>{t('Muddat')}</Txt>
          <Seg options={terms.map((m) => ({ value: m, label: t('{n} oy', { n: m }) }))} value={term} onChange={setTerm} />
          <View style={{ backgroundColor: C.bg, borderRadius: R.lg, padding: 14, gap: 8 }}>
            <Row label={t('Umumiy narx')} value={sum(total)} />
            <Row label={t("Boshlang'ich to'lov")} value={sum(firstSum)} />
            <Row label={t("Oylik to'lov")} value={sum(monthly)} big />
          </View>
          <Txt size={12} muted>{t('Quruvchi rassrochkasi foizsiz deb hisoblangan. Aniq shartlarni quruvchi bilan tasdiqlang.')}</Txt>
        </>
      ) : (
        <Row label={t('Narxi')} value={sum(total)} big />
      )}
    </Card>
  );
}

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
      <Txt size={14} muted>{label}</Txt>
      <Txt size={big ? 20 : 15} color={big ? C.lapis : C.ink} style={{ fontFamily: F.bold, flexShrink: 1, textAlign: 'right' }}>{value}</Txt>
    </View>
  );
}
