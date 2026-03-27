'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Fuel, LayoutDashboard, LogIn, LogOut, MapPin, Navigation2, UserCog } from 'lucide-react';
import { getAuthUser, logout, type AuthUser } from '@/lib/auth';

export default function GlobalNav() {
  const path = usePathname();
  const router = useRouter();
  const isAuth = path.startsWith('/auth');
  const isStaff = path.startsWith('/staff');
  const isNearby = path === '/nearby';

  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(getAuthUser());
  }, [path]); // re-read on navigation so it updates after login

  function handleLogout() {
    logout();
    setUser(null);
    router.push('/');
  }

  if (isAuth || isNearby) return null;

  return (
    <nav className="global-nav">
      <Link href="/" className="global-nav-brand">
        <Fuel size={16} />
        <span>ระบบน้ำมัน</span>
      </Link>

      <div className="global-nav-links">
        <Link href="/" className={`global-nav-link ${path === '/' ? 'active' : ''}`}>
          <LayoutDashboard size={13} />
          ภาพรวม
        </Link>
        <Link href="/nearby" className={`global-nav-link ${path === '/nearby' ? 'active' : ''}`}>
          <Navigation2 size={13} />
          ปั้มใกล้ฉัน
        </Link>
        <Link
          href={user?.station_id ? `/staff/update?station_id=${user.station_id}` : '/staff/update'}
          className={`global-nav-link ${isStaff ? 'active' : ''}`}
        >
          <UserCog size={13} />
          บันทึกข้อมูล
        </Link>
        {path.startsWith('/province/') && (
          <span className="global-nav-breadcrumb">
            <MapPin size={11} />
            {path.split('/').filter(Boolean).slice(1).join(' › ')}
          </span>
        )}
      </div>

      {user ? (
        <div className="global-nav-user">
          <span className="global-nav-user-name">{user.name}</span>
          <span className="global-nav-user-role">{user.role}</span>
          <button type="button" className="global-nav-logout" onClick={handleLogout} title="ออกจากระบบ">
            <LogOut size={13} />
          </button>
        </div>
      ) : (
        <Link href="/auth/login" className="global-nav-login">
          <LogIn size={13} />
          เข้าสู่ระบบ
        </Link>
      )}
    </nav>
  );
}
