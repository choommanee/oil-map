import type { FeedItem } from '@/lib/types';

interface RealtimeFeedProps {
  items: FeedItem[];
}

export default function RealtimeFeed({ items }: RealtimeFeedProps) {
  return (
    <section className="panel intel-panel compact-panel">
      <div className="panel-heading panel-heading-tight">
        <div>
          <p className="eyebrow">Realtime Feed</p>
          <h3 className="panel-title">สัญญาณหน้างานและการเปลี่ยนแปลงล่าสุด</h3>
        </div>
      </div>

      <div className="feed-list feed-list-dense">
        {items.length > 0 ? (
          items.map((item) => (
            <article key={String(item.id)} className="feed-item">
              <div className="feed-dot" />
              <div className="feed-body">
                <div className="feed-head">
                  <strong>{item.station_name}</strong>
                  <span>{new Date(item.updated_at).toLocaleTimeString('th-TH')}</span>
                </div>
                <p>{item.message}</p>
                <span className="feed-status">{item.status}</span>
              </div>
            </article>
          ))
        ) : (
          <div className="feed-empty">
            <p className="subtle-text">ยังไม่มีเหตุการณ์ realtime ในช่วงนี้</p>
          </div>
        )}
      </div>
    </section>
  );
}