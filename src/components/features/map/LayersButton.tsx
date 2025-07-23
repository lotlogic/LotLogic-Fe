'use client';

import React from 'react';
import { Layers } from 'lucide-react';
import { LayersButtonProps } from '@/types/ui';
import { colors } from '@/constants/content';

export function LayersButton({ onClick, isActive = false }: LayersButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`p-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:border-transparent ${isActive ? 'ring-2 border-current' : ''
                }`}
            style={{
                '--tw-ring-color': colors.primary,
                '--tw-border-opacity': isActive ? '1' : '0',
                borderColor: isActive ? colors.primary : undefined,
            } as React.CSSProperties}
            aria-label="Toggle layers"
        >
            <Layers className="w-5 h-5" />
        </button>
    );
} 