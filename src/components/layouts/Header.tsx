import Image from "next/image";

export default function Header() {
  return (
    <header className="w-full flex items-center h-[60px] px-8 bg-white shadow z-50">
      <Image src="/images/logo.png" alt="LotLogic Logo" width={40} height={40} />
      <span className="ml-3 text-2xl font-bold text-[#1A3A2D] tracking-tight">LOTLOGIC</span>
    </header>
  );
}
