'use client';

import React, { useRef, useEffect } from 'react';
import { X, BedDouble, Bath, Car, Building2, ExternalLink, Bookmark } from 'lucide-react';
import { SavedPropertiesSidebarProps } from '@/types/ui';
import { getZoningColor } from '@/lib/utils/zoning';
import { getOverlaysColor } from '@/lib/utils/overlays';

export function SavedPropertiesSidebar({ 
    open, 
    onClose, 
    savedProperties, 
    onViewDetails 
}: SavedPropertiesSidebarProps) {
    const sidebarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (open) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscapeKey);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscapeKey);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscapeKey);
        };

    }, [open, onClose]);

    const [clicked, setClicked] = React.useState(false);
    return (
        <div
            ref={sidebarRef}
            className={`absolute top-0 right-0 h-full w-[400px] bg-white shadow-lg z-30 transition-transform duration-300 ease-in-out
                ${open ? 'translate-x-0' : 'translate-x-full'}`}
        >
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Your Shortlist</h2>
                        <p className="text-sm text-gray-600 mt-1">List of properties that you&apos;ve shortlisted.</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-gray-900 hover:text-black-900 pb-6 rounded hover:bg-gray-100 transition-colors"
                    >
                        <X className="h-8 w-7" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto h-[calc(100%-80px)]">
                {savedProperties.length === 0 ? (
                    <div className="text-center py-8">
                        <Bookmark className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No saved properties</h3>
                        <p className="text-gray-600">Start exploring properties and save them to your shortlist.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {savedProperties.map((property) => (
                            <div key={property.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                {/* Lot Info Header */}
                                <div className="flex items-center justify-between">
                                    <div className="text-xs text-black">
                                        Lot ID: {property.lotId}, {property.suburb}, {property.address}
                                    </div>
                                        <Bookmark 
                                            className={`bookmark-btn h-6 w-5 text-[#2F5D62] ${clicked ? 'fill-white' : 'fill-[#2F5D62]'}`} 
                                            onClick={() => setClicked(!clicked)}
                                        />
                                </div>

                                {/* Lot Details */}
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="flex items-center gap-1 text-xs text-black">
                                        <ExternalLink className="h-4 w-4" />
                                        {property.size}m²
                                    </div>
                                    {property.zoning && 
                                        <span className="text-xs m-2 px-2 py-1 rounded-full text-black font-small"
                                            style={{ backgroundColor: getZoningColor(property.zoning) }}>{property.zoning}
                                        </span>
                                    }
                                    {property.overlays && (
                                        <span className="px-2 py-1 bg-[#00FFFF] text-black text-xs rounded-full"
                                            style={{ backgroundColor: getOverlaysColor(property.overlays) }}>
                                            {property.overlays}
                                        </span>
                                    )}
                                </div>

                                {/* House Design */}
                                <div className="flex gap-4">
                                    <img 
                                        src={property.houseDesign.image} 
                                        alt={property.houseDesign.title}
                                        className="w-16 h-16 rounded-lg object-cover"
                                    />
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-black text-sm">
                                            {property.houseDesign.title}
                                        </h4>
                                        <p className="text-xs text-black mb-2">Single Storey</p>
                                        <div className="flex items-center gap-3 text-xs text-black">
                                            <span className="flex items-center gap-1">
                                                <BedDouble className="h-3 w-3" />
                                                {property.houseDesign.bedrooms}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Bath className="h-3 w-3" />
                                                {property.houseDesign.bathrooms}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Car className="h-3 w-3" />
                                                {property.houseDesign.cars}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onViewDetails(property)}
                                        className="bg-[#2F5D62] text-white px-1 py-2.5 rounded-md text-sm font-medium hover:bg-[#1a3d42] transition-colors w-28 h-9 mt-12"
                                    >
                                        View Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
} 