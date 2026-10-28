export type Developer = {
  id: string;
  slug: string;
  name: string;
  initials: string;
  city: string;
  founded_year: number | null;
  description: string;
  description_ru?: string;
  verified: boolean;
  delivered_total: number;
  delivered_on_time: number;
  sold_units: number;
  avg_kadastr_months: number | null;
  buyer_rating: number | null;
  review_count: number;
  docs_open: boolean;
  phone?: string | null;
  is_sample: boolean;
  rating: number;
  building_now: number;
  call_days: number[];
  call_from: string;
  call_to: string;
};

export type UnitType = {
  id: string;
  complex_id: string;
  rooms: number;
  area: number;
  price: number | null;
  available: number | null;
};

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
  description_ru?: string;
  cover_url: string | null;
  published: boolean;
  is_sample: boolean;
};

export type ComplexWithDev = Complex & {
  developer: Pick<Developer, 'slug' | 'name' | 'initials' | 'rating'>;
  unit_types: UnitType[];
};
