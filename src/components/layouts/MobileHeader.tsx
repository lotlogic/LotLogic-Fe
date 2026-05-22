import { brand } from "@/constants/content";

export const MobileHeader = () => {
  const handleLogoClick = () => {
    window.location.href = "/";
  };

  return (
    <header className="w-full flex items-center justify-center h-[60px] px-4 bg-white shadow-sm z-50">
      {/* Logo - Centered */}
      <div
        onClick={handleLogoClick}
        className="cursor-pointer hover:opacity-80 transition-opacity flex items-center"
      >
        <img src={brand.logo} alt={brand.logoAlt} className="h-7 w-auto" />
      </div>
    </header>
  );
};

export default MobileHeader;
