'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/auth/login');
    }
  }, [router]);

  if (typeof window !== 'undefined' && !isAuthenticated()) return null;

  return <>{children}</>;
}
