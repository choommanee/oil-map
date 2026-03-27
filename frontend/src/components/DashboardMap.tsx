'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { X } from 'lucide-react';
import Map, { Marker, NavigationControl, Source, Layer, type MapRef } from 'react-map-gl/maplibre';
import type { LngLatBoundsLike, MapLayerMouseEvent } from 'maplibre-gl';
import type { FeatureCollection, GeoJsonProperties, LineString, MultiPolygon, Polygon } from 'geojson';
import { getBrandLogoUrl } from '@/lib/brandLogos';
import { getFuelMeta } from '@/lib/fuelTypes';
import { getViewportStations } from '@/lib/api';
import type { FuelLevel, ScopeMeta, Station } from '@/lib/types';

interface DashboardMapProps {
  stations?: Station[];
  scope?: ScopeMeta;
  onSelectStation?: (station: Station) => void;
  searchOrigin?: {
    lat: number;
    lng: number;
    radiusKm: number;
  } | null;
  useViewportLoad?: boolean;
}

type BoundaryCollection = FeatureCollection<Polygon | MultiPolygon, GeoJsonProperties>;

// ── Region definitions ──────────────────────────────────────────────────────

type RegionKey = 'north' | 'northeast' | 'central' | 'east' | 'south';

interface RegionMeta {
  label: string;
  color: string;
  bounds: LngLatBoundsLike;
}

const REGION_META: Record<RegionKey, RegionMeta> = {
  north: {
    label: 'ภาคเหนือ',
    color: '#4a9ee8',
    bounds: [[97.3, 17.4], [101.4, 20.5]],
  },
  northeast: {
    label: 'ภาคอีสาน',
    color: '#f5a623',
    bounds: [[100.0, 13.9], [105.7, 18.5]],
  },
  central: {
    label: 'ภาคกลาง',
    color: '#7ed321',
    bounds: [[97.6, 12.5], [102.0, 17.6]],
  },
  east: {
    label: 'ภาคตะวันออก',
    color: '#bd10e0',
    bounds: [[100.7, 11.8], [104.6, 14.4]],
  },
  south: {
    label: 'ภาคใต้',
    color: '#e74c3c',
    bounds: [[98.0, 5.2], [103.2, 12.6]],
  },
};

const REGION_ORDER: RegionKey[] = ['north', 'northeast', 'central', 'east', 'south'];

// ── Province → Region mapping ────────────────────────────────────────────────

const PROVINCE_REGION: Record<string, RegionKey> = {
  // North
  'Chiang Mai': 'north',
  'Chiang Rai': 'north',
  Lampang: 'north',
  Lamphun: 'north',
  'Mae Hong Son': 'north',
  Nan: 'north',
  Phayao: 'north',
  Phrae: 'north',
  Uttaradit: 'north',
  // Northeast / Isan
  'Amnat Charoen': 'northeast',
  'Bueng Kan': 'northeast',
  'Buri Ram': 'northeast',
  Chaiyaphum: 'northeast',
  Kalasin: 'northeast',
  'Khon Kaen': 'northeast',
  Loei: 'northeast',
  'Maha Sarakham': 'northeast',
  Mukdahan: 'northeast',
  'Nakhon Phanom': 'northeast',
  'Nakhon Ratchasima': 'northeast',
  'Nong Bua Lam Phu': 'northeast',
  'Nong Khai': 'northeast',
  'Roi Et': 'northeast',
  'Sakon Nakhon': 'northeast',
  'Si Sa Ket': 'northeast',
  Surin: 'northeast',
  'Ubon Ratchathani': 'northeast',
  'Udon Thani': 'northeast',
  Yasothon: 'northeast',
  // Central
  'Ang Thong': 'central',
  'Bangkok Metropolis': 'central',
  'Chai Nat': 'central',
  'Kamphaeng Phet': 'central',
  Kanchanaburi: 'central',
  'Lop Buri': 'central',
  'Nakhon Nayok': 'central',
  'Nakhon Pathom': 'central',
  'Nakhon Sawan': 'central',
  Nonthaburi: 'central',
  'Pathum Thani': 'central',
  Phetchabun: 'central',
  Phichit: 'central',
  Phitsanulok: 'central',
  'Phra Nakhon Si Ayutthaya': 'central',
  Ratchaburi: 'central',
  Saraburi: 'central',
  'Sing Buri': 'central',
  Sukhothai: 'central',
  'Suphan Buri': 'central',
  Tak: 'central',
  'Uthai Thani': 'central',
  // East
  Chachoengsao: 'east',
  Chanthaburi: 'east',
  'Chon Buri': 'east',
  'Prachin Buri': 'east',
  Rayong: 'east',
  'Sa Kaeo': 'east',
  Trat: 'east',
  // South
  Chumphon: 'south',
  Krabi: 'south',
  'Nakhon Si Thammarat': 'south',
  Narathiwat: 'south',
  Pattani: 'south',
  Phangnga: 'south',
  Phatthalung: 'south',
  Phuket: 'south',
  'Prachuap Khiri Khan': 'south',
  Ranong: 'south',
  Satun: 'south',
  Songkhla: 'south',
  'Surat Thani': 'south',
  Trang: 'south',
  Yala: 'south',
  // Samut provinces (Central)
  'Samut Prakan': 'central',
  'Samut Sakhon': 'central',
  'Samut Songkhram': 'central',
  // Phetchaburi (Central/South border — Central)
  Phetchaburi: 'central',
};

// ── Map config ────────────────────────────────────────────────────────────────

const THAILAND_CENTER = {
  longitude: 101.0,
  latitude: 13.0,
  zoom: 5.5,
};

const THAILAND_BOUNDS: LngLatBoundsLike = [
  [97.2, 5.0],
  [105.9, 20.8],
];

const VALLARIS_API_KEY = process.env.NEXT_PUBLIC_VALLARIS_API_KEY ?? '';
const VALLARIS_STYLE_ID = '69c3777e84500caebd3ecbd5';
const MAP_STYLE = VALLARIS_API_KEY
  ? `https://app.vallarismaps.com/core/api/styles/1.0-beta/styles/${VALLARIS_STYLE_ID}?api_key=${VALLARIS_API_KEY}`
  : 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const EMPTY_BOUNDARY_SOURCE: BoundaryCollection = { type: 'FeatureCollection', features: [] };

// ── Status styling ────────────────────────────────────────────────────────────

const STATUS_PRIORITY: FuelLevel[] = ['out', 'low', 'refilling', 'medium', 'high'];

const STATUS_TONE: Record<FuelLevel, { color: string; glow: string; label: string }> = {
  out: { color: '#ff4f70', glow: 'rgba(255,79,112,0.42)', label: 'หมด' },
  low: { color: '#ff9a3d', glow: 'rgba(255,154,61,0.38)', label: 'ใกล้หมด' },
  refilling: { color: '#32d9ff', glow: 'rgba(50,217,255,0.4)', label: 'เติม' },
  medium: { color: '#ffcc52', glow: 'rgba(255,204,82,0.32)', label: 'เฝ้าระวัง' },
  high: { color: '#2fe08d', glow: 'rgba(47,224,141,0.34)', label: 'ปกติ' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────


function getWorstFuelStatus(station: Station): FuelLevel {
  const pool = [station.status, ...station.fuels.map((f) => f.status)];
  for (const level of STATUS_PRIORITY) {
    if (pool.includes(level)) return level;
  }
  return 'high';
}

const PROVINCE_THAI: Record<string, string> = {
  'Amnat Charoen': 'อำนาจเจริญ', 'Ang Thong': 'อ่างทอง', 'Bangkok Metropolis': 'กรุงเทพมหานคร',
  'Bueng Kan': 'บึงกาฬ', 'Buri Ram': 'บุรีรัมย์', 'Chachoengsao': 'ฉะเชิงเทรา',
  'Chai Nat': 'ชัยนาท', 'Chaiyaphum': 'ชัยภูมิ', 'Chanthaburi': 'จันทบุรี',
  'Chiang Mai': 'เชียงใหม่', 'Chiang Rai': 'เชียงราย', 'Chon Buri': 'ชลบุรี',
  'Chumphon': 'ชุมพร', 'Kalasin': 'กาฬสินธุ์', 'Kamphaeng Phet': 'กำแพงเพชร',
  'Kanchanaburi': 'กาญจนบุรี', 'Khon Kaen': 'ขอนแก่น', 'Krabi': 'กระบี่',
  'Lampang': 'ลำปาง', 'Lamphun': 'ลำพูน', 'Loei': 'เลย', 'Lop Buri': 'ลพบุรี',
  'Mae Hong Son': 'แม่ฮ่องสอน', 'Maha Sarakham': 'มหาสารคาม', 'Mukdahan': 'มุกดาหาร',
  'Nakhon Nayok': 'นครนายก', 'Nakhon Pathom': 'นครปฐม', 'Nakhon Phanom': 'นครพนม',
  'Nakhon Ratchasima': 'นครราชสีมา', 'Nakhon Sawan': 'นครสวรรค์',
  'Nakhon Si Thammarat': 'นครศรีธรรมราช', 'Nan': 'น่าน', 'Narathiwat': 'นราธิวาส',
  'Nong Bua Lam Phu': 'หนองบัวลำภู', 'Nong Khai': 'หนองคาย', 'Nonthaburi': 'นนทบุรี',
  'Pathum Thani': 'ปทุมธานี', 'Pattani': 'ปัตตานี', 'Phangnga': 'พังงา',
  'Phatthalung': 'พัทลุง', 'Phayao': 'พะเยา', 'Phetchabun': 'เพชรบูรณ์',
  'Phetchaburi': 'เพชรบุรี', 'Phichit': 'พิจิตร', 'Phitsanulok': 'พิษณุโลก',
  'Phra Nakhon Si Ayutthaya': 'พระนครศรีอยุธยา', 'Phrae': 'แพร่', 'Phuket': 'ภูเก็ต',
  'Prachin Buri': 'ปราจีนบุรี', 'Prachuap Khiri Khan': 'ประจวบคีรีขันธ์',
  'Ranong': 'ระนอง', 'Ratchaburi': 'ราชบุรี', 'Rayong': 'ระยอง', 'Roi Et': 'ร้อยเอ็ด',
  'Sa Kaeo': 'สระแก้ว', 'Sakon Nakhon': 'สกลนคร', 'Samut Prakan': 'สมุทรปราการ',
  'Samut Sakhon': 'สมุทรสาคร', 'Samut Songkhram': 'สมุทรสงคราม', 'Saraburi': 'สระบุรี',
  'Satun': 'สตูล', 'Si Sa Ket': 'ศรีสะเกษ', 'Sing Buri': 'สิงห์บุรี',
  'Songkhla': 'สงขลา', 'Sukhothai': 'สุโขทัย', 'Suphan Buri': 'สุพรรณบุรี',
  'Surat Thani': 'สุราษฎร์ธานี', 'Surin': 'สุรินทร์', 'Tak': 'ตาก',
  'Trang': 'ตรัง', 'Trat': 'ตราด', 'Ubon Ratchathani': 'อุบลราชธานี',
  'Udon Thani': 'อุดรธานี', 'Uthai Thani': 'อุทัยธานี', 'Uttaradit': 'อุตรดิตถ์',
  'Yala': 'ยะลา', 'Yasothon': 'ยโสธร',
};

function provinceNameToSlug(name: string): string {
  const overrides: Record<string, string> = {
    'Bangkok Metropolis': 'bangkok',
    'Phra Nakhon Si Ayutthaya': 'phra-nakhon-si-ayutthaya',
    'Nakhon Ratchasima': 'nakhon-ratchasima',
  };
  return overrides[name] ?? name.toLowerCase().replace(/\s+/g, '-');
}

function provinceThai(name: string): string {
  return PROVINCE_THAI[name] ?? name;
}

function enrichBoundaries(raw: BoundaryCollection): BoundaryCollection {
  return {
    ...raw,
    features: raw.features.map((f) => {
      const name = String(f.properties?.name ?? '');
      const region: RegionKey = PROVINCE_REGION[name] ?? 'central';
      return { ...f, properties: { ...f.properties, region, slug: provinceNameToSlug(name) } };
    }),
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardMap({ stations = [], scope, onSelectStation, searchOrigin, useViewportLoad = false }: DashboardMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const router = useRouter();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [popupStation, setPopupStation] = useState<Station | null>(null);
  const [logoFailures, setLogoFailures] = useState<Record<number, boolean>>({});
  const [rawBoundaries, setRawBoundaries] = useState<BoundaryCollection>(EMPTY_BOUNDARY_SOURCE);
  const [districts, setDistricts] = useState<BoundaryCollection>(EMPTY_BOUNDARY_SOURCE);
  const [selectedRegion, setSelectedRegion] = useState<RegionKey | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [mapZoom, setMapZoom] = useState(5.5);
  const prevSelectedRegion = useRef<RegionKey | null>(null);
  const [routeLine, setRouteLine] = useState<FeatureCollection<LineString, GeoJsonProperties> | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [viewportStations, setViewportStations] = useState<Station[]>([]);
  const [viewportLoading, setViewportLoading] = useState(false);
  const viewportDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchViewport = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const bounds = map.getBounds();
    if (!bounds) return;
    if (viewportDebounce.current) clearTimeout(viewportDebounce.current);
    viewportDebounce.current = setTimeout(() => {
      setViewportLoading(true);
      getViewportStations({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
        limit: 2000,
      })
        .then((s) => setViewportStations(s))
        .catch(() => {})
        .finally(() => setViewportLoading(false));
    }, 600);
  }, []);

  const displayedStations = useViewportLoad ? viewportStations : stations;

  // Load + enrich province GeoJSON
  useEffect(() => {
    let active = true;
    fetch('/thailand-boundaries.geojson')
      .then((r) => r.json())
      .then((data) => { if (active) setRawBoundaries(enrichBoundaries(data as BoundaryCollection)); })
      .catch(() => { if (active) setRawBoundaries(EMPTY_BOUNDARY_SOURCE); });
    return () => { active = false; };
  }, []);

  // Load district GeoJSON (lazy — loaded after province data)
  useEffect(() => {
    let active = true;
    fetch('/thailand-districts.geojson')
      .then((r) => r.json())
      .then((data) => { if (active) setDistricts(data as BoundaryCollection); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const boundaries = rawBoundaries;

  // Data-driven fill color expression based on region
  const fillColorExpr = useMemo(() => {
    const expr: unknown[] = ['match', ['get', 'region']];
    for (const key of REGION_ORDER) {
      const hex = REGION_META[key].color;
      expr.push(key, hex);
    }
    expr.push('#888888'); // fallback
    return expr as unknown as string;
  }, []);

  const fillOpacity = useMemo(() => {
    if (scope?.province_slug) {
      return ['case', ['==', ['get', 'slug'], scope.province_slug], 0.42, 0.05] as unknown as number;
    }
    if (selectedRegion) {
      return ['case', ['==', ['get', 'region'], selectedRegion], 0.28, 0.10] as unknown as number;
    }
    return 0.20;
  }, [selectedRegion, scope?.province_slug]);

  const lineOpacity = useMemo(() => {
    if (scope?.province_slug) {
      return ['case', ['==', ['get', 'slug'], scope.province_slug], 1.0, 0.12] as unknown as number;
    }
    if (selectedRegion) {
      return ['case', ['==', ['get', 'region'], selectedRegion], 1.0, 0.35] as unknown as number;
    }
    return 0.7;
  }, [selectedRegion, scope?.province_slug]);

  // Fly to selected region — only after user explicitly changes it (not on mount)
  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current;
    if (!map) return;
    const prev = prevSelectedRegion.current;
    prevSelectedRegion.current = selectedRegion;
    // Skip if nothing actually changed
    if (prev === selectedRegion) return;
    if (selectedRegion) {
      map.fitBounds(REGION_META[selectedRegion].bounds as LngLatBoundsLike, {
        padding: 48,
        duration: 900,
        maxZoom: 7.5,
      });
    } else {
      map.fitBounds(THAILAND_BOUNDS, { padding: 40, duration: 900, maxZoom: 5.8 });
    }
  }, [selectedRegion, mapLoaded]);

  // Zoom to province/district boundary from GeoJSON
  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current;
    if (!map || !scope || scope.level === 'national') return;

    // Try to fit province boundary from loaded GeoJSON
    if ((scope.level === 'province' || scope.level === 'district') && scope.province_slug && rawBoundaries.features.length > 0) {
      const feature = rawBoundaries.features.find(
        (f) => String(f.properties?.slug ?? '') === scope.province_slug,
      );
      if (feature?.geometry) {
        const bbox = geoBbox(feature.geometry as GeoJsonGeometry);
        if (bbox) {
          map.fitBounds(bbox, { padding: 64, duration: 1000, maxZoom: 10 });
          return;
        }
      }
    }

    // Region fallback
    if (scope.region) {
      const regionKey = scope.region.toLowerCase().replace(/\s+/g, '') as RegionKey;
      const meta = REGION_META[regionKey];
      if (meta) {
        map.fitBounds(meta.bounds as LngLatBoundsLike, { padding: 40, duration: 900, maxZoom: 8 });
        return;
      }
    }

    map.fitBounds(THAILAND_BOUNDS, { padding: 40, duration: 800, maxZoom: 5.8 });
  }, [scope, mapLoaded, rawBoundaries]);

  // Fly to searchOrigin
  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current;
    if (!map || !searchOrigin) return;
    map.flyTo({ center: [searchOrigin.lng, searchOrigin.lat], zoom: 12, duration: 1200 });
  }, [searchOrigin, mapLoaded]);

  // Fetch driving route from OSRM
  const fetchRoute = useCallback(async (station: Station) => {
    if (!searchOrigin) { setRouteLine(null); setRouteInfo(null); return; }
    setRouteLoading(true);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/`
        + `${searchOrigin.lng},${searchOrigin.lat};${station.lng},${station.lat}`
        + `?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json() as {
        routes: Array<{ distance: number; duration: number; geometry: LineString }>;
      };
      const route = data.routes[0];
      if (!route) return;
      setRouteLine({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: {}, geometry: route.geometry }],
      });
      setRouteInfo({
        distanceKm: route.distance / 1000,
        durationMin: route.duration / 60,
      });
    } catch {
      setRouteLine(null);
      setRouteInfo(null);
    } finally {
      setRouteLoading(false);
    }
  }, [searchOrigin]);

  const handleMapClick = useCallback((event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (!feature) return;

    // Click on MVT station logo — fetch full detail and show popup
    if (feature.layer?.id === 'mvt-logos') {
      const props = feature.properties ?? {};
      const stationId: number = props.id;
      if (!stationId) return;
      void fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'}/api/stations/${stationId}`)
        .then((r) => r.json())
        .then((data) => {
          if (!data?.station) return;
          const s = data.station;
          const station: Station = {
            id: s.station_id ?? s.id,
            name: s.station_name ?? s.name,
            brand: s.brand,
            brand_key: s.brand,
            region: s.region ?? '',
            province_name: s.province ?? '',
            province_slug: s.province_slug ?? '',
            district_name: s.district ?? '',
            district_slug: s.district_slug ?? '',
            address: s.address ?? '',
            lat: s.latitude,
            lng: s.longitude,
            last_updated: s.last_updated ?? new Date().toISOString(),
            status: props.status ?? 'unknown',
            fuels: (s.fuel_statuses ?? []).map((f: { fuel_type: string; inventory_level: string; amount_liters: number; price_per_liter: number }) => ({
              fuel_type: f.fuel_type,
              status: f.inventory_level,
              liters: f.amount_liters,
              price: f.price_per_liter,
            })),
          };
          setPopupStation(station);
          mapRef.current?.flyTo({ center: [station.lng, station.lat], zoom: 15, duration: 700 });
          void fetchRoute(station);
        });
      return;
    }

    // Click on province fill layer
    const slug = String(feature.properties?.slug ?? '');
    if (slug) router.push(`/province/${slug}`);
  }, [router, fetchRoute]);

  const handleProvinceHover = useCallback((event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    setHoveredProvince(feature ? String(feature.properties?.name ?? '') : null);
  }, []);

  const handleProvinceLeave = useCallback(() => {
    setHoveredProvince(null);
  }, []);

  const handleRegionClick = useCallback((key: RegionKey) => {
    setSelectedRegion((prev) => (prev === key ? null : key));
  }, []);

  // Search radius polygon
  const searchRadiusCollection = useMemo(() => {
    if (!searchOrigin) return null;
    const { lng, lat, radiusKm } = searchOrigin;
    const coords = createCircleCoords(lng, lat, radiusKm);
    return {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } }],
    } as BoundaryCollection;
  }, [searchOrigin]);

  return (
    <div className="map-shell maplibre-shell">

      <Map
        ref={mapRef}
        initialViewState={THAILAND_CENTER}
        mapStyle={MAP_STYLE}
        attributionControl={false}
        dragRotate={false}
        pitchWithRotate={false}
        style={{ width: '100%', height: '100%' }}
        interactiveLayerIds={mapZoom >= 5 && mapZoom < 12 ? ['province-fill', 'mvt-logos'] : ['province-fill']}
        onClick={handleMapClick}
        onMouseMove={handleProvinceHover}
        onMouseLeave={handleProvinceLeave}
        cursor={hoveredProvince ? 'pointer' : 'grab'}
        onZoom={(e) => setMapZoom(e.viewState.zoom)}
        onIdle={() => { if (useViewportLoad) fetchViewport(); }}
        onLoad={() => {
          const map = mapRef.current;
          if (map) {
            map.fitBounds(THAILAND_BOUNDS, { padding: 24, duration: 0 });

            // Composite icon generator: dark rounded-square bg + brand logo + status dot
            const BRAND_LOGOS: Record<string, string> = {
              PTT: '/brands/ptt.png',
              Shell: '/brands/shell.png',
              Bangchak: '/brands/bangchak.png',
              Caltex: '/brands/caltex.png',
              IRPC: '/brands/irpc.png',
              PT: '/brands/pt.png',
              SUSCO: '/brands/susco.png',
              Esso: '/brands/fallback.svg',
              Other: '/brands/fallback.svg',
            };
            const MVT_STATUS_COLORS: Record<string, string> = {
              out: '#ff4f70', low: '#ffd166', refilling: '#32d9ff', ok: '#2fe08d', unknown: '#888888',
            };

            map.on('styleimagemissing', (e: { id: string }) => {
              const id = e.id;
              if (!id.startsWith('brand-') || map.hasImage(id)) return;

              // ID format: "brand-{BrandName}-{status}"
              const withoutPrefix = id.slice('brand-'.length);
              let brand = withoutPrefix;
              let status = 'ok';
              for (const s of Object.keys(MVT_STATUS_COLORS)) {
                if (withoutPrefix.endsWith(`-${s}`)) {
                  brand = withoutPrefix.slice(0, withoutPrefix.length - s.length - 1);
                  status = s;
                  break;
                }
              }

              const logoUrl = (brand !== 'Other' && BRAND_LOGOS[brand]) ? BRAND_LOGOS[brand] : null;
              const statusColor = MVT_STATUS_COLORS[status] ?? '#2fe08d';
              // Pin icon: circle head + triangular tail
              const W = 52, H = 68;
              const CX = W / 2;        // 26 — horizontal center
              const HR = 21;           // head circle radius
              const HY = HR + 3;       // head circle center Y = 24
              const TIP_Y = H - 2;     // tip of tail = 66
              const TAIL_W = 9;        // half-width of tail base

              const canvas = document.createElement('canvas');
              canvas.width = W; canvas.height = H;
              const ctx = canvas.getContext('2d');
              if (!ctx) return;

              function commit() {
                if (!map || map.hasImage(id)) return;
                const d = ctx!.getImageData(0, 0, W, H);
                map.addImage(id, { width: W, height: H, data: new Uint8Array(d.data.buffer) });
              }

              function renderIcon(logoImg?: HTMLImageElement) {
                ctx!.clearRect(0, 0, W, H);

                // 1. Dark circle head (semi-transparent)
                ctx!.globalAlpha = 0.68;
                ctx!.fillStyle = '#0d1117';
                ctx!.beginPath();
                ctx!.arc(CX, HY, HR, 0, Math.PI * 2);
                ctx!.fill();

                // 2. Dark triangular tail
                const tailBaseY = HY + HR - 4;
                ctx!.beginPath();
                ctx!.moveTo(CX - TAIL_W, tailBaseY);
                ctx!.lineTo(CX, TIP_Y);
                ctx!.lineTo(CX + TAIL_W, tailBaseY);
                ctx!.closePath();
                ctx!.fill();

                // 3. Logo clipped to inner circle
                if (logoImg) {
                  ctx!.save();
                  ctx!.beginPath();
                  ctx!.arc(CX, HY, HR - 3, 0, Math.PI * 2);
                  ctx!.clip();
                  ctx!.globalAlpha = 1;
                  ctx!.drawImage(logoImg, CX - (HR - 3), HY - (HR - 3), (HR - 3) * 2, (HR - 3) * 2);
                  ctx!.restore();
                } else {
                  ctx!.globalAlpha = 1;
                  ctx!.fillStyle = 'rgba(255,255,255,0.85)';
                  ctx!.font = 'bold 14px sans-serif';
                  ctx!.textAlign = 'center';
                  ctx!.textBaseline = 'middle';
                  ctx!.fillText(brand.slice(0, 2).toUpperCase(), CX, HY);
                }

                // 4. Status dot (top-right of circle head)
                const dotX = CX + HR * 0.65, dotY = HY - HR * 0.65;
                ctx!.globalAlpha = 1;
                ctx!.beginPath();
                ctx!.arc(dotX, dotY, 5.5, 0, Math.PI * 2);
                ctx!.fillStyle = statusColor;
                ctx!.fill();
                ctx!.strokeStyle = '#0d1117';
                ctx!.lineWidth = 1.5;
                ctx!.stroke();

                // 5. Colored ring around circle head — drawn last for crisp edge
                ctx!.globalAlpha = 0.82;
                ctx!.strokeStyle = statusColor;
                ctx!.lineWidth = 2.5;
                ctx!.beginPath();
                ctx!.arc(CX, HY, HR, 0, Math.PI * 2);
                ctx!.stroke();
                ctx!.globalAlpha = 1;

                commit();
              }

              if (!logoUrl) { renderIcon(); return; }
              const img = new window.Image();
              img.onload = () => renderIcon(img);
              img.onerror = () => renderIcon();
              img.src = logoUrl;
            });
          }
          setMapLoaded(true);
          if (useViewportLoad) fetchViewport();
        }}
        transformRequest={(url: string) => {
          if (VALLARIS_API_KEY && url.includes('vallarismaps.com') && !url.includes('api_key=')) {
            const sep = url.includes('?') ? '&' : '?';
            return { url: `${url}${sep}api_key=${VALLARIS_API_KEY}` };
          }
          return { url };
        }}
      >
        <NavigationControl position="top-right" showCompass={false} visualizePitch={false} />

        {/* District lines — visible at zoom ≥ 7 */}
        <Source id="districts" type="geojson" data={districts}>
          <Layer
            id="district-line"
            type="line"
            minzoom={7}
            paint={{
              'line-color': 'rgba(255,255,255,0.25)',
              'line-width': ['interpolate', ['linear'], ['zoom'], 7, 0.5, 10, 1.2] as unknown as number,
              'line-dasharray': [2, 2] as [number, number],
            }}
          />
        </Source>

        {/* Province fill — colored by region */}
        <Source id="provinces" type="geojson" data={boundaries}>
          <Layer
            id="province-fill"
            type="fill"
            paint={{
              'fill-color': fillColorExpr,
              'fill-opacity': fillOpacity,
            }}
          />
          <Layer
            id="province-line"
            type="line"
            paint={{
              'line-color': fillColorExpr,
              'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.8, 6, 1.2, 8, 2] as unknown as number,
              'line-opacity': lineOpacity,
            }}
          />
          {/* Hover highlight */}
          {hoveredProvince && (
            <Layer
              id="province-hover"
              type="fill"
              filter={['==', ['get', 'name'], hoveredProvince]}
              paint={{ 'fill-color': '#ffffff', 'fill-opacity': 0.15 }}
            />
          )}
          {/* Selected province glow */}
          {scope?.province_slug && (
            <Layer
              id="province-selected-glow"
              type="line"
              filter={['==', ['get', 'slug'], scope.province_slug]}
              paint={{
                'line-color': '#ffffff',
                'line-width': ['interpolate', ['linear'], ['zoom'], 4, 2, 8, 3.5] as unknown as number,
                'line-opacity': 0.85,
                'line-blur': 1,
              }}
            />
          )}
        </Source>

        {/* Search radius ring */}
        {searchRadiusCollection && (
          <Source id="search-radius" type="geojson" data={searchRadiusCollection}>
            <Layer id="search-radius-fill" type="fill" paint={{ 'fill-color': '#ff8a00', 'fill-opacity': 0.08 }} />
            <Layer id="search-radius-line" type="line" paint={{ 'line-color': '#ff9a3d', 'line-width': 2, 'line-opacity': 0.8, 'line-dasharray': [1.5, 1.5] as [number, number] }} />
          </Source>
        )}

        {/* Driving route line */}
        {routeLine && (
          <Source id="route-line" type="geojson" data={routeLine}>
            <Layer id="route-casing" type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{ 'line-color': '#000', 'line-width': 6, 'line-opacity': 0.25 }} />
            <Layer id="route-fill" type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{ 'line-color': '#4a9ee8', 'line-width': 4, 'line-opacity': 0.9 }} />
          </Source>
        )}

        {/* ── Vector tile layer (zoom < 12) — GPU rendered, no DOM overhead ── */}
        {mapZoom < 12 && (
          <Source
            id="stations-mvt"
            type="vector"
            tiles={[`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'}/api/tiles/{z}/{x}/{y}`]}
            minzoom={0}
            maxzoom={14}
          >
            {/* Brand logo symbols
                zoom < 7  → show ~30% (id % 10 < 3) to avoid national-view clutter
                zoom ≥ 7  → show all with collision detection                      */}
            <Layer
              id="mvt-logos"
              type="symbol"
              source-layer="stations"
              minzoom={5}
              filter={['case',
                ['>=', ['zoom'], 7], true,
                ['<', ['%', ['to-number', ['get', 'id']], 10], 3], true,
                false,
              ]}
              layout={{
                'icon-image': ['concat', 'brand-', ['get', 'brand'], '-', ['get', 'status']],
                'icon-size': ['interpolate', ['linear'], ['zoom'], 5, 0.2, 7, 0.3, 9, 0.42, 11, 0.62],
                'icon-anchor': 'bottom',
                'icon-allow-overlap': false,
                'icon-ignore-placement': false,
                'icon-padding': 6,
              }}
              paint={{
                'icon-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0.6, 7, 0.8, 8, 1],
              }}
            />
          </Source>
        )}

        {/* Current location pin */}
        {searchOrigin && (
          <Marker longitude={searchOrigin.lng} latitude={searchOrigin.lat} anchor="center">
            <div className="map-my-location">
              <div className="map-my-location-ring" />
              <div className="map-my-location-dot" />
            </div>
          </Marker>
        )}

        {/* Station markers — only rendered when zoomed in enough (tiles handle zoom < 12) */}
        {mapZoom >= 12 && displayedStations.map((station, index) => {
          const worst = getWorstFuelStatus(station);
          const tone = STATUS_TONE[worst];
          const showFallback = logoFailures[station.id];
          const logoSrc = getBrandLogoUrl(station.brand);
          // Show full detail card only when zoomed in close enough to the station
          const isCard = mapZoom >= 15;
          const isSmall = !isCard && !scope?.province_slug && mapZoom < 9;

          return (
            <Marker key={`${station.id}-${index}`} longitude={station.lng} latitude={station.lat} anchor="bottom">
              <button
                type="button"
                className={isCard ? 'map-station-card' : `map-station-marker${isSmall ? ' map-station-marker--sm' : ''}`}
                style={{ '--marker-color': tone.color, '--marker-glow': tone.glow } as React.CSSProperties}
                onClick={(e) => {
                  e.stopPropagation();
                  const next = popupStation?.id === station.id ? null : station;
                  setPopupStation(next);
                  if (next) {
                    mapRef.current?.flyTo({ center: [station.lng, station.lat], zoom: 15, duration: 700 });
                    void fetchRoute(next);
                  } else {
                    setRouteLine(null);
                    setRouteInfo(null);
                  }
                  onSelectStation?.(station);
                }}
                aria-label={`สถานี ${station.name}`}
              >
                {isCard ? (
                  <>
                    <div className="map-station-card-head">
                      <div className="map-station-card-logo-wrap">
                        {!showFallback ? (
                          <Image src={logoSrc || '/brands/fallback.svg'} alt={station.brand} width={20} height={20} unoptimized
                            onError={() => setLogoFailures((c) => ({ ...c, [station.id]: true }))} />
                        ) : (
                          <span className="map-station-card-fallback">{(station.brand_key || station.brand).slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <span className="map-station-card-name">{station.name.length > 14 ? station.name.slice(0, 14) + '…' : station.name}</span>
                      <span className={`map-station-card-status-icon sc-${worst}`} />
                    </div>
                    <div className="map-station-card-fuels">
                      {station.fuels.slice(0, 4).map((f, fi) => {
                        const fm = getFuelMeta(f.fuel_type);
                        return (
                          <span key={fi} className={`map-fuel-badge fb-${f.status}`}
                            style={{ '--fuel-color': fm.color } as React.CSSProperties}>
                            {fm.abbr}
                          </span>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <span className="map-station-marker-bubble">
                    <span className="map-station-marker-pulse" />
                    <span className="map-station-marker-core">
                      {!showFallback ? (
                        <Image src={logoSrc || '/brands/fallback.svg'} alt={station.brand} width={20} height={20}
                          className="map-station-marker-logo" unoptimized
                          onError={() => setLogoFailures((c) => ({ ...c, [station.id]: true }))} />
                      ) : (
                        <span className="map-station-marker-fallback">{(station.brand_key || station.brand).slice(0, 2).toUpperCase()}</span>
                      )}
                    </span>
                  </span>
                )}
              </button>
            </Marker>
          );
        })}

      </Map>

      {/* ── Station detail bottom bar ── */}
      {popupStation && (() => {
        const distKm = routeInfo?.distanceKm
          ?? (searchOrigin ? haversineKm(searchOrigin.lat, searchOrigin.lng, popupStation.lat, popupStation.lng) : null);
        const pct = distKm != null ? distToPercent(distKm) : null;
        const zoneName = distKm != null
          ? (distKm <= 5 ? 'ใกล้มาก' : distKm <= 15 ? 'ใกล้' : distKm <= 30 ? 'ปานกลาง' : 'ไกล')
          : null;
        const statusLabel = STATUS_TONE[popupStation.status as FuelLevel]?.label ?? popupStation.status;
        const closeBar = () => { setPopupStation(null); setRouteLine(null); setRouteInfo(null); };
        return (
          <div className="map-bottom-bar">
            {/* Header row */}
            <div className="map-bb-head">
              <div className="map-bb-logo">
                <Image src={getBrandLogoUrl(popupStation.brand)} alt={popupStation.brand}
                  width={36} height={36} unoptimized
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              </div>
              <div className="map-bb-info">
                <strong className="map-bb-name">{popupStation.name}</strong>
                <span className="map-bb-loc">{popupStation.district_name} · {popupStation.province_name}</span>
              </div>
              <span className={`map-bb-badge bb-badge-${popupStation.status}`}>{statusLabel}</span>
              <button type="button" className="map-bb-close" onClick={closeBar} aria-label="ปิด">
                <X size={15} />
              </button>
            </div>

            {/* Fuel badges */}
            <div className="map-bb-fuels">
              {popupStation.fuels.slice(0, 6).map((f, i) => {
                const fm = getFuelMeta(f.fuel_type);
                return (
                  <span key={i} className={`map-bb-fuel fb-${f.status}`}
                    style={{ '--fuel-color': fm.color } as React.CSSProperties}>
                    <span className="map-bb-fuel-abbr">{fm.abbr}</span>
                    <span className="map-bb-fuel-l">{f.liters >= 1000 ? `${(f.liters / 1000).toFixed(1)}k` : f.liters}L</span>
                  </span>
                );
              })}
            </div>

            {/* Distance range bar */}
            {pct != null && (
              <div className="map-bb-range">
                <div className="map-bb-range-track">
                  <div className="map-bb-rz map-bb-rz--near" />
                  <div className="map-bb-rz map-bb-rz--mid" />
                  <div className="map-bb-rz map-bb-rz--far" />
                  <div className="map-bb-rz map-bb-rz--xfar" />
                  <div className="map-bb-range-ptr" style={{ left: `${pct}%` }} />
                </div>
                <div className="map-bb-range-labels">
                  <span>0</span><span>5</span><span>15</span><span>30</span><span>50+</span>
                </div>
                <div className="map-bb-range-zones">
                  <span>ใกล้มาก</span><span>ใกล้</span><span>ปานกลาง</span><span>ไกล</span>
                </div>
              </div>
            )}

            {/* Footer: route stats + nav */}
            <div className="map-bb-footer">
              <div className="map-bb-stats">
                {routeLoading && <span className="map-bb-loading">กำลังคำนวณเส้นทาง…</span>}
                {!routeLoading && routeInfo && (
                  <>
                    <span className="map-bb-stat">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6l9-3 9 3M3 18l9 3 9-3"/></svg>
                      {routeInfo.distanceKm.toFixed(1)} กม.
                    </span>
                    <span className="map-bb-stat">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      {routeInfo.durationMin < 60
                        ? `${Math.round(routeInfo.durationMin)} นาที`
                        : `${Math.floor(routeInfo.durationMin / 60)} ชม. ${Math.round(routeInfo.durationMin % 60)} นาที`}
                    </span>
                    {zoneName && <span className="map-bb-zone-chip">{zoneName}</span>}
                  </>
                )}
                {!routeLoading && !routeInfo && distKm != null && (
                  <>
                    <span className="map-bb-stat">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6l9-3 9 3M3 18l9 3 9-3"/></svg>
                      ~{distKm.toFixed(1)} กม.
                    </span>
                    {zoneName && <span className="map-bb-zone-chip">{zoneName}</span>}
                  </>
                )}
              </div>
              <div className="map-bb-actions">
                {searchOrigin && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&origin=${searchOrigin.lat},${searchOrigin.lng}&destination=${popupStation.lat},${popupStation.lng}&travelmode=driving`}
                    target="_blank" rel="noopener noreferrer"
                    className="map-bb-nav-btn"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>
                    นำทาง
                  </a>
                )}
                <Link href={`/staff/update?station_id=${popupStation.id}&name=${encodeURIComponent(popupStation.name)}`}
                  className="map-bb-edit-btn">บันทึก</Link>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Region selector overlay ── */}
      <div className="map-region-bar">
        <button
          type="button"
          className={`map-region-chip ${!selectedRegion ? 'active' : ''}`}
          onClick={() => setSelectedRegion(null)}
          style={{ '--chip-color': '#67a6ff' } as React.CSSProperties}
        >
          ทั้งประเทศ
        </button>
        {REGION_ORDER.map((key) => (
          <button
            key={key}
            type="button"
            className={`map-region-chip ${selectedRegion === key ? 'active' : ''}`}
            style={{ '--chip-color': REGION_META[key].color } as React.CSSProperties}
            onClick={() => handleRegionClick(key)}
          >
            <span className="map-region-dot" style={{ background: REGION_META[key].color }} />
            {REGION_META[key].label}
          </button>
        ))}
      </div>

      {/* ── Hover province tooltip ── */}
      {hoveredProvince && (
        <div className="map-province-tooltip">
          {provinceThai(hoveredProvince)}
          <span className="map-province-tooltip-hint">คลิกเพื่อดูภาพรวมจังหวัด</span>
        </div>
      )}

      {/* ── HUD ── */}
      <div className="map-shell-hud">
        <div className="map-shell-hud-chip">
          <span className="map-shell-hud-dot" />
          {selectedRegion ? REGION_META[selectedRegion].label : 'แผนที่ประเทศไทย'}
        </div>
        <div className="map-shell-hud-chip map-shell-hud-chip--ghost">{displayedStations.length.toLocaleString()} สถานี</div>
      </div>
      {useViewportLoad && viewportLoading && (
        <div className="map-viewport-loading">กำลังโหลด…</div>
      )}
    </div>
  );
}

// ── Distance helpers ──────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Non-linear 0-100% mapping: 0–5 km → 0–25%, 5–15 → 25–50%, 15–30 → 50–75%, 30–50+ → 75–100% */
function distToPercent(km: number): number {
  if (km <= 5)  return (km / 5) * 25;
  if (km <= 15) return 25 + ((km - 5) / 10) * 25;
  if (km <= 30) return 50 + ((km - 15) / 15) * 25;
  return Math.min(75 + ((km - 30) / 20) * 25, 100);
}

// ── Geo bbox helper ───────────────────────────────────────────────────────────

type GeoJsonGeometry = Polygon | MultiPolygon;

function geoBbox(geometry: GeoJsonGeometry): LngLatBoundsLike | null {
  const pts: [number, number][] = [];
  if (geometry.type === 'Polygon') {
    for (const [lng, lat] of geometry.coordinates[0]) pts.push([lng, lat]);
  } else {
    for (const poly of geometry.coordinates) {
      for (const [lng, lat] of poly[0]) pts.push([lng, lat]);
    }
  }
  if (pts.length === 0) return null;
  let minLng = pts[0][0], maxLng = pts[0][0], minLat = pts[0][1], maxLat = pts[0][1];
  for (const [lng, lat] of pts) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return [[minLng, minLat], [maxLng, maxLat]];
}

// ── Circle polygon helper ─────────────────────────────────────────────────────

function createCircleCoords(centerLng: number, centerLat: number, radiusKm: number, steps = 64): [number, number][] {
  const earthR = 6371;
  const lat = (centerLat * Math.PI) / 180;
  const lng = (centerLng * Math.PI) / 180;
  const d = radiusKm / earthR;
  const coords: [number, number][] = [];

  for (let i = 0; i <= steps; i++) {
    const bearing = (i / steps) * Math.PI * 2;
    const sinLat = Math.sin(lat);
    const cosLat = Math.cos(lat);
    const newLat = Math.asin(sinLat * Math.cos(d) + cosLat * Math.sin(d) * Math.cos(bearing));
    const newLng = lng + Math.atan2(Math.sin(bearing) * Math.sin(d) * cosLat, Math.cos(d) - sinLat * Math.sin(newLat));
    coords.push([(newLng * 180) / Math.PI, (newLat * 180) / Math.PI]);
  }

  return coords;
}
