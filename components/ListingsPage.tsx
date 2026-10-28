import Header from './Header';
import Footer from './Footer';
import ListingsClient from './ListingsClient';
import { getListings, type ListingKind } from '@/lib/listings';
import type { Lang } from '@/lib/i18n';

export default async function ListingsPage({ lang, kind }: { lang: Lang; kind: ListingKind }) {
  const listings = await getListings(kind);
  return (
    <>
      <Header lang={lang} active={kind} />
      <ListingsClient lang={lang} kind={kind} listings={listings} />
      <Footer lang={lang} />
    </>
  );
}
