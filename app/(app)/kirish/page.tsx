import LoginForm from '@/components/LoginForm';
import { getLang } from '@/lib/i18n-server';
import { T } from '@/lib/i18n';

export async function generateMetadata() {
  return { title: T(await getLang())('Kirish') };
}

export default async function Kirish() {
  return <LoginForm lang={await getLang()} />;
}
