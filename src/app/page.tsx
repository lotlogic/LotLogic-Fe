import Header from "@/components/layouts/Header";
import ZoneMap from "@/components/features/map/MapLayer";

export default function Home() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <Header />
      <div className="flex-1 relative">
        <ZoneMap />
      </div>
    </div>
  );
}
