import { toast, ToastOptions } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

type ToastType = 'success' | 'error' | 'info' | 'warn';

interface ShowToastProps {
  message: string;
  type?: ToastType;
  options?: ToastOptions;
}

export function showToast({
  message,
  type = 'success',
  options = {},
}: ShowToastProps) {
  const toastFn = toast[type] ?? toast.success;

  toastFn(message, {
    ...options,
  });
}