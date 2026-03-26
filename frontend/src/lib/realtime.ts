import { API_BASE_URL, type ChatMessage } from '@/lib/api';

type RealtimeSnapshotHandler = (payload: string) => void;
type RealtimeUpdateHandler = (stationId: number, message: string) => void;
export type RealtimeChatHandler = (msg: ChatMessage) => void;

interface RealtimeEventMessage {
  type: 'Snapshot' | 'Update' | 'Chat';
  data:
    | { payload: string }
    | { station_id: number; message: string }
    | ChatMessage;
}

export function startRealtimeFeed(
  onSnapshot: RealtimeSnapshotHandler,
  onUpdate: RealtimeUpdateHandler,
  onChat?: RealtimeChatHandler,
) {
  const apiUrl = new URL(API_BASE_URL);
  const protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = typeof window !== 'undefined' ? window.location.hostname : apiUrl.hostname;
  const port = apiUrl.port || (protocol === 'wss:' ? '443' : '80');
  const socket = new WebSocket(`${protocol}//${host}:${port}/ws/realtime`);

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data as string) as RealtimeEventMessage;

    if (message.type === 'Snapshot' && 'payload' in message.data) {
      onSnapshot((message.data as { payload: string }).payload);
    }
    if (message.type === 'Update' && 'station_id' in message.data) {
      const d = message.data as { station_id: number; message: string };
      onUpdate(d.station_id, d.message);
    }
    if (message.type === 'Chat' && onChat) {
      onChat(message.data as ChatMessage);
    }
  };

  return () => { socket.close(); };
}

export function createRealtimeSubscription(
  onSnapshot: RealtimeSnapshotHandler,
  onUpdate: RealtimeUpdateHandler,
  onChat?: RealtimeChatHandler,
) {
  let unsubscribe: (() => void) | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  let retryCount = 0;

  const connect = () => {
    if (stopped) return;
    unsubscribe = startRealtimeFeed(onSnapshot, onUpdate, onChat);
    retryCount = 0;
  };

  const scheduleReconnect = () => {
    if (stopped) {
      return;
    }

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }

    const delay = Math.min(30000, 1000 * 2 ** retryCount);
    retryCount += 1;

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  };

  const cleanup = () => {
    stopped = true;

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };

  connect();

  return {
    reconnect: scheduleReconnect,
    cleanup,
  };
}
