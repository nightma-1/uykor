# Uykor ilovasini App Store va Google Play'ga chiqarish

Ilova kodi tayyor (Expo SDK 58, iOS + Android bitta kod). Mac kerak emas — ilova Expo serverlarida (EAS) yig'iladi.

## 0. Siz qiladigan ishlar (pul va hisoblar)

| Nima | Narx | Qayerda | Muddat |
|---|---|---|---|
| Apple Developer Program | $99 / yil | developer.apple.com/programs | 1–2 kun (jismoniy shaxs), yuridik shaxs uchun D-U-N-S raqami bilan 1–2 hafta |
| Google Play Console | $25 bir marta | play.google.com/console | 1–3 kun, shaxsni tasdiqlash |
| Expo hisobi | bepul | expo.dev | 1 daqiqa |

Muhim: Google Play'da **2023-yil noyabridan keyin ochilgan shaxsiy hisoblar** ilovani ochiq chiqarishdan oldin **12 ta testerda 14 kun yopiq test** o'tkazishi shart. Yuridik shaxs (MChJ/YaTT) hisobida bu talab yo'q.

## 1. Bir martalik sozlash (kompyuterda, 15 daqiqa)

```bash
cd uykor-app
npm install
npx eas-cli@latest login          # expo.dev hisobi
npx eas-cli@latest init           # loyihani Expo'ga bog'laydi (app.json ichiga projectId yoziladi)
```

## 2. Telefonda sinab ko'rish (do'konsiz)

```bash
npx eas-cli@latest build -p android --profile preview
```
20–30 daqiqadan keyin APK havolasi chiqadi — Android telefonga o'rnatib sinaysiz.
iPhone uchun: `--profile development`, keyin `npx expo start`.

## 3. Sign in with Apple (iPhone uchun majburiy)

Apple qoidasi (4.8): Telegram kabi tashqi kirish bo'lsa, "Apple orqali kirish" ham bo'lishi kerak. Kod tayyor, faqat Supabase'da yoqish kerak:
1. Supabase → Authentication → Sign In / Providers → **Apple** → Enable.
2. "Client IDs" maydoniga: `uz.uykor.app`
3. Saqlang. (Ilova ichidagi native kirish uchun secret key shart emas.)

## 4. Maxfiylik siyosati sahifasi (ikkala do'kon talab qiladi)

`docs/sayt-maxfiylik-page.tsx` faylini sayt kodiga `app/[lang]/maxfiylik/page.tsx` sifatida qo'shing va deploy qiling. Manzil: **https://uykor.uz/maxfiylik**. Shu matn ilova ichida ham bor (Kabinet → Ilova haqida).

## 5. Production build va yuborish

```bash
npx eas-cli@latest build -p ios --profile production       # Apple hisobingiz so'raladi, sertifikatlarni EAS o'zi yaratadi
npx eas-cli@latest submit -p ios --latest                  # TestFlight'ga tushadi (10–15 daqiqa)

npx eas-cli@latest build -p android --profile production   # .aab fayl
```
Google Play'da birinchi marta: Play Console'da ilova yarating (nomi "Uykor", paket `uz.uykor.app`), .aab faylni **Internal testing** ga qo'lda yuklang. Keyingi versiyalar: `eas submit -p android --latest` (buning uchun Google service account kaliti kerak).

## 6. Do'kon sahifalari

Matnlar, kalit so'zlar, kategoriya, yosh reytingi va "Data safety" javoblari — `docs/DOKON-MATNLARI.md` da.
Skrinshotlar (iPhone 6.9", 1320×2868) — `docs/skrinshotlar/`. Ular namuna majmualar bilan olingan; haqiqiy majmualar kiritilgach yangilash tavsiya etiladi (Apple namuna/"Sinov versiyasi" yozuvli ekranlarni rad etishi mumkin).

App Review uchun izoh (App Store Connect → App Review Information → Notes):
> Login is optional; browsing works without an account. To test signed-in features use "Sign in with Apple" on the Kabinet tab. Telegram login opens the @UykorBot bot to confirm. Account deletion: Kabinet → "Hisobni o'chirish".

## 7. Apple rad etishi mumkin bo'lgan joylar va holat

| Qoida | Holat |
|---|---|
| 4.2 — oddiy sayt-o'ram bo'lmasligi | ✅ To'liq native ilova |
| 4.8 — Sign in with Apple | ✅ Bor (3-bandni bajaring) |
| 5.1.1(v) — hisobni ilovada o'chirish | ✅ Kabinet → Hisobni o'chirish (`delete-account` server funksiyasi ishga tushirilgan) |
| 5.1.1 — maxfiylik siyosati havolasi | ⚠️ 4-bandni bajaring |
| 2.1 — namuna ma'lumotlar | ⚠️ Yuborishdan oldin admin paneldan "Namunalarni o'chirish" va haqiqiy majmualarni kiriting |
| 1.2 — foydalanuvchi kontenti (e'lonlar, sharhlar) | ✅ Shikoyat qilish, moderatsiya, bloklash bor |

## 8. Ilovada hozircha nima saytga yo'naltiriladi

E'lon joylash/tahrirlash, hujjat yuklash, usta profilini ochish va quruvchi kabineti — sayt sahifasi ilova ichidagi brauzerda ochiladi (Telegram orqali saytda ham kirish kerak bo'ladi). Keyingi versiyada bularni ham native qilish mumkin.

## Fayllar

- `src/app/` — ekranlar (expo-router)
- `src/lib/` — Supabase, tarjimalar (`ru.ts`), formatlash
- `supabase/functions/delete-account/` — hisobni o'chirish (allaqachon deploy qilingan)
- `app.json` — nom, bundle ID `uz.uykor.app`, ikonka, splash
- `eas.json` — build profillari
