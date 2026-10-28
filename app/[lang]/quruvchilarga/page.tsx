import Link from 'next/link';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import '@/app/quruvchilarga.css';
import { alternates, langFrom, lp, T } from '@/lib/i18n';

type P = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const lang = await langFrom(params);
  const t = T(lang);
  return {
    title: t('Quruvchilar uchun'),
    description: t("Majmualaringizni Uykor'ga bepul joylang: xaridorlar arizasi to'g'ridan-to'g'ri sizga va Telegram'ingizga keladi. Maklersiz."),
    alternates: alternates(lang, '/quruvchilarga'),
  };
}

const BENEFITS = [
  ['Bepul sahifa', "Kompaniya va har bir majmua uchun o'zbek va rus tilidagi sahifa, xaritada narx bilan."],
  ["To'g'ridan-to'g'ri arizalar", "Xaridor \"Ko'rishga yozilish\" yoki \"Qo'ng'iroq so'rash\"ni bossa, ariza darhol kabinetingizga va Telegram'ga keladi."],
  ["O'zingiz boshqarasiz", "Narxlar, bo'sh xonadonlar, qurilish foizi va rasmlarni kabinetda o'zingiz yangilaysiz, o'zgarish darhol saytga chiqadi."],
  ['Faktlarga asoslangan reyting', "Uylarni vaqtida topshirgan quruvchi buni raqamlar bilan ko'rsatadi. Reytingni pulga sotib bo'lmaydi."],
];

const STEPS = [
  ['Telegram orqali kiring', "Saytda \"Telegram orqali kirish\"ni bosing va @UykorBot'da tasdiqlang."],
  ['Ariza yuboring', "Kabinetda \"Quruvchi kompaniya\"ni tanlang va kompaniya nomi, lavozimingiz, telefonni yozing."],
  ['Majmualarni qo\'shing', "Uykor kompaniyani odatda bir ish kuni ichida tekshiradi. Shundan keyin majmualaringizni kiritasiz."],
];

const RATING = [
  ["O'z vaqtida topshirish", 40],
  ['Xaridorlar bahosi', 30],
  ['Kadastr tezligi', 20],
  ['Hujjatlar ochiqligi', 10],
] as const;

export default async function ForDevelopers({ params }: P) {
  const lang = await langFrom(params);
  const t = T(lang);
  return (
    <>
      <Header lang={lang} />
      <main className="wrap" style={{ paddingTop: 36, paddingBottom: 56, display: 'flex', flexDirection: 'column', gap: 36, maxWidth: 1080 }}>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start' }}>
          <span className="eyebrow">{t('Quruvchilar uchun')}</span>
          <h1 className="display" style={{ margin: 0, fontSize: 'clamp(28px, 4.5vw, 40px)', maxWidth: 760 }}>{t("Xaridorlar sizni maklersiz topsin")}</h1>
          <p className="muted" style={{ margin: 0, fontSize: 17, maxWidth: 680 }}>
            {t("Uykor — Samarqanddagi yangi uylar xaritasi. Majmualaringizni bepul joylang: narx, bo'lib to'lash va topshirish sanasini xaridor shu yerda solishtiradi va to'g'ridan-to'g'ri sizga yozadi.")}
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/kabinet/quruvchi" className="btn">{t('Kompaniyani ulash')}</Link>
            <Link href={lp(lang, '/quruvchilar')} className="btn ghost">{t('Quruvchilar reytingi')}</Link>
          </div>
        </section>

        <section className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
          {BENEFITS.map(([h, d]) => (
            <div key={h} className="card section" style={{ gap: 8 }}>
              <strong style={{ fontSize: 17 }}>{t(h)}</strong>
              <span className="muted" style={{ fontSize: 14 }}>{t(d)}</span>
            </div>
          ))}
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 className="h2">{t('Qanday ulanish mumkin')}</h2>
          <ol className="steps">
            {STEPS.map(([h, d]) => (
              <li key={h} className="card">
                <strong>{t(h)}</strong>
                <span className="muted" style={{ fontSize: 14 }}>{t(d)}</span>
              </li>
            ))}
          </ol>
          <span className="muted" style={{ fontSize: 14 }}>{t("Sotuv bo'limidagi har bir xodim o'z Telegram'i bilan alohida ulanishi mumkin, shunda arizalar har biriga keladi.")}</span>
        </section>

        <section className="card section">
          <h2 className="h2">{t('Reyting qanday hisoblanadi')}</h2>
          <span className="muted" style={{ fontSize: 14 }}>{t("Faktlarni Uykor hujjatlar asosida kiritadi. Reytingni ko'tarish uchun topshirilgan uylar ro'yxati, kadastr sanalari va ruxsatnomalarni yuboring.")}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {RATING.map(([h, w]) => (
              <div key={h} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ flex: '0 0 190px', fontSize: 14 }}>{t(h)}</span>
                <div className="bar thick blue"><span style={{ width: `${w * 2.5}%` }} /></div>
                <strong className="num" style={{ flex: '0 0 44px', textAlign: 'right' }}>{w}%</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="card section" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', borderColor: 'var(--lapis)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: '1 1 320px' }}>
            <strong style={{ fontSize: 18 }}>{t("Ulanish bepul va 5 daqiqa oladi")}</strong>
            <span className="muted" style={{ fontSize: 14 }}>{t("Majmua qo'shish uchun manzil, 1 m² narxi, bo'lib to'lash shartlari, xonadon turlari va rasmlarni tayyorlab qo'ying.")}</span>
          </div>
          <Link href="/kabinet/quruvchi" className="btn">{t('Kompaniyani ulash')}</Link>
        </section>
      </main>
      <Footer lang={lang} />
    </>
  );
}
