import { brand, colors } from "@/constants/content";
import { Bookmark, Home, Map, Settings, X } from "lucide-react";

interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNavigation = ({
  isOpen,
  onClose,
}: MobileNavigationProps) => {
  const navigationItems = [
    { icon: Map, label: "Map", href: "/" },
    { icon: Home, label: "House Designs", href: "/designs" },
    { icon: Bookmark, label: "Saved Properties", href: "/saved" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile Navigation Panel */}
      <div
        className={`
        fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-50 
        transform transition-transform duration-300 ease-in-out lg:hidden
        ${isOpen ? "translate-x-0" : "translate-x-full"}
      `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center">
            <img src={brand.logo} alt={brand.logoAlt} className="h-6 w-auto" />
            <span
              className="ml-2 text-lg font-semibold"
              style={{ color: colors.primary }}
            >
              Menu
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-4">
          <ul className="space-y-2">
            {navigationItems.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className="flex items-center px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={onClose}
                >
                  <item.icon className="h-5 w-5 mr-3 text-gray-600" />
                  <span className="text-gray-900 font-medium">
                    {item.label}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="text-center text-sm text-gray-500">
            © 2024 {brand.title}
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileNavigation;
