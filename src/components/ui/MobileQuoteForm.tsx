import React, { useState } from 'react';
import { TextModal } from '@/components/ui/DynamicModal';
import { colors } from '@/constants/content';
import { ArrowLeft, ChevronDown } from 'lucide-react';

interface MobileQuoteFormProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  onSubmit: (formData: QuoteFormData) => void;
  selectedLot?: {
    id: string;
    suburb: string;
  };
  selectedDesign?: {
    name: string;
    size: string;
    facade: string;
  };
  className?: string;
}

interface QuoteFormData {
  builders: string[];
  additionalComments: string;
  termsAccepted: boolean;
}

export function MobileQuoteForm({
  isOpen,
  onClose,
  onBack,
  onSubmit,
  selectedLot,
  selectedDesign,
  className = ''
}: MobileQuoteFormProps) {
  const [formData, setFormData] = useState<QuoteFormData>({
    builders: [],
    additionalComments: '',
    termsAccepted: false
  });
  const [showTerms, setShowTerms] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // const handleBuilderToggle = (builder: string) => {
  //   setFormData(prev => ({
  //     ...prev,
  //     builders: prev.builders.includes(builder)
  //       ? prev.builders.filter(b => b !== builder)
  //       : [...prev.builders, builder]
  //   }));
  // };

  if (!isOpen) return null;

  return (
    <div className={`
      fixed inset-0 z-50 bg-white flex flex-col
      ${className}
    `}>
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
          <h1 className="text-xl font-bold text-gray-900">Get Building Cost Estimate</h1>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <span className="text-gray-600 text-xl">×</span>
        </button>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {/* Description */}
          <p className="text-gray-600 text-sm">
            Select builders and get cost estimates for your dream home
          </p>

          {/* Estimated Cost Banner (static example) */}
          {selectedDesign?.size && (
            <div className="rounded-2xl p-4" style={{ backgroundColor: '#BFCDCE' }}>
              <div className="text-gray-900 font-semibold text-base">Estimated Building Cost</div>
              <div className={"mt-1 text-2xl font-extrabold"} style={{ color: colors.primary }}>$100 – $150/sq ft</div>
              <div className="text-gray-500 text-sm mt-1">Average construction costs range</div>
            </div>
          )}

          {/* Builder Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Choose builders to get quotes from
            </label>
            <div className="relative">
              <button
                type="button"
                className="w-full p-3 border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between"
              >
                <span className="text-gray-500">
                  {formData.builders.length > 0 
                    ? `${formData.builders.length} builders selected`
                    : 'Select builders'
                  }
                </span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Additional Comments */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Additional Comments
            </label>
            <textarea
              value={formData.additionalComments}
              onChange={(e) => setFormData(prev => ({ ...prev, additionalComments: e.target.value }))}
              placeholder="Any specific requirements or questions?"
              className="w-full p-3 border border-gray-300 rounded-lg resize-none h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Your Selection */}
          {(selectedLot || selectedDesign) && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Your Selection</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex gap-3">
                  {/* Floor Plan Thumbnail */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-xs text-gray-500">Floor Plan</span>
                    </div>
                  </div>
                  
                  {/* Selection Details */}
                  <div className="flex-1">
                    {selectedLot && (
                      <p className="text-sm font-medium text-gray-900">
                        Lot {selectedLot.id}, {selectedLot.suburb}
                      </p>
                    )}
                    {selectedDesign && (
                      <>
                        <p className="text-sm text-gray-600">
                          Floor Plan: {selectedDesign.name} ({selectedDesign.size})
                        </p>
                        <p className="text-sm text-gray-600">
                          Faced: {selectedDesign.facade}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Terms & Conditions */}
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.termsAccepted}
                onChange={(e) => setFormData(prev => ({ ...prev, termsAccepted: e.target.checked }))}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-sm text-gray-700">
                I agree to the{' '}
                <a href="#" className="text-blue-600 hover:underline" onClick={(e) => { e.preventDefault(); setShowTerms(true); }}>
                  Terms & Conditions
                </a>
              </span>
            </label>
          </div>
        </div>
      </form>

      {/* Action Button */}
      <div className="p-4 border-t border-gray-200">
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={!formData.termsAccepted}
          className="w-full bg-gray-800 text-white text-lg font-medium py-3 px-4 rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Get Cost Estimates
        </button>
      </div>

      <TextModal
        open={showTerms}
        onClose={() => setShowTerms(false)}
        title="Terms & Conditions"
        content={(
          <div className="prose max-w-none text-gray-700">
            <p>
              This is a sample Terms & Conditions placeholder.
            </p>
            <ul className="list-disc pl-5">
              <li>Quotes are indicative and subject to change.</li>
              <li>Availability of lots and designs may vary.</li>
              <li>Your data will be handled per our privacy policy.</li>
            </ul>
          </div>
        )}
      />
    </div>
  );
}
