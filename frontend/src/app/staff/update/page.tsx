import FuelStatusEditor from '@/components/FuelStatusEditor';
import StationPicker from '@/components/StationPicker';

interface StaffUpdatePageProps {
  searchParams: Promise<{ station_id?: string; name?: string }>;
}

export default async function StaffUpdatePage({ searchParams }: StaffUpdatePageProps) {
  const { station_id, name } = await searchParams;
  const stationId = station_id ? Number(station_id) : null;

  if (!stationId) {
    return (
      <main className="auth-page-shell">
        <StationPicker />
      </main>
    );
  }

  return (
    <main className="auth-page-shell">
      <FuelStatusEditor stationId={stationId} stationName={name} />
    </main>
  );
}
