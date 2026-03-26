'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, LogIn, UserPlus } from 'lucide-react';
import { login, register } from '@/lib/api';

interface AuthFormProps {
  mode: 'login' | 'register';
}

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [stationId, setStationId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!email || !password) {
      setError('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name || undefined,
        email,
        password,
        station_id: stationId ? Number(stationId) : undefined,
      };
      const result = mode === 'login' ? await login(payload) : await register(payload);

      // Persist token + user info
      localStorage.setItem('auth_token', result.token);
      localStorage.setItem('auth_user', JSON.stringify(result.user));

      // Redirect: staff with assigned station → straight to update; otherwise → station picker
      if (result.user.station_id) {
        router.push(`/staff/update?station_id=${result.user.station_id}`);
      } else {
        router.push('/staff/update');
      }
    } catch {
      setError(mode === 'login' ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' : 'ไม่สามารถสร้างบัญชีได้ กรุณาลองใหม่');
      setLoading(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <div className="auth-card-header">
        <div className="auth-card-icon">
          {mode === 'login' ? <LogIn size={20} /> : <UserPlus size={20} />}
        </div>
        <div>
          <p className="auth-card-kicker">{mode === 'login' ? 'เจ้าหน้าที่ระบบ' : 'สมัครสมาชิก'}</p>
          <h2 className="auth-card-title">
            {mode === 'login' ? 'เข้าสู่ระบบ' : 'ลงทะเบียนผู้ปฏิบัติงาน'}
          </h2>
        </div>
      </div>

      <div className="auth-form-grid">
        {mode === 'register' && (
          <label className="auth-field">
            <span className="auth-label">ชื่อผู้ใช้</span>
            <input
              className="auth-input"
              type="text"
              value={name}
              placeholder="ชื่อ-นามสกุล"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        )}

        <label className="auth-field">
          <span className="auth-label">อีเมล</span>
          <input
            className="auth-input"
            type="email"
            value={email}
            placeholder="email@example.com"
            required
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="auth-field">
          <span className="auth-label">รหัสผ่าน</span>
          <input
            className="auth-input"
            type="password"
            value={password}
            placeholder="••••••••"
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {mode === 'register' && (
          <label className="auth-field">
            <span className="auth-label">รหัสสถานี (ถ้ามี)</span>
            <input
              className="auth-input"
              type="number"
              value={stationId}
              placeholder="เช่น 12"
              onChange={(e) => setStationId(e.target.value)}
            />
          </label>
        )}
      </div>

      {error && (
        <div className="auth-error">
          <AlertTriangle size={13} />
          <span>{error}</span>
        </div>
      )}

      <button type="submit" className="auth-submit-btn" disabled={loading}>
        {loading ? 'กำลังดำเนินการ...' : mode === 'login' ? 'เข้าสู่ระบบ' : 'สร้างบัญชี'}
      </button>

      {mode === 'login' && (
        <div className="auth-demo-hint">
          <span className="auth-demo-label">ทดสอบ:</span>
          <code>staff@ptt-vibhavadi.demo</code>
          <span>/</span>
          <code>demo1234</code>
        </div>
      )}
    </form>
  );
}
