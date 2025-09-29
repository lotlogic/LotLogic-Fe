import { brand, colors } from "@/constants/content";

export default function MobileHeader() {
  const handleLogoClick = () => {
    window.location.href = '/';
  };

  return (
    <header className="w-full flex items-center justify-center h-[60px] px-4 bg-white shadow-sm z-50">
      {/* Logo - Centered */}
      <div 
        onClick={handleLogoClick}
        className="cursor-pointer hover:opacity-80 transition-opacity flex items-center"
      >
        <img src={brand.logo} alt={brand.logoAlt} width={32} height={32} />
        <span className="ml-2 text-xl font-bold tracking-tight" style={{ color: colors.primary }}>
          {brand.title}
        </span>
      </div>
    </header>
  );
}
