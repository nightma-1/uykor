# Uykor — texnik eslatmalar

- Supabase loyihasi: `upkbwcynhcuurczjvjqo`
- Vercel loyihasi: `uykor` (https://uykor.uz)
- Qo'ng'iroq vaqti: `call_days` / `call_from` / `call_to`. `contact_phone()` raqamni faqat qo'ng'iroq vaqtida beradi,
  `my_contact()` esa egasi uchun. `phone` ustuni anon/authenticated rollar uchun yopiq: yangi ustun qo'shilsa,
  `grant select` ham qo'shish kerak.
- Shaxmatka (xonadon tanlash, 3D): jadvallar `complex_blocks` → `floor_plans` (xonadon konturlari `units` jsonb, metrda)
  → `apartments` (holat: sotuvda/bron/sotilgan/yopiq, narx bo'sh bo'lsa maydon × m² narxi). Planirovka saqlanganda
  xonadonlar `savePlan` (lib/shaxmatka-actions.ts) orqali qayta yaratiladi, holat va narx saqlanadi.
  Muharrir: /admin/majmualar/[id]/xonadonlar va /kabinet/quruvchi/majmua/[id]/xonadonlar. 3D: components/shaxmatka/Building3D.tsx (three.js, faqat 3D ochilganda yuklanadi).
