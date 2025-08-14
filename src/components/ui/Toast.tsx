import { toast } from 'react-toastify';
import type { ToastOptions } from 'react-toastify';
import { Check, X, AlertTriangle } from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';

type ToastType = 'success' | 'error' | 'warning';

interface ShowToastProps {
  message: string;
  type?: ToastType;
  options?: ToastOptions;
}

const getToastIcon = (type: ToastType) => {
  const baseClasses = "w-6 h-6 p-1 rounded-full flex items-center justify-center";
  
  switch (type) {
    case 'success':
      return (
        <div className={`${baseClasses} bg-[#345B5B]`}>
          <Check className="w-4 h-4 text-white" strokeWidth={3} />
        </div>
      );
    case 'error':
      return (
        <div className={`${baseClasses} bg-red-600`}>
          <X className="w-4 h-4 text-white" strokeWidth={3} />
        </div>
      );
    case 'warning':
      return (
        <div className={`${baseClasses} bg-yellow-500`}>
          <AlertTriangle className="w-4 h-4 text-white" strokeWidth={3} />
        </div>
      );
    default:
      return null;
  }
};

export function showToast({
  message,
  type = 'success',
  options = {},
}: ShowToastProps) {
  const toastFn = toast[type] ?? toast.success;

  toastFn(
    <div className="flex items-center gap-3">
      {getToastIcon(type)}
      <span className="text-[#345B5B] font-medium">{message}</span>
    </div>,
    {
      position: 'bottom-right',
      autoClose: 3000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      style: {
        backgroundColor: 'white',
        border: '1px solid #345B5B',
        borderRadius: '12px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      },
      ...options,
    }
  );
}