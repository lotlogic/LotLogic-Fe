import { brand, colors } from "../../constants/content";

export default function Header() {
  const handleLogoClick = () => {
    window.location.href = '/';
  };

  return (
    <header className="w-full flex items-center h-[60px] px-8 bg-white shadow z-50">
      <div 
        onClick={handleLogoClick}
        className="cursor-pointer hover:opacity-80 transition-opacity flex items-center"
      >
        <img src={brand.logo} alt={brand.logoAlt} width={40} height={40} />
        <span className="ml-3 text-2xl font-bold tracking-tight" style={{ color: colors.primary }}>
          {brand.title}
        </span>
      </div>
    </header>
  );
}
