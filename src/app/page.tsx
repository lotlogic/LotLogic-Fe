import Header from "@/components/layouts/Header";
import ZoneMap from "@/components/features/zoning/ZoneMap";

export default function Home() {
  return (
    <div className="h-screen w-screen flex flex-col">
      <Header />
      <div className="flex-1">
        <ZoneMap />
      </div>
    </div>
  );
}
