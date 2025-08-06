import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import type { MultiSelectProps } from '../../types/ui';
import { colors } from '../../constants/content';

export function MultiSelect({ 
  options, 
  selectedOptions, 
  onSelectionChange, 
  placeholder = "Choose options", 
  label,
  className = "" 
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOptionToggle = (optionId: string) => {
    const newSelection = selectedOptions.includes(optionId)
      ? selectedOptions.filter(id => id !== optionId)
      : [...selectedOptions, optionId];
    onSelectionChange(newSelection);
  };

  const selectedOptionsData = options.filter(option => selectedOptions.includes(option.id));
  const displayText = selectedOptions.length > 0 
    ? `${selectedOptions.length} Builders Selected` 
    : placeholder;

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full p-3 border rounded-lg shadow-sm focus:ring-[#2F5D62] focus:border-[#2F5D62] appearance-none bg-white pr-8 text-left ${
            isOpen 
              ? 'border-[#2F5D62]' 
              : 'border-gray-300'
          } ${
            selectedOptions.length > 0 
              ? 'text-gray-900' 
              : 'text-gray-500'
          }`}
        >
          {displayText}
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full top-0 mt-12 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {options.map((option) => (
              <div
                key={option.id}
                className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleOptionToggle(option.id)}
              >
                {/* Logo/Icon */}
                <div className="flex-shrink-0 mr-3">
                  {option.logo ? (
                    <img 
                      src={option.logo} 
                      alt={`${option.label} logo`} 
                      width={24}
                      height={24}
                      className="rounded-full object-cover"
                    />
                  ) : option.logoText ? (
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-700">
                      {option.logoText}
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-700">
                      {option.label.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Label */}
                <span className="flex-1 text-sm text-gray-900">
                  {option.label}
                </span>

                {/* Checkbox */}
                <div className="flex-shrink-0 ml-2">
                  <input
                    type="checkbox"
                    checked={selectedOptions.includes(option.id)}
                    onChange={() => handleOptionToggle(option.id)}
                    className="w-4 h-4 border-gray-300 rounded focus:ring-2"
                    style={{
                      '--tw-ring-color': colors.primary,
                      color: colors.primary,
                    } as React.CSSProperties}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Selected Chips */}
        {selectedOptionsData.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedOptionsData.map((option) => (
              <div
                key={option.id}
                className="inline-flex items-center gap-2 px-3 py-1 bg-[#2F5D62] text-white rounded-full text-sm"
              >
                <span>{option.label}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOptionToggle(option.id);
                  }}
                  className="hover:bg-[#1a3d42] rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 