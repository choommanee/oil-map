import Link from 'next/link';
import AuthForm from '@/components/AuthForm';

export default function RegisterPage() {
  return (
    <main className="auth-page-shell">
      <AuthForm mode="register" />
      <p className="auth-switch">
        มีบัญชีแล้ว? <Link href="/auth/login">เข้าสู่ระบบ</Link>
      </p>
    </main>
  );
}