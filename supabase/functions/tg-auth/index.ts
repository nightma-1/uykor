// Telegram login for Uykor.
// 1) The site opens t.me/<bot>?start=login_<nonce>; the bot asks the user to confirm.
// 2) The site polls this function with the nonce; once confirmed it gets a one-time
//    token_hash and exchanges it for a normal Supabase session (verifyOtp).
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const SITE = 'https://uykor.uz';
const TTL_MIN = 10;
const NONCE = /^[a-f0-9]{32}$/;

let settings: Record<string, string> | null = null;
async function setting(key: string): Promise<string> {
  if (!settings) {
    const { data } = await sb.from('app_settings').select('key, value');
    settings = Object.fromEntries((data || []).map((r) => [r.key, r.value]));
  }
  return settings[key] || '';
}

async function tg(method: string, body: unknown) {
  const token = (await setting('telegram_login_bot_token')) || (await setting('telegram_bot_token'));
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json().catch(() => ({}));
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

const fullName = (u: { first_name?: string; last_name?: string }) => [u.first_name, u.last_name].filter(Boolean).join(' ').slice(0, 80);
const cleanPhone = (p: string) => {
  const d = p.replace(/\D/g, '');
  return (d.length === 9 ? `+998${d}` : `+${d}`).slice(0, 20);
};

// ---------- Telegram webhook ----------
async function onUpdate(u: any) {
  const msg = u.message;
  const cb = u.callback_query;

  if (msg && msg.chat?.type === 'private' && msg.from) {
    const from = msg.from;
    const text: string = msg.text || '';

    if (msg.contact) {
      if (msg.contact.user_id !== from.id) {
        await tg('sendMessage', { chat_id: from.id, text: "Faqat o'zingizning raqamingizni yuboring. / Отправьте только свой номер." });
        return;
      }
      const phone = cleanPhone(msg.contact.phone_number || '');
      await sb.from('tg_logins').update({ phone }).eq('tg_id', from.id).is('used_at', null);
      const { data: acc } = await sb.from('tg_accounts').update({ phone }).eq('tg_id', from.id).select('user_id').maybeSingle();
      if (acc) await sb.from('profiles').update({ phone }).eq('id', acc.user_id).eq('phone', '');
      await tg('sendMessage', {
        chat_id: from.id,
        text: `Raqam saqlandi: ${phone}\nНомер сохранён: ${phone}`,
        reply_markup: { remove_keyboard: true },
      });
      return;
    }

    const m = text.match(/^\/start\s+login_([a-f0-9]{32})$/);
    if (m) {
      const nonce = m[1];
      const { error } = await sb.from('tg_logins').insert({
        nonce,
        tg_id: from.id,
        tg_name: fullName(from),
        tg_username: (from.username || '').slice(0, 64),
      });
      if (error) {
        await tg('sendMessage', { chat_id: from.id, text: "Bu havola eskirgan. Saytda qaytadan \"Telegram orqali kirish\" tugmasini bosing.\nСсылка устарела. Нажмите «Войти через Telegram» на сайте ещё раз." });
        return;
      }
      await tg('sendMessage', {
        chat_id: from.id,
        text:
          "Uykor saytiga kirishni tasdiqlaysizmi?\nAgar tugmani hozir o'zingiz saytda bosmagan bo'lsangiz, tasdiqlamang.\n\n" +
          'Подтвердить вход на сайт Uykor?\nЕсли вы сейчас не нажимали кнопку на сайте, не подтверждайте.',
        reply_markup: { inline_keyboard: [[{ text: '✅ Tasdiqlash / Подтвердить', callback_data: `ok:${nonce}` }], [{ text: '✖ Bekor qilish / Отмена', callback_data: `no:${nonce}` }]] },
      });
      return;
    }

    if (text.startsWith('/start')) {
      await tg('sendMessage', {
        chat_id: from.id,
        text: `Uykor: Samarqanddagi uylar, maklersiz.\nUykor: жильё в Самарканде без риелторов.\n\n${SITE}`,
      });
    }
    return;
  }

  if (cb && cb.from && typeof cb.data === 'string') {
    const [act, nonce] = cb.data.split(':');
    if (!NONCE.test(nonce || '')) return tg('answerCallbackQuery', { callback_query_id: cb.id });
    const since = new Date(Date.now() - TTL_MIN * 60_000).toISOString();
    const chatId = cb.message?.chat?.id;
    const msgId = cb.message?.message_id;

    if (act === 'no') {
      await sb.from('tg_logins').delete().eq('nonce', nonce).eq('tg_id', cb.from.id);
      await tg('answerCallbackQuery', { callback_query_id: cb.id });
      if (chatId) await tg('editMessageText', { chat_id: chatId, message_id: msgId, text: 'Bekor qilindi. / Отменено.' });
      return;
    }

    const { data } = await sb
      .from('tg_logins')
      .update({ confirmed_at: new Date().toISOString(), tg_name: fullName(cb.from), tg_username: (cb.from.username || '').slice(0, 64) })
      .eq('nonce', nonce)
      .eq('tg_id', cb.from.id)
      .is('confirmed_at', null)
      .gte('created_at', since)
      .select('nonce')
      .maybeSingle();

    await tg('answerCallbackQuery', { callback_query_id: cb.id, text: data ? 'OK' : '' });
    if (!chatId) return;
    if (!data) {
      await tg('editMessageText', { chat_id: chatId, message_id: msgId, text: "Havola eskirgan, saytda qaytadan urinib ko'ring.\nСсылка устарела, попробуйте снова на сайте." });
      return;
    }
    await tg('editMessageText', { chat_id: chatId, message_id: msgId, text: '✅ Tasdiqlandi. Saytga qayting.\n✅ Подтверждено. Вернитесь на сайт.' });

    const { data: acc } = await sb.from('tg_accounts').select('phone').eq('tg_id', cb.from.id).maybeSingle();
    if (!acc?.phone) {
      await tg('sendMessage', {
        chat_id: chatId,
        text: "Xohlasangiz, telefon raqamingizni ulashing: e'lonlarda avtomatik qo'yiladi.\nПо желанию поделитесь номером: он подставится в объявления.",
        reply_markup: { keyboard: [[{ text: '📱 Raqamni ulashish / Поделиться номером', request_contact: true }]], resize_keyboard: true, one_time_keyboard: true },
      });
    }
  }
}

// ---------- Site polling ----------
async function onCheck(nonce: string) {
  if (!NONCE.test(nonce)) return json({ status: 'bad' }, 400);
  const since = new Date(Date.now() - TTL_MIN * 60_000).toISOString();

  // Consume the confirmed login exactly once.
  const { data: row } = await sb
    .from('tg_logins')
    .update({ used_at: new Date().toISOString() })
    .eq('nonce', nonce)
    .not('confirmed_at', 'is', null)
    .is('used_at', null)
    .gte('confirmed_at', since)
    .select('tg_id, tg_name, tg_username, phone')
    .maybeSingle();
  if (!row) return json({ status: 'pending' });

  const email = `tg${row.tg_id}@telegram.uykor.uz`;
  let { data: acc } = await sb.from('tg_accounts').select('user_id, phone').eq('tg_id', row.tg_id).maybeSingle();

  if (!acc) {
    const { data: created, error } = await sb.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { tg_id: row.tg_id, full_name: row.tg_name, tg_username: row.tg_username },
    });
    if (error || !created.user) return json({ status: 'error' }, 500);
    await sb.from('tg_accounts').insert({ tg_id: row.tg_id, user_id: created.user.id, tg_username: row.tg_username, phone: row.phone });
    await sb.from('profiles').upsert({ id: created.user.id, full_name: row.tg_name, phone: row.phone }, { onConflict: 'id', ignoreDuplicates: true });
    acc = { user_id: created.user.id, phone: row.phone };
  } else {
    await sb.from('tg_accounts').update({ tg_username: row.tg_username }).eq('tg_id', row.tg_id);
  }

  const { data: link, error: linkErr } = await sb.auth.admin.generateLink({ type: 'magiclink', email });
  if (linkErr || !link?.properties?.hashed_token) return json({ status: 'error' }, 500);
  return json({ status: 'ok', token_hash: link.properties.hashed_token });
}

// ---------- Link Telegram to an existing (e.g. email) account ----------
async function onLink(nonce: string, auth: string) {
  if (!NONCE.test(nonce)) return json({ status: 'bad' }, 400);
  const jwt = auth.replace(/^Bearer\s+/i, '');
  const { data: u } = await sb.auth.getUser(jwt);
  const user = u?.user;
  if (!user) return json({ status: 'auth' }, 401);
  const since = new Date(Date.now() - TTL_MIN * 60_000).toISOString();
  const { data: row } = await sb
    .from('tg_logins')
    .update({ used_at: new Date().toISOString() })
    .eq('nonce', nonce)
    .not('confirmed_at', 'is', null)
    .is('used_at', null)
    .gte('confirmed_at', since)
    .select('tg_id, tg_username, phone')
    .maybeSingle();
  if (!row) return json({ status: 'pending' });

  const { data: byTg } = await sb.from('tg_accounts').select('user_id').eq('tg_id', row.tg_id).maybeSingle();
  if (byTg && byTg.user_id !== user.id) return json({ status: 'band' });
  const { data: byUser } = await sb.from('tg_accounts').select('tg_id').eq('user_id', user.id).maybeSingle();
  if (byUser && byUser.tg_id !== row.tg_id) await sb.from('tg_accounts').delete().eq('user_id', user.id);
  if (!byTg) await sb.from('tg_accounts').insert({ tg_id: row.tg_id, user_id: user.id, tg_username: row.tg_username, phone: row.phone });
  if (row.phone) await sb.from('profiles').update({ phone: row.phone }).eq('id', user.id).eq('phone', '');
  await tg('sendMessage', { chat_id: row.tg_id, text: "✅ Telegram Uykor hisobingizga ulandi. Eslatmalar shu yerga keladi.\n✅ Telegram подключён к аккаунту Uykor. Уведомления будут приходить сюда." });
  return json({ status: 'linked' });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ status: 'bad' }, 405);

  const secret = req.headers.get('x-telegram-bot-api-secret-token');
  if (secret !== null) {
    if (secret !== (await setting('telegram_webhook_secret'))) return new Response('forbidden', { status: 403 });
    try {
      await onUpdate(await req.json());
    } catch (e) {
      console.error(e);
    }
    return new Response('ok');
  }

  const body = await req.json().catch(() => ({}));
  if (body?.action === 'check') return onCheck(String(body.nonce || ''));
  if (body?.action === 'link') return onLink(String(body.nonce || ''), req.headers.get('authorization') || '');
  return json({ status: 'bad' }, 400);
});
