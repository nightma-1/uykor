export type UnitType = { id: string; complex_id: string; rooms: number; area: number; price: number | null; available: number | null };

export type Complex = {
  id: string;
  slug: string;
  developer_id: string;
  name: string;
  city: string;
  district: string;
  address: string;
  lat: number;
  lng: number;
  floors: number | null;
  blocks: number | null;
  price_m2: number;
  area_min: number | null;
  area_max: number | null;
  installment_months: number;
  first_payment_pct: number;
  kadastr_status: 'bor' | 'jarayonda';
  status: 'qurilmoqda' | 'topshirilgan';
  promised_date: string | null;
  delivered_date: string | null;
  kadastr_months: number | null;
  progress: number;
  docs_verified: boolean;
  description: string;
  description_ru: string;
  cover_url: string | null;
  is_sample: boolean;
};

export type Developer = {
  id: string;
  slug: string;
  name: string;
  initials: string;
  city: string;
  founded_year: number | null;
  description: string;
  description_ru: string;
  verified: boolean;
  delivered_total: number;
  delivered_on_time: number;
  sold_units: number;
  avg_kadastr_months: number | null;
  buyer_rating: number | null;
  review_count: number;
  docs_open: boolean;
  phone: string | null;
  rating: number;
  building_now: number;
  is_sample: boolean;
};

export type ComplexCard = Complex & {
  unit_types: UnitType[];
  developer: Pick<Developer, 'slug' | 'name' | 'initials' | 'rating'>;
};

export type ComplexFull = Complex & {
  unit_types: UnitType[];
  progress_updates: { id: string; month: string; title: string; title_ru?: string; photo_url: string | null }[];
  nearby: { id: string; kind: string; distance_m: number }[];
  complex_photos: { id: string; url: string; caption: string; sort: number }[];
};

export type ListingKind = 'ijara' | 'kunlik' | 'sotuv';

export type Listing = {
  id: string;
  owner_id: string;
  kind: ListingKind;
  title: string;
  city: string;
  district: string;
  address: string;
  lat: number | null;
  lng: number | null;
  rooms: number | null;
  area: number | null;
  floor: number | null;
  floors_total: number | null;
  price: number;
  currency: 'UZS' | 'USD';
  description: string;
  contact_name: string;
  poster_type: 'ega' | 'quruvchi';
  status: 'qoralama' | 'moderatsiya' | 'faol' | 'rad' | 'arxiv';
  verification: 'kutilmoqda' | 'tasdiqlangan' | 'rad';
  reject_reason: string;
  views: number;
  created_at: string;
  published_at: string | null;
  listing_photos: { id: string; url: string; sort: number }[];
};

export type Master = {
  id: string;
  owner_id: string | null;
  name: string;
  categories: string[];
  city: string;
  districts: string;
  experience_years: number | null;
  price_note: string;
  description: string;
  avatar_url: string | null;
  status: string;
  verification: string;
  views: number;
  published_at: string | null;
  rating: number;
  review_count: number;
};

export type Review = { id: string; author_name: string; rating: number; body: string; created_at: string };

export type Profile = { id: string; full_name: string; phone: string; account_type: 'ega' | 'quruvchi'; company: string; blocked: boolean };

export type FavType = 'majmua' | 'elon' | 'usta';
