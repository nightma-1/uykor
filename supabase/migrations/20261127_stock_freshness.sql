-- Xonadonlar zaxirasi: bosh sahifa filtrlari va "N kun oldin yangilangan" belgisi uchun.

-- Quruvchi "Hammasi dolzarb" tugmasini bosgan payt (holat o'zgarmasa ham yangilik sanasi).
alter table public.complexes add column if not exists stock_checked_at timestamptz;

-- Har bir majmua bo'yicha sotuvdagi xonadonlar xulosasi (narx bo'sh bo'lsa maydon × m² narxi).
-- by_rooms: {"1": eng arzon narx, "2": ...} — faqat sotuvdagilar.
create or replace view public.complex_stock with (security_invoker = true) as
with x as (
  select a.complex_id, a.rooms, a.status, a.updated_at, coalesce(a.price, a.area * c.price_m2) as total, c.stock_checked_at
  from public.apartments a
  join public.complexes c on c.id = a.complex_id
),
r as (
  select complex_id, rooms, min(total) as p from x where status = 'sotuvda' group by complex_id, rooms
)
select
  x.complex_id,
  count(*) filter (where x.status = 'sotuvda')::int as free,
  count(*)::int as total,
  min(x.total) filter (where x.status = 'sotuvda') as min_price,
  coalesce((select jsonb_object_agg(r.rooms::text, r.p) from r where r.complex_id = x.complex_id), '{}'::jsonb) as by_rooms,
  greatest(max(x.updated_at), max(x.stock_checked_at)) as updated_at
from x
group by x.complex_id;

grant select on public.complex_stock to anon, authenticated;

-- Quruvchi a'zosi yoki admin: holatlar dolzarbligini bir bosishda tasdiqlash.
create or replace function public.confirm_stock(cid uuid)
returns timestamptz
language plpgsql
security definer
set search_path to ''
as $$
declare ts timestamptz := now();
begin
  if not (public.is_admin() or public.is_complex_member(cid)) then
    raise exception 'not allowed';
  end if;
  update public.complexes set stock_checked_at = ts where id = cid;
  return ts;
end $$;

revoke all on function public.confirm_stock(uuid) from public, anon;
grant execute on function public.confirm_stock(uuid) to authenticated;
