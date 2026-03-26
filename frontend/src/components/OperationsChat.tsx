'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { getChatMessages, postChatMessage, type ChatMessage } from '@/lib/api';
import { createRealtimeSubscription } from '@/lib/realtime';
import type { ScopeMeta } from '@/lib/types';

interface OperationsChatProps {
  scope?: ScopeMeta;
}

const AVATAR_COLORS = ['#67a6ff', '#69f0ae', '#ffd166', '#ff9d43', '#41d6e8', '#bd80f5'];

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

export default function OperationsChat({ scope }: OperationsChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Load initial messages
  useEffect(() => {
    getChatMessages(scope?.province_slug ? { province_slug: scope.province_slug } : undefined)
      .then(setMessages)
      .catch(() => setError('โหลดข้อความล้มเหลว'));
  }, [scope?.province_slug]);

  // Subscribe to real-time chat events via WebSocket
  useEffect(() => {
    const sub = createRealtimeSubscription(
      () => {},
      () => {},
      (msg: ChatMessage) => {
        // Filter by province if scoped
        if (scope?.province_slug && msg.province_slug && msg.province_slug !== scope.province_slug) {
          return;
        }
        // Dedup: skip if ID already in list (e.g. message we just sent via POST)
        setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      },
    );
    return () => sub.cleanup();
  }, [scope?.province_slug]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    setError(null);

    try {
      const msg = await postChatMessage({
        sender: 'Admin',
        role: 'ผู้ดูแลระบบ',
        avatar: 'A',
        province_slug: scope?.province_slug,
        text,
      });
      setMessages((prev) => [...prev, msg]);
    } catch {
      setError('ส่งข้อความไม่สำเร็จ');
      setInput(text); // restore
    } finally {
      setSending(false);
    }
  }

  const scopeLabel = scope?.province_name ?? scope?.province_slug?.replace(/-/g, ' ');
  const onlineCount = new Set(messages.map((m) => m.sender)).size;

  return (
    <div className="cmd-panel ops-panel">
      <div className="cmd-panel-head">
        <MessageSquare size={14} />
        <h3 className="cmd-panel-title">แชทปฏิบัติการ</h3>
        {scopeLabel ? (
          <span className="ops-scope-chip">{scopeLabel}</span>
        ) : (
          <span className="ops-online-chip">
            <span className="ops-online-dot" />
            {onlineCount} ผู้ใช้งาน
          </span>
        )}
      </div>

      <div className="ops-msg-list">
        {messages.map((msg) => {
          const isOwn = msg.sender === 'Admin' && msg.role === 'ผู้ดูแลระบบ';
          return isOwn ? (
            <div key={msg.id} className="ops-msg ops-msg-own">
              <div className="ops-bubble ops-bubble-own">
                <p className="ops-text">{msg.text}</p>
                <span className="ops-time">{fmtTime(msg.sent_at)}</span>
              </div>
            </div>
          ) : (
            <div key={msg.id} className="ops-msg">
              <div
                className="ops-avatar"
                style={{ background: avatarColor(msg.sender) }}
                title={`${msg.sender} — ${msg.role}`}
              >
                {msg.avatar}
              </div>
              <div className="ops-bubble-wrap">
                <div className="ops-meta">
                  <span className="ops-sender">{msg.sender}</span>
                  <span className="ops-role">{msg.role}</span>
                </div>
                <div className="ops-bubble">
                  <p className="ops-text">{msg.text}</p>
                  <span className="ops-time">{fmtTime(msg.sent_at)}</span>
                </div>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <p className="ops-empty">ยังไม่มีข้อความ</p>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="ops-error">{error}</p>}

      <div className="ops-input-row">
        <input
          className="ops-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && void send()}
          placeholder={scopeLabel ? `ส่งข้อความใน${scopeLabel}...` : 'พิมพ์ข้อความ... (Enter ส่ง)'}
          maxLength={300}
          disabled={sending}
        />
        <button
          type="button"
          className="ops-send-btn"
          onClick={() => void send()}
          disabled={!input.trim() || sending}
          aria-label="ส่ง"
        >
          <Send size={13} />
        </button>
      </div>
    </div>
  );
}
