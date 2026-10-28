import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform, ScrollView, View } from 'react-native';
import { IconTelegram, Mark } from '@/components/icons';
import { Btn, H1, Notice, Txt, s } from '@/components/ui';
import { useLang } from '@/lib/i18n';
import { FN, sb, SUPABASE_KEY } from '@/lib/supabase';
import { C } from '@/lib/theme';

const BOT = 'UykorBot';
const LIMIT_MS = 10 * 60_000;

function newNonce() {
  return Array.from(Crypto.getRandomBytes(16), (x) => x.toString(16).padStart(2, '0')).join('');
}

export default function Login() {
  const { t } = useLang();
  const [state, setState] = useState<'idle' | 'waiting' | 'done' | 'expired' | 'error'>('idle');
  const [appleErr, setAppleErr] = useState('');
  const [appleOk, setAppleOk] = useState(false);
  const nonce = useRef('');
  const started = useRef(0);
  const busy = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setAppleOk).catch(() => {});
  }, []);

  async function poll() {
    if (!nonce.current || busy.current) return;
    if (Date.now() - started.current > LIMIT_MS) { nonce.current = ''; setState('expired'); return; }
    busy.current = true;
    try {
      const r = await fetch(FN('tg-auth'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
        body: JSON.stringify({ action: 'check', nonce: nonce.current }),
      });
      const j = await r.json();
      if (j.status === 'ok' && j.token_hash) {
        nonce.current = '';
        const { error } = await sb.auth.verifyOtp({ token_hash: j.token_hash, type: 'email' });
        if (error) { setState('error'); return; }
        setState('done');
        router.back();
      } else if (j.status === 'error') {
        nonce.current = '';
        setState('error');
      }
    } catch { /* network blip: next tick */ } finally {
      busy.current = false;
    }
  }

  useEffect(() => {
    if (state !== 'waiting') return;
    const id = setInterval(poll, 2000);
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') poll(); });
    return () => { clearInterval(id); sub.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function start() {
    nonce.current = newNonce();
    started.current = Date.now();
    setState('waiting');
    const app = `tg://resolve?domain=${BOT}&start=login_${nonce.current}`;
    const web = `https://t.me/${BOT}?start=login_${nonce.current}`;
    try {
      if (Platform.OS !== 'web' && (await Linking.canOpenURL(app))) await Linking.openURL(app);
      else await Linking.openURL(web);
    } catch {
      await Linking.openURL(web).catch(() => {});
    }
  }

  async function apple() {
    setAppleErr('');
    try {
      const raw = newNonce();
      const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
        nonce: hashed,
      });
      if (!cred.identityToken) throw new Error('no token');
      const { data, error } = await sb.auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken, nonce: raw });
      if (error) throw error;
      // Apple gives the name only on the very first sign-in.
      const name = [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(' ');
      if (name && data.user) await sb.from('profiles').upsert({ id: data.user.id, full_name: name }, { onConflict: 'id', ignoreDuplicates: true });
      router.back();
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return;
      setAppleErr(t("Apple orqali kirib bo'lmadi. Qayta urinib ko'ring."));
    }
  }

  return (
    <ScrollView contentContainerStyle={[s.screen, { paddingTop: 28 }]}>
      <View style={{ alignItems: 'center', gap: 12 }}>
        <Mark size={64} />
        <H1 style={{ textAlign: 'center' }}>{t('Uykorga kirish')}</H1>
        <Txt muted center>{t("Parol kerak emas. Telegram'dagi @UykorBot orqali bir bosishda kirasiz.")}</Txt>
      </View>

      {state === 'waiting' ? (
        <Notice>
          <View style={{ gap: 8 }}>
            <Txt weight="bold" color="#0B4F4A">{t("Telegram'da \"Tasdiqlash\" tugmasini bosing")}</Txt>
            <Txt size={14} color="#0B4F4A">{t("Tasdiqlaganingizdan so'ng ilovaga qayting, kirish avtomatik bo'ladi.")}</Txt>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Btn small kind="tg" title={t("Telegram'ni ochish")} onPress={start} />
              <Btn small kind="ghost" title={t('Bekor qilish')} onPress={() => { nonce.current = ''; setState('idle'); }} />
            </View>
          </View>
        </Notice>
      ) : (
        <Btn kind="tg" title={state === 'done' ? t('Kirilmoqda…') : t('Telegram orqali kirish')} icon={<IconTelegram />} onPress={start} disabled={state === 'done'} />
      )}
      {state === 'expired' && <Txt color={C.danger}>{t("Vaqt tugadi. Qaytadan urinib ko'ring.")}</Txt>}
      {state === 'error' && <Txt color={C.danger}>{t("Kirib bo'lmadi. Qaytadan urinib ko'ring.")}</Txt>}

      {appleOk && (
        <View style={{ gap: 8 }}>
          <Txt muted center size={13}>{t('yoki')}</Txt>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={10}
            style={{ height: 48 }}
            onPress={apple}
          />
          {appleErr ? <Txt color={C.danger}>{appleErr}</Txt> : null}
        </View>
      )}

      <Txt size={12} muted center>{t("Kirish orqali siz Uykor foydalanish shartlari va maxfiylik siyosatiga rozilik bildirasiz.")}</Txt>
      <Btn kind="ghost" small title={t('Maxfiylik siyosati')} onPress={() => router.push('/haqida')} style={{ alignSelf: 'center' }} />
    </ScrollView>
  );
}
