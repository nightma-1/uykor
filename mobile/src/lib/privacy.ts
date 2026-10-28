// Privacy policy shown inside the app (also published at uykor.uz/maxfiylik).
export const PRIVACY_UPDATED = '2026-10-28';

export const PRIVACY: Record<'uz' | 'ru', { h: string; p: string }[]> = {
  uz: [
    { h: 'Kim biz', p: "Uykor — Samarqanddagi yangi uylar, ijara, sotuv va ustalarni topish xizmati (uykor.uz va mobil ilova). Savollar uchun: Telegram @UykorBot." },
    { h: "Qanday ma'lumot yig'amiz", p: "Telegram orqali kirsangiz: Telegram ID, ism va foydalanuvchi nomi; o'zingiz ulashsangiz — telefon raqam. Apple orqali kirsangiz: Apple bergan identifikator va (xohlasangiz) ism va email. Profilda kiritgan ism, telefon va kompaniya nomi. Saqlangan e'lonlar, eslatmalar, sharhlar va arizalar (ism, telefon, qaysi majmua). E'lon yoki usta profili uchun yuklangan rasmlar va tekshiruv hujjatlari." },
    { h: 'Nima uchun ishlatamiz', p: "Hisobingizga kirish, quruvchiga arizangizni yetkazish, e'lonlaringizni ko'rsatish, Telegram orqali eslatma yuborish va makler hamda soxta e'lonlarga qarshi tekshiruv uchun. Reklama uchun ma'lumot sotmaymiz va uchinchi tomonga bermaymiz." },
    { h: 'Kim ko\'radi', p: "Majmuaga yuborgan arizangizni (ism va telefon) shu majmua quruvchisi ko'radi. E'loningizdagi ism va telefon raqamni boshqa foydalanuvchilar siz belgilagan qo'ng'iroq vaqtida ko'radi. Kadastr va pasport rasmlarini faqat Uykor moderatori ko'radi; ular tekshiruv qarori chiqqach darhol o'chiriladi." },
    { h: 'Qayerda saqlanadi', p: "Ma'lumotlar Supabase (Yevropa, Frankfurt) serverlarida shifrlangan aloqa orqali saqlanadi. Xarita OpenFreeMap orqali ko'rsatiladi; Telegram xabarlari Telegram orqali yuboriladi." },
    { h: 'Hisobni o\'chirish', p: "Ilovada Kabinet → \"Hisobni o'chirish\" tugmasi hisobingizni, e'lonlaringizni, usta profilingizni, sevimlilar, eslatmalar va sharhlaringizni butunlay o'chiradi. Buni @UykorBot'ga yozib ham so'rashingiz mumkin." },
    { h: 'Bolalar', p: "Xizmat 18 yoshdan katta foydalanuvchilar uchun mo'ljallangan." },
    { h: "O'zgarishlar", p: "Siyosat o'zgarsa, yangi matn shu yerda va uykor.uz/maxfiylik sahifasida e'lon qilinadi." },
  ],
  ru: [
    { h: 'Кто мы', p: 'Uykor — сервис поиска новостроек, аренды, продажи жилья и мастеров в Самарканде (uykor.uz и мобильное приложение). Вопросы: Telegram @UykorBot.' },
    { h: 'Какие данные мы собираем', p: 'При входе через Telegram: Telegram ID, имя и имя пользователя; номер телефона — если вы сами им поделились. При входе через Apple: идентификатор от Apple и (по желанию) имя и email. Имя, телефон и название компании из профиля. Избранное, уведомления, отзывы и заявки (имя, телефон, выбранный ЖК). Фотографии и документы для проверки, загруженные к объявлению или профилю мастера.' },
    { h: 'Зачем мы их используем', p: 'Для входа в аккаунт, передачи заявки застройщику, показа ваших объявлений, уведомлений в Telegram и проверки против маклеров и фейковых объявлений. Мы не продаём данные и не передаём их третьим лицам для рекламы.' },
    { h: 'Кто их видит', p: 'Заявку на ЖК (имя и телефон) видит застройщик этого ЖК. Имя и телефон из объявления видят другие пользователи в указанные вами часы звонков. Фото кадастра и паспорта видит только модератор Uykor; они удаляются сразу после решения по проверке.' },
    { h: 'Где хранятся', p: 'Данные хранятся на серверах Supabase (Европа, Франкфурт) с шифрованным соединением. Карта показывается через OpenFreeMap; уведомления отправляются через Telegram.' },
    { h: 'Удаление аккаунта', p: 'В приложении: Кабинет → «Удалить аккаунт». Это полностью удаляет аккаунт, объявления, профиль мастера, избранное, уведомления и отзывы. Также можно написать в @UykorBot.' },
    { h: 'Дети', p: 'Сервис предназначен для пользователей старше 18 лет.' },
    { h: 'Изменения', p: 'При изменении политики новый текст публикуется здесь и на странице uykor.uz/maxfiylik.' },
  ],
};
