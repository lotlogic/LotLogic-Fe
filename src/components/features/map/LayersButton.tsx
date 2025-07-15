'use client';

import React from 'react';
import { Layers } from 'lucide-react';

interface LayersButtonProps {
    onClick: () => void;
    isActive?: boolean;
}

export function LayersButton({ onClick, isActive = false }: LayersButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`p-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-[#2F5D62] focus:border-transparent ${isActive ? 'ring-2 ring-[#2F5D62] border-[#2F5D62]' : ''
                }`}
            aria-label="Toggle layers"
        >
            <Layers className="w-5 h-5" />
        </button>
    );
} 