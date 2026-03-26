import Image from 'next/image';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { BangchakPriceData } from '@/lib/bangchak';

interface OilPriceBarProps {
  data: BangchakPriceData;
}

export default function OilPriceBar({ data }: OilPriceBarProps) {
  return (
    <div className="opb-shell">
      {/* Left: source label */}
      <div className="opb-source">
        <a
          href={data.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="opb-brand"
        >
          <Image
            src="https://webbcpopaprd001.azurewebsites.net/ApiGetImages?FileName=133589692550720467.jpg"
            alt="Bangchak"
            width={22}
            height={22}
            unoptimized
            className="opb-brand-logo"
          />
          <span className="opb-brand-name">BCP</span>
        </a>
        <span className="opb-date">{data.effectiveDate}</span>
      </div>

      {/* Scrollable price pills */}
      <div className="opb-track">
        {data.oils.map((oil) => {
          const up = oil.diff > 0;
          const down = oil.diff < 0;
          return (
            <div
              key={oil.abbr}
              className="opb-pill"
              style={{ '--pill-c': oil.color } as React.CSSProperties}
            >
              <Image
                src={oil.icon}
                alt={oil.abbr}
                width={28}
                height={28}
                unoptimized
                className="opb-pill-icon"
              />
              <span className="opb-pill-abbr">{oil.abbr}</span>
              <span className="opb-pill-price">{oil.priceToday.toFixed(2)}</span>
              <span className={`opb-pill-diff ${up ? 'up' : down ? 'down' : 'flat'}`}>
                {up ? <TrendingUp size={10} /> : down ? <TrendingDown size={10} /> : <Minus size={10} />}
                {oil.diff !== 0 && (
                  <span>{up ? '+' : ''}{oil.diff.toFixed(2)}</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
