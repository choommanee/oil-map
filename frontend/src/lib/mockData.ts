import type { FeedItem, FuelStatusItem, MapResponse, NearbyStation, OverviewResponse, Station } from './types';

const now = new Date();
const minsAgo = (m: number) => new Date(now.getTime() - m * 60000).toISOString();

function s(
  id: number, name: string, brand: string,
  region: string, prov: string, provSlug: string, dist: string, distSlug: string,
  addr: string, lat: number, lng: number,
  fuels: FuelStatusItem[], updated: number,
): Station {
  const pri: Record<string, number> = { out: 0, low: 1, refilling: 2, medium: 3, high: 4 };
  const worst = fuels.reduce((w, f) => (pri[f.status] ?? 5) < (pri[w.status] ?? 5) ? f : w);
  return { id, name, brand, brand_key: brand.toLowerCase(), region,
    province_name: prov, province_slug: provSlug, district_name: dist, district_slug: distSlug,
    address: addr, lat, lng, last_updated: minsAgo(updated), status: worst.status, fuels };
}

function f(type: string, status: Station['status'], liters: number, price: number, updated: number): FuelStatusItem {
  return { fuel_type: type, status, liters, price_per_liter: price, updated_at: minsAgo(updated) };
}

export const MOCK_STATIONS: Station[] = [
  s(1,'PTT วิภาวดี','PTT','Central','กรุงเทพมหานคร','bangkok','จตุจักร','chatuchak','ถ.วิภาวดีรังสิต',13.8050,100.5550,[f('ดีเซล B7','high',11000,31.90,10),f('แก๊สโซฮอล์ 95','high',9200,38.90,12),f('แก๊สโซฮอล์ 91','medium',4800,37.80,18)],12),
  s(2,'Shell รามา 9','Shell','Central','กรุงเทพมหานคร','bangkok','ห้วยขวาง','huai-khwang','ถ.รามาที่ 9',13.7540,100.5780,[f('แก๊สโซฮอล์ 95','low',1800,39.20,35),f('ดีเซล B7','medium',5600,32.20,32),f('ดีเซล พรีเมียม','medium',3200,35.50,35)],35),
  s(3,'Bangchak รามอินทรา','Bangchak','Central','กรุงเทพมหานคร','bangkok','บางเขน','bang-khen','ถ.รามอินทรา',13.8560,100.6270,[f('แก๊สโซฮอล์ 95','refilling',900,38.70,120),f('แก๊สโซฮอล์ 91','low',1400,37.60,115),f('ดีเซล B7','high',9800,31.70,112)],120),
  s(4,'PTT อ่อนนุช','PTT','Central','กรุงเทพมหานคร','bangkok','ประเวศ','prawet','ถ.ศรีนครินทร์',13.6967,100.6023,[f('ดีเซล B7','high',8800,31.85,5),f('แก๊สโซฮอล์ 95','high',7200,38.60,7),f('E20','medium',3100,35.80,8)],7),
  s(5,'Shell สีลม','Shell','Central','กรุงเทพมหานคร','bangkok','บางรัก','bang-rak','ถ.สีลม',13.7230,100.5320,[f('แก๊สโซฮอล์ 95','medium',4200,39.10,22),f('ดีเซล พรีเมียม','high',6500,35.60,20),f('แก๊สโซฮอล์ 91','medium',3800,37.90,25)],22),
  s(6,'Bangchak สาทร','Bangchak','Central','กรุงเทพมหานคร','bangkok','ยานนาวา','yan-nawa','ถ.สาทร',13.7150,100.5380,[f('แก๊สโซฮอล์ 95','high',8100,38.70,15),f('ดีเซล B7','high',10200,31.80,13)],15),
  s(7,'Esso ลาดพร้าว','Esso','Central','กรุงเทพมหานคร','bangkok','ลาดพร้าว','lat-phrao','ถ.ลาดพร้าว',13.8095,100.5695,[f('แก๊สโซฮอล์ 95','low',1200,38.80,68),f('ดีเซล B7','low',2100,31.95,65),f('E20','out',0,35.90,70)],68),
  s(8,'PT บางนา','PT','Central','กรุงเทพมหานคร','bangkok','บางนา','bang-na','ถ.บางนา-ตราด',13.6580,100.6180,[f('แก๊สโซฮอล์ 95','out',0,38.50,180),f('ดีเซล B7','low',800,31.70,175),f('แก๊สโซฮอล์ 91','low',600,37.40,178)],180),
  s(9,'IRPC พระราม 4','IRPC','Central','กรุงเทพมหานคร','bangkok','คลองเตย','khlong-toei','ถ.พระราม 4',13.7220,100.5530,[f('ดีเซล B7','medium',5400,31.60,45),f('แก๊สโซฮอล์ 95','medium',4100,38.60,47)],45),
  s(10,'Caltex สุขุมวิท','Caltex','Central','กรุงเทพมหานคร','bangkok','วัฒนา','watthana','ถ.สุขุมวิท',13.7310,100.5910,[f('แก๊สโซฮอล์ 95','high',9500,39.20,8),f('ดีเซล พรีเมียม','high',7800,35.80,6),f('ดีเซล B7','medium',4200,32.10,9)],8),
  s(11,'Esso รัตนาธิเบศร์','Esso','Central','นนทบุรี','nonthaburi','เมืองนนทบุรี','mueang-nonthaburi','ถ.รัตนาธิเบศร์',13.8607,100.5148,[f('แก๊สโซฮอล์ 95','medium',5100,38.60,55),f('แก๊สโซฮอล์ 91','high',7600,37.50,53),f('ดีเซล B7','medium',6200,31.80,52)],55),
  s(12,'PT แจ้งวัฒนะ','PT','Central','นนทบุรี','nonthaburi','ปากเกร็ด','pak-kret','ถ.แจ้งวัฒนะ',13.9123,100.4982,[f('แก๊สโซฮอล์ 95','high',8700,38.50,28),f('ดีเซล B7','high',9300,31.60,26)],28),
  s(13,'PTT รังสิต','PTT','Central','ปทุมธานี','pathum-thani','ธัญบุรี','thanyaburi','ถ.รังสิต-นครนายก',14.0058,100.6283,[f('ดีเซล B7','high',13000,31.50,9),f('แก๊สโซฮอล์ 95','high',9800,38.40,11),f('E20','high',4200,35.60,10)],9),
  s(14,'Shell ฟิวเจอร์พาร์ค','Shell','Central','ปทุมธานี','pathum-thani','เมืองปทุมธานี','mueang-pathum-thani','ถ.ติวานนท์',13.9560,100.5250,[f('แก๊สโซฮอล์ 95','medium',4900,38.70,42),f('ดีเซล พรีเมียม','low',1300,35.90,40)],42),
  s(15,'Caltex ซุปเปอร์ไฮเวย์','Caltex','North','เชียงใหม่','chiang-mai','เมืองเชียงใหม่','mueang-chiang-mai','ถ.ซุปเปอร์ไฮเวย์',18.7961,98.9793,[f('แก๊สโซฮอล์ 95','high',8000,39.40,16),f('แก๊สโซฮอล์ 91','medium',3500,38.40,15),f('ดีเซล B7','medium',4700,32.40,14)],16),
  s(16,'PTT ฮางดง','PTT','North','เชียงใหม่','chiang-mai','หางดง','hang-dong','ถ.เชียงใหม่-หางดง',18.6871,98.9196,[f('แก๊สโซฮอล์ 95','medium',4400,39.10,70),f('แก๊สโซฮอล์ 91','low',1600,38.20,68),f('ดีเซล B7','high',8400,32.10,65)],70),
  s(17,'Shell นิมมาน','Shell','North','เชียงใหม่','chiang-mai','เมืองเชียงใหม่','mueang-chiang-mai','ถ.นิมมานเหมินทร์',18.8045,98.9736,[f('แก๊สโซฮอล์ 95','high',7600,39.30,18),f('ดีเซล พรีเมียม','medium',3900,36.10,17)],18),
  s(18,'Bangchak เชียงใหม่ใต้','Bangchak','North','เชียงใหม่','chiang-mai','สารภี','saraphi','ถ.เชียงใหม่-ลำพูน',18.7345,98.9900,[f('แก๊สโซฮอล์ 95','low',1100,39.20,95),f('ดีเซล B7','low',1800,32.30,90),f('E20','out',0,36.00,100)],95),
  s(19,'IRPC มิตรภาพ','IRPC','Northeast','ขอนแก่น','khon-kaen','เมืองขอนแก่น','mueang-khon-kaen','ถ.มิตรภาพ',16.4322,102.8236,[f('แก๊สโซฮอล์ 95','medium',4900,38.80,48),f('แก๊สโซฮอล์ 91','medium',4100,37.90,47),f('ดีเซล B7','high',12000,31.50,46)],48),
  s(20,'Shell บ้านไผ่','Shell','Northeast','ขอนแก่น','khon-kaen','บ้านไผ่','ban-phai','ถ.แจ้งสนิท',16.0583,102.7301,[f('แก๊สโซฮอล์ 95','out',0,39.00,180),f('แก๊สโซฮอล์ 91','low',700,37.95,160),f('ดีเซล B7','medium',5200,31.70,155)],180),
  s(21,'PTT เมืองขอนแก่น','PTT','Northeast','ขอนแก่น','khon-kaen','เมืองขอนแก่น','mueang-khon-kaen','ถ.ศรีจันทร์',16.4425,102.8350,[f('แก๊สโซฮอล์ 95','high',8200,38.70,20),f('ดีเซล B7','high',11000,31.40,18)],20),
  s(22,'Bangchak ชลบุรี','Bangchak','East','ชลบุรี','chonburi','เมืองชลบุรี','mueang-chonburi','ถ.สุขุมวิท ชลบุรี',13.3611,100.9847,[f('แก๊สโซฮอล์ 95','high',9100,38.70,14),f('แก๊สโซฮอล์ 91','medium',4600,37.70,13),f('ดีเซล B7','medium',6000,31.85,12)],14),
  s(23,'PTT ศรีราชา','PTT','East','ชลบุรี','chonburi','ศรีราชา','si-racha','ถ.สุขุมวิท ศรีราชา',13.1737,100.9305,[f('แก๊สโซฮอล์ 95','medium',5200,38.90,23),f('แก๊สโซฮอล์ 91','high',7000,37.80,22),f('ดีเซล B7','high',11500,31.95,20)],23),
  s(24,'Shell พัทยา','Shell','East','ชลบุรี','chonburi','บางละมุง','bang-lamung','ถ.สุขุมวิท พัทยา',12.9340,100.8825,[f('แก๊สโซฮอล์ 95','medium',4800,39.00,38),f('ดีเซล พรีเมียม','low',1600,35.70,36)],38),
  s(25,'Caltex ระยอง','Caltex','East','ระยอง','rayong','เมืองระยอง','mueang-rayong','ถ.สุขุมวิท ระยอง',12.6830,101.2530,[f('แก๊สโซฮอล์ 95','high',8600,38.90,19),f('ดีเซล B7','high',10800,32.00,17)],19),
  s(26,'Caltex ภูเก็ตไบพาส','Caltex','South','ภูเก็ต','phuket','เมืองภูเก็ต','mueang-phuket','ถ.เทพกษัตรี ภูเก็ต',7.8804,98.3923,[f('แก๊สโซฮอล์ 95','high',8300,39.60,18),f('แก๊สโซฮอล์ 91','medium',3800,38.55,17),f('ดีเซล B7','low',1500,32.50,16)],18),
  s(27,'Esso กะทู้','Esso','South','ภูเก็ต','phuket','กะทู้','kathu','ถ.พระภูเก็ตแก้ว กะทู้',7.9175,98.3332,[f('แก๊สโซฮอล์ 95','medium',4300,39.50,105),f('แก๊สโซฮอล์ 91','low',1200,38.45,102),f('ดีเซล B7','medium',5600,32.30,101)],105),
  s(28,'PTT ป่าตอง','PTT','South','ภูเก็ต','phuket','กะทู้','kathu','ถ.วิชิตสงคราม ป่าตอง',7.8969,98.2972,[f('แก๊สโซฮอล์ 95','high',9100,39.40,12),f('ดีเซล B7','high',8700,32.20,10)],12),
  s(29,'PTT โคราช','PTT','Northeast','นครราชสีมา','nakhon-ratchasima','เมืองนครราชสีมา','mueang-nakhon-ratchasima','ถ.มิตรภาพ โคราช',14.9799,102.0977,[f('ดีเซล B7','high',14000,31.40,8),f('แก๊สโซฮอล์ 95','high',9200,38.50,9),f('E20','medium',3600,35.70,10)],8),
  s(30,'Bangchak โคราช','Bangchak','Northeast','นครราชสีมา','nakhon-ratchasima','เมืองนครราชสีมา','mueang-nakhon-ratchasima','ถ.โพธิ์กลาง โคราช',14.9750,102.1050,[f('แก๊สโซฮอล์ 95','medium',5500,38.60,35),f('แก๊สโซฮอล์ 91','medium',4200,37.60,33),f('ดีเซล B7','low',2200,31.55,32)],35),
  s(31,'PTT หาดใหญ่','PTT','South','สงขลา','songkhla','หาดใหญ่','hat-yai','ถ.กาญจนวณิชย์ หาดใหญ่',7.0080,100.4753,[f('แก๊สโซฮอล์ 95','medium',5100,39.20,30),f('ดีเซล B7','high',9600,31.70,28)],30),
  s(32,'Shell หาดใหญ่','Shell','South','สงขลา','songkhla','หาดใหญ่','hat-yai','ถ.เพชรเกษม หาดใหญ่',7.0120,100.4850,[f('แก๊สโซฮอล์ 95','high',7800,39.30,15),f('แก๊สโซฮอล์ 91','medium',3600,38.20,14),f('ดีเซล B7','medium',5800,31.80,13)],15),
  s(33,'PTT อุดรธานี','PTT','Northeast','อุดรธานี','udon-thani','เมืองอุดรธานี','mueang-udon-thani','ถ.มิตรภาพ อุดร',17.3647,102.7615,[f('ดีเซล B7','high',12500,31.35,6),f('แก๊สโซฮอล์ 95','high',8900,38.30,8)],6),
  s(34,'Shell อุดรธานี','Shell','Northeast','อุดรธานี','udon-thani','เมืองอุดรธานี','mueang-udon-thani','ถ.ทหาร อุดร',17.3700,102.7700,[f('แก๊สโซฮอล์ 95','low',1900,38.40,88),f('แก๊สโซฮอล์ 91','low',1400,37.40,85),f('ดีเซล B7','medium',6100,31.45,82)],88),
  s(35,'PTT สุราษฎร์ธานี','PTT','South','สุราษฎร์ธานี','surat-thani','เมืองสุราษฎร์ธานี','mueang-surat-thani','ถ.ตลาดใหม่ สุราษฎร์',9.1382,99.3216,[f('แก๊สโซฮอล์ 95','high',8400,39.00,22),f('ดีเซล B7','high',10200,31.60,20)],22),
];

export const MOCK_NEARBY_STATIONS: NearbyStation[] = MOCK_STATIONS.slice(0,12).map((st,i) => ({
  ...st, distance_km: parseFloat((0.8 + i * 0.9).toFixed(1)),
}));

export const MOCK_MAP: MapResponse = {
  scope: { title: 'ภาพรวมทั่วประเทศ', subtitle: 'national overview', level: 'national' },
  stations: MOCK_STATIONS,
};

export const MOCK_OVERVIEW: OverviewResponse = {
  scope: { title: 'ภาพรวมทั่วประเทศ', subtitle: 'national overview', level: 'national' },
  generated_at: now.toISOString(),
  kpis: [
    { label: 'สถานีทั้งหมด',       value: '35 แห่ง',  tone: 'info',    helper: '31 เปิดให้บริการ' },
    { label: 'มีน้ำมันพร้อมใช้',   value: '26 (74%)', tone: 'success', helper: '+3 จากเมื่อวาน' },
    { label: 'ใกล้ขาดแคลน',       value: '6 (17%)',  tone: 'warning', helper: '▲ +2 จากเมื่อวาน' },
    { label: 'น้ำมันหมด',          value: '3 (9%)',   tone: 'danger',  helper: '▼ -1 จากเมื่อวาน' },
  ],
  region_summaries: [
    { region: 'กรุงเทพฯ',   station_count: 10, healthy_percent: 70, warning_count: 3, critical_count: 2 },
    { region: 'เชียงใหม่',  station_count: 4,  healthy_percent: 50, warning_count: 2, critical_count: 1 },
    { region: 'ขอนแก่น',    station_count: 3,  healthy_percent: 67, warning_count: 1, critical_count: 1 },
    { region: 'ชลบุรี',     station_count: 4,  healthy_percent: 75, warning_count: 1, critical_count: 0 },
    { region: 'ภูเก็ต',     station_count: 3,  healthy_percent: 67, warning_count: 1, critical_count: 0 },
    { region: 'โคราช',      station_count: 2,  healthy_percent: 100, warning_count: 0, critical_count: 0 },
    { region: 'หาดใหญ่',    station_count: 2,  healthy_percent: 100, warning_count: 0, critical_count: 0 },
  ],
  fuel_mix: [
    { fuel_type: 'ดีเซล B7',       available_percent: 72, station_count: 28, average_price: 31.72 },
    { fuel_type: 'แก๊สโซฮอล์ 95', available_percent: 65, station_count: 24, average_price: 38.85 },
    { fuel_type: 'แก๊สโซฮอล์ 91', available_percent: 58, station_count: 18, average_price: 37.80 },
    { fuel_type: 'ดีเซล พรีเมียม', available_percent: 81, station_count: 8,  average_price: 35.70 },
    { fuel_type: 'E20',             available_percent: 44, station_count: 6,  average_price: 35.75 },
  ],
  alerts: [
    { id: 'a1', title: 'น้ำมันหมด', message: 'PT บางนา: G95 หมด รอรถเติม', severity: 'danger',  station_id: 8,  station_name: 'PT บางนา',         updated_at: minsAgo(30)  },
    { id: 'a2', title: 'ใกล้หมด',   message: 'Esso ลาดพร้าว: E20 หมด Diesel ใกล้หมด', severity: 'warning', station_id: 7, station_name: 'Esso ลาดพร้าว',   updated_at: minsAgo(68)  },
    { id: 'a3', title: 'กำลังเติม', message: 'Bangchak รามอินทรา: กำลังเติม G95', severity: 'info',    station_id: 3, station_name: 'Bangchak รามอินทรา', updated_at: minsAgo(10)  },
  ],
  featured_stations: MOCK_STATIONS.slice(0, 4),
};

export const MOCK_FEED: FeedItem[] = [
  { id:'f1', station_id:8,  station_name:'PT บางนา',           province_slug:'bangkok',      district_slug:'bang-na',    message:'G95 หมด — รอรถเติม ETA 14:30',       status:'danger',  updated_at:minsAgo(30),  brand:'PT'       },
  { id:'f2', station_id:20, station_name:'Shell บ้านไผ่',       province_slug:'khon-kaen',    district_slug:'ban-phai',   message:'G95 หมด G91 เหลือ 700L',              status:'danger',  updated_at:minsAgo(180), brand:'Shell'    },
  { id:'f3', station_id:7,  station_name:'Esso ลาดพร้าว',       province_slug:'bangkok',      district_slug:'lat-phrao',  message:'E20 หมด | Diesel เหลือ 2,100L',       status:'warning', updated_at:minsAgo(68),  brand:'Esso'     },
  { id:'f4', station_id:18, station_name:'Bangchak เชียงใหม่ใต้', province_slug:'chiang-mai', district_slug:'saraphi',    message:'E20 หมด G95 ใกล้หมด 1,100L',         status:'warning', updated_at:minsAgo(95),  brand:'Bangchak' },
  { id:'f5', station_id:3,  station_name:'Bangchak รามอินทรา',  province_slug:'bangkok',      district_slug:'bang-khen',  message:'รถมาถึงแล้ว กำลังเติม G95',           status:'normal',  updated_at:minsAgo(10),  brand:'Bangchak' },
  { id:'f6', station_id:13, station_name:'PTT รังสิต',          province_slug:'pathum-thani', district_slug:'thanyaburi', message:'เติม Diesel 15,000L เรียบร้อย',        status:'normal',  updated_at:minsAgo(9),   brand:'PTT'      },
];
