import { ReactNode } from "react";
import { X } from "lucide-react";
import clsx from "clsx";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  widthClass?: string; 
  className?: string;
};

export function Sidebar({
  open,
  onClose,
  title,
  children,
  widthClass = "w-96",
  className,
}: SidebarProps) {
  return (
    <div
      className={clsx(
        "fixed top-0 right-0 h-full z-50 transition-transform duration-300 bg-white shadow-xl",
        widthClass,
        open ? "translate-x-0" : "translate-x-full",
        className
      )}
      aria-hidden={!open}
    >
      <div className="flex items-center justify-between p-4 border-b">
        {title && <h2 className="text-lg font-bold">{title}</h2>}
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="overflow-y-auto h-[calc(100%-64px)] p-4">{children}</div>
    </div>
  );
}
