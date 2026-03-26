import Link from 'next/link';
import AuthForm from '@/components/AuthForm';

export default function LoginPage() {
  return (
    <main className="auth-page-shell">
      <AuthForm mode="login" />
      <p className="auth-switch">
        ยังไม่มีบัญชี? <Link href="/auth/register">ลงทะเบียนที่นี่</Link>
      </p>
    </main>
  );
}