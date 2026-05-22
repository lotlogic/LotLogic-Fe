import { ArrowLeft, CheckCircle } from "lucide-react";

interface MobileSuccessScreenProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  title?: string;
  message?: string;
  showLotReservation?: boolean;
  lotId?: string;
  depositAmount?: string;
  onSecureLot?: () => void;
  onKeepExploring?: () => void;
  className?: string;
}

export const MobileSuccessScreen = ({
  isOpen,
  onClose,
  onBack,
  title = "Thank You!",
  message = "Your enquiry has been successfully submitted.",
  showLotReservation = false,
  lotId,
  depositAmount = "$1,000",
  onSecureLot,
  onKeepExploring,
  className = "",
}: MobileSuccessScreenProps) => {
  if (!isOpen) return null;

  return (
    <div
      className={`
      fixed inset-0 z-50 bg-white flex flex-col
      ${className}
    `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <span className="text-gray-600 text-xl">×</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Success Icon */}
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>

        {/* Success Message */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
          <p className="text-gray-600">{message}</p>
        </div>

        {/* Lot Reservation Section */}
        {showLotReservation && lotId && (
          <div className="w-full bg-gray-50 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Reserve Your Lot Today
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              Secure Lot {lotId} with a refundable deposit while you compare
              builder quotes
            </p>
            <div className="text-center mb-4">
              <span className="text-3xl font-bold text-gray-900">
                {depositAmount}
              </span>
            </div>
            <div className="space-y-3">
              <button
                onClick={onSecureLot}
                className="w-full bg-gray-800 text-white font-medium py-3 px-4 rounded-lg hover:bg-gray-900 transition-colors"
              >
                Secure this lot
              </button>
              <button
                onClick={onKeepExploring}
                className="w-full bg-white text-gray-800 font-medium py-3 px-4 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Keep Exploring
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileSuccessScreen;
