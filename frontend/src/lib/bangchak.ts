export interface OilPrice {
  name: string;       // full Thai name
  abbr: string;       // short label e.g. G95, B7, E20
  color: string;      // brand color for the pill
  icon: string;       // icon image URL from API
  priceToday: number;
  priceYesterday: number;
  diff: number;       // priceToday - priceYesterday
}

export interface BangchakPriceData {
  effectiveDate: string;   // e.g. "24 มี.ค. 69"
  fetchedAt: string;       // ISO timestamp
  oils: OilPrice[];
  sourceUrl: string;
}

interface RawOilItem {
  OilName: string;
  PriceYesterday: number;
  PriceToday: number;
  IconWeb: string;
}

interface RawResponse {
  OilRemark2: string;
  OilList: string;
}

function abbrevAndColor(name: string): { abbr: string; color: string } {
  if (name.includes('E85'))                      return { abbr: 'E85',    color: '#a855f7' };
  if (name.includes('E20'))                      return { abbr: 'E20',    color: '#32d9ff' };
  if (name.includes('91'))                       return { abbr: 'G91',    color: '#67a6ff' };
  if (name.includes('97') || name.includes('ไฮพรีเมียม 97')) return { abbr: 'Hi-97', color: '#f59e0b' };
  if (name.includes('95'))                       return { abbr: 'G95',    color: '#2fe08d' };
  if (name.includes('ไฮพรีเมียมดีเซล'))         return { abbr: 'Hi-D',   color: '#ff9a3d' };
  if (name.includes('ดีเซล') || name.includes('Diesel')) return { abbr: 'B7', color: '#ffd166' };
  return { abbr: name.slice(0, 5), color: '#94a3b8' };
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36';

async function getSessionCookie(): Promise<string> {
  try {
    const r = await fetch('https://oil-price.bangchak.co.th/BcpOilPrice1/th', {
      method: 'HEAD',
      headers: { 'user-agent': UA },
      next: { revalidate: 3600 },
    });
    const setCookie = r.headers.get('set-cookie') ?? '';
    const match = /ARRAffinitySameSite=([^;]+)/.exec(setCookie);
    return match ? `ARRAffinitySameSite=${match[1]}` : '';
  } catch {
    return '';
  }
}

export async function getBangchakPrices(): Promise<BangchakPriceData | null> {
  try {
    const cookie = await getSessionCookie();
    const res = await fetch('https://oil-price.bangchak.co.th/apioilprice2/th', {
      headers: {
        accept: '*/*',
        'accept-language': 'th-TH,th;q=0.9',
        referer: 'https://oil-price.bangchak.co.th/BcpOilPrice1/th',
        'user-agent': UA,
        'x-requested-with': 'XMLHttpRequest',
        ...(cookie ? { cookie } : {}),
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null;
    const raw: RawResponse[] = await res.json() as RawResponse[];
    if (!raw?.[0]) return null;

    const data = raw[0];
    const oils: RawOilItem[] = JSON.parse(data.OilList) as RawOilItem[];

    // Extract effective date from OilRemark2
    const dateMatch = /วันที่\s+(.+?)\s+เวลา/.exec(data.OilRemark2);
    const effectiveDate = dateMatch?.[1] ?? '';

    return {
      effectiveDate,
      fetchedAt: new Date().toISOString(),
      sourceUrl: 'https://oil-price.bangchak.co.th/BcpOilPrice1/th',
      oils: oils.map((o) => {
        const { abbr, color } = abbrevAndColor(o.OilName);
        return {
          name: o.OilName,
          abbr,
          color,
          icon: o.IconWeb,
          priceToday: o.PriceToday,
          priceYesterday: o.PriceYesterday,
          diff: Math.round((o.PriceToday - o.PriceYesterday) * 100) / 100,
        };
      }),
    };
  } catch {
    return null;
  }
}
