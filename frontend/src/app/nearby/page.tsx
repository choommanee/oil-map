import MobileNearbyView from '@/components/MobileNearbyView';

export const metadata = {
  title: 'ปั้มน้ำมันใกล้คุณ',
  description: 'ค้นหาสถานีบริการน้ำมันที่มีน้ำมันใกล้ตำแหน่งคุณ',
};

export default function NearbyPage() {
  return <MobileNearbyView />;
}
