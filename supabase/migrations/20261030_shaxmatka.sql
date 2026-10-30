-- Shaxmatka: JK → blok → qavat planirovkasi → xonadon (holati va narxi bilan).
-- Koordinatalar: planirovka blokning to'g'ri to'rtburchak konturida, metrda (0..width_m, 0..depth_m).
-- rotation_deg = 0 bo'lsa planirovkaning tepasi shimolga qaragan; soat yo'nalishida buriladi.

create table public.complex_blocks (
  id uuid primary key default gen_random_uuid(),
  complex_id uuid not null references public.complexes(id) on delete cascade,
  name text not null default 'A',
  floors int not null default 9 check (floors between 1 and 60),
  commercial_floors int not null default 0 check (commercial_floors between 0 and 5),
  floor_height numeric not null default 3.0 check (floor_height between 2.5 and 6),
  width_m numeric not null default 36 check (width_m between 6 and 300),
  depth_m numeric not null default 16 check (depth_m between 6 and 120),
  rotation_deg numeric not null default 0,
  pos_x numeric not null default 0,
  pos_z numeric not null default 0,
  facade_url text,
  facade_top numeric not null default 8 check (facade_top between 0 and 100),
  facade_bottom numeric not null default 92 check (facade_bottom between 0 and 100),
  color text not null default '#E9E4DA',
  model_url text,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index complex_blocks_complex on public.complex_blocks(complex_id);

create table public.floor_plans (
  id uuid primary key default gen_random_uuid(),
  complex_id uuid not null references public.complexes(id) on delete cascade,
  block_id uuid not null references public.complex_blocks(id) on delete cascade,
  name text not null default '',
  floor_from int not null,
  floor_to int not null,
  image_url text,
  ceiling_m numeric not null default 2.8,
  units jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  check (floor_to >= floor_from)
);
create index floor_plans_block on public.floor_plans(block_id);
create index floor_plans_complex on public.floor_plans(complex_id);

create table public.apartments (
  id uuid primary key default gen_random_uuid(),
  complex_id uuid not null references public.complexes(id) on delete cascade,
  block_id uuid not null references public.complex_blocks(id) on delete cascade,
  plan_id uuid not null references public.floor_plans(id) on delete cascade,
  unit_key text not null,
  ord int not null default 0,
  floor int not null,
  number text not null,
  rooms int not null,
  area numeric not null,
  status text not null default 'sotuvda' check (status in ('sotuvda', 'bron', 'sotilgan', 'yopiq')),
  price bigint,
  updated_at timestamptz not null default now(),
  unique (block_id, floor, unit_key)
);
create index apartments_complex on public.apartments(complex_id);
create index apartments_plan on public.apartments(plan_id);

alter table public.leads add column apartment_id uuid references public.apartments(id) on delete set null;
create index leads_apartment on public.leads(apartment_id);

alter table public.favorites drop constraint favorites_item_type_check;
alter table public.favorites add constraint favorites_item_type_check check (item_type = any (array['majmua', 'elon', 'usta', 'xonadon']));

create or replace function public.touch_apartment() returns trigger language plpgsql set search_path to '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger apartments_touch before update on public.apartments for each row execute function public.touch_apartment();

-- RLS: hamma o'qiydi (faqat e'lon qilingan majmualar), admin va quruvchi a'zolari yozadi.
alter table public.complex_blocks enable row level security;
alter table public.floor_plans enable row level security;
alter table public.apartments enable row level security;

create or replace function public.complex_visible(cid uuid) returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.complexes c where c.id = cid and c.published)
      or public.is_admin() or public.is_complex_member(cid);
$$;

create policy "public read" on public.complex_blocks for select using ((select public.complex_visible(complex_id)));
create policy "admin write" on public.complex_blocks for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "member write" on public.complex_blocks for all to authenticated using ((select public.is_complex_member(complex_id))) with check ((select public.is_complex_member(complex_id)));

create policy "public read" on public.floor_plans for select using ((select public.complex_visible(complex_id)));
create policy "admin write" on public.floor_plans for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "member write" on public.floor_plans for all to authenticated using ((select public.is_complex_member(complex_id))) with check ((select public.is_complex_member(complex_id)));

create policy "public read" on public.apartments for select using ((select public.complex_visible(complex_id)));
create policy "admin write" on public.apartments for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "member write" on public.apartments for all to authenticated using ((select public.is_complex_member(complex_id))) with check ((select public.is_complex_member(complex_id)));

-- Ariza xabarida xonadon raqami ham ko'rinsin.
create or replace function public.notify_new_lead()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
declare cname text; dev uuid; body text; apt text;
begin
  select name, developer_id into cname, dev from public.complexes where id = new.complex_id;
  if new.apartment_id is not null then
    select coalesce(b.name || ' blok, ', '') || a.floor || '-qavat, № ' || a.number || ', ' || a.rooms || ' xonali, ' || a.area || ' m²'
      into apt from public.apartments a left join public.complex_blocks b on b.id = a.block_id where a.id = new.apartment_id;
  end if;
  body := case when new.kind = 'qongiroq' then 'qo''ng''iroq so''raldi' else 'ko''rishga yozildi' end
      || E'\nMajmua: ' || coalesce(cname, '-')
      || coalesce(E'\nXonadon: ' || apt, '')
      || E'\nIsm: ' || new.name || E'\nTelefon: ' || new.phone;
  perform public.tg_admin('Yangi ariza: ' || body || E'\nAdmin panel: https://uykor.uz/admin');
  if dev is not null then
    perform public.tg_developer(dev, 'Uykor: yangi ariza — ' || body || E'\n\nKabinet: https://uykor.uz/kabinet/quruvchi');
  end if;
  return new;
exception when others then
  return new;
end $function$;
