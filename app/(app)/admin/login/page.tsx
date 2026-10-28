import AdminLoginForm from '@/components/AdminLoginForm';
import { getLang } from '@/lib/i18n-server';

export const metadata = { title: 'Admin' };

export default async function AdminLogin() {
  return <AdminLoginForm lang={await getLang()} />;
}
