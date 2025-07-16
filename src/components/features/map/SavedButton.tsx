'use client';

import React from 'react';
import { Bookmark } from 'lucide-react';
import { SavedButtonProps } from '@/types/ui';

export function SavedButton({ onClick, isActive = false }: SavedButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`p-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-[#2F5D62] focus:border-transparent ${isActive ? 'ring-2 ring-[#2F5D62] border-[#2F5D62]' : ''
                }`}
            aria-label="View saved properties"
        >
            <Bookmark className="w-5 h-5" />
        </button>
    );
} 