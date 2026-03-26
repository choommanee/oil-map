export interface ScopePolygon {
  id: string;
  label: string;
  level: 'national' | 'region' | 'province' | 'district';
  region?: string;
  province_slug?: string;
  district_slug?: string;
  coordinates: [number, number][];
  center: [number, number];
}

export const thailandNationalPolygon: ScopePolygon = {
  id: 'thailand',
  label: 'Thailand',
  level: 'national',
  center: [13.2, 101.1],
  coordinates: [
    [20.3, 97.4],
    [19.1, 99.9],
    [18.1, 101.4],
    [17.2, 103.4],
    [16.1, 104.7],
    [14.7, 104.9],
    [13.1, 103.7],
    [11.4, 99.2],
    [8.2, 98.2],
    [6.3, 100.1],
    [6.0, 101.8],
    [9.0, 99.6],
    [12.5, 100.1],
    [14.1, 99.5],
    [17.1, 98.1],
    [20.3, 97.4],
  ],
};

export const scopePolygons: ScopePolygon[] = [
  {
    id: 'region-central',
    label: 'ภาคกลาง',
    level: 'region',
    region: 'central',
    center: [14.1, 100.6],
    coordinates: [
      [16.3, 99.0],
      [16.0, 101.9],
      [13.0, 101.9],
      [12.3, 99.2],
      [16.3, 99.0],
    ],
  },
  {
    id: 'region-north',
    label: 'ภาคเหนือ',
    level: 'region',
    region: 'north',
    center: [18.4, 99.2],
    coordinates: [
      [20.4, 97.8],
      [20.1, 100.8],
      [17.0, 100.9],
      [16.1, 98.2],
      [20.4, 97.8],
    ],
  },
  {
    id: 'region-northeast',
    label: 'ภาคตะวันออกเฉียงเหนือ',
    level: 'region',
    region: 'northeast',
    center: [16.5, 103.2],
    coordinates: [
      [18.5, 101.6],
      [18.3, 104.9],
      [14.0, 105.0],
      [14.6, 101.9],
      [18.5, 101.6],
    ],
  },
  {
    id: 'region-south',
    label: 'ภาคใต้',
    level: 'region',
    region: 'south',
    center: [8.5, 99.7],
    coordinates: [
      [11.9, 98.4],
      [11.5, 101.3],
      [5.7, 101.8],
      [5.6, 98.7],
      [11.9, 98.4],
    ],
  },
  {
    id: 'province-bangkok',
    label: 'กรุงเทพมหานคร',
    level: 'province',
    province_slug: 'bangkok',
    center: [13.7563, 100.5018],
    coordinates: [
      [13.95, 100.34],
      [13.94, 100.73],
      [13.53, 100.74],
      [13.52, 100.34],
      [13.95, 100.34],
    ],
  },
  {
    id: 'province-chiang-mai',
    label: 'เชียงใหม่',
    level: 'province',
    province_slug: 'chiang-mai',
    center: [18.7883, 98.9853],
    coordinates: [
      [19.28, 98.65],
      [19.27, 99.28],
      [18.35, 99.3],
      [18.34, 98.6],
      [19.28, 98.65],
    ],
  },
  {
    id: 'province-khon-kaen',
    label: 'ขอนแก่น',
    level: 'province',
    province_slug: 'khon-kaen',
    center: [16.4419, 102.835],
    coordinates: [
      [16.82, 102.43],
      [16.8, 103.18],
      [16.04, 103.19],
      [16.02, 102.45],
      [16.82, 102.43],
    ],
  },
  {
    id: 'province-songkhla',
    label: 'สงขลา',
    level: 'province',
    province_slug: 'songkhla',
    center: [7.1897, 100.5951],
    coordinates: [
      [7.65, 100.14],
      [7.64, 100.96],
      [6.82, 100.98],
      [6.8, 100.17],
      [7.65, 100.14],
    ],
  },
  {
    id: 'district-chatuchak',
    label: 'จตุจักร',
    level: 'district',
    province_slug: 'bangkok',
    district_slug: 'chatuchak',
    center: [13.8246, 100.5501],
    coordinates: [
      [13.87, 100.48],
      [13.87, 100.6],
      [13.78, 100.6],
      [13.78, 100.48],
      [13.87, 100.48],
    ],
  },
  {
    id: 'district-mueang-chiang-mai',
    label: 'เมืองเชียงใหม่',
    level: 'district',
    province_slug: 'chiang-mai',
    district_slug: 'mueang-chiang-mai',
    center: [18.7904, 98.9847],
    coordinates: [
      [18.86, 98.89],
      [18.86, 99.07],
      [18.71, 99.07],
      [18.71, 98.89],
      [18.86, 98.89],
    ],
  },
  {
    id: 'district-mueang-khon-kaen',
    label: 'เมืองขอนแก่น',
    level: 'district',
    province_slug: 'khon-kaen',
    district_slug: 'mueang-khon-kaen',
    center: [16.4322, 102.8236],
    coordinates: [
      [16.53, 102.72],
      [16.53, 102.94],
      [16.33, 102.94],
      [16.33, 102.72],
      [16.53, 102.72],
    ],
  },
  {
    id: 'district-hat-yai',
    label: 'หาดใหญ่',
    level: 'district',
    province_slug: 'songkhla',
    district_slug: 'hat-yai',
    center: [7.0084, 100.4747],
    coordinates: [
      [7.09, 100.38],
      [7.09, 100.58],
      [6.92, 100.58],
      [6.92, 100.38],
      [7.09, 100.38],
    ],
  },
];

export function getScopePolygon(params: {
  level: 'national' | 'region' | 'province' | 'district';
  region?: string;
  province_slug?: string;
  district_slug?: string;
}) {
  if (params.level === 'national') {
    return thailandNationalPolygon;
  }

  return scopePolygons.find((polygon) => {
    if (polygon.level !== params.level) {
      return false;
    }

    if (params.level === 'region') {
      return polygon.region === params.region;
    }

    if (params.level === 'province') {
      return polygon.province_slug === params.province_slug;
    }

    return polygon.province_slug === params.province_slug && polygon.district_slug === params.district_slug;
  });
}