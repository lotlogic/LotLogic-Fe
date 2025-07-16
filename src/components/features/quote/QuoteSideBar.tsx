import React, { useState } from 'react';
import { Button } from "@/components/ui/Button";
import { Sidebar } from "@/components/ui/Sidebar";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { GetYourQuoteSidebarProps } from "@/types/houseDesign";
import { builderOptions } from "@/constants/houseDesigns";

export function GetYourQuoteSidebar({ open, onClose, onBack, selectedHouseDesign, lotDetails }: GetYourQuoteSidebarProps) {
    const [selectedBuilders, setSelectedBuilders] = useState<string[]>([]);
    const [showThankYou, setShowThankYou] = useState(false);
    const [lotSecured, setLotSecured] = useState(false);
    
    if (!open) return null;

    const facedOption = selectedHouseDesign?.images[0]?.faced || 'N/A';



    const headerContent = (
        <>
            {showThankYou || lotSecured ? (
                // Show lot info in header for thank you screens
                <>
                    <h2 className="text-2xl font-medium text-[#000000]">
                        {lotSecured ? '' : ''}
                    </h2>
                    {selectedHouseDesign && (
                        <div >
                            <div className="p-1 flex gap-4 items-center">
                                <img src={selectedHouseDesign.image} alt="House" className="w-24 h-24 rounded-lg object-cover" />
                                <div className="flex-1">
                                    <div className="font-bold text-lg">{selectedHouseDesign.title}</div>
                                    <div className="text-gray-600 text-sm">
                                        Lot {lotDetails.id}, {lotDetails.suburb} ({lotDetails.size}m²)
                                    </div>
                                    <div className="text-gray-600 text-sm">
                                        Floor Plan: {selectedHouseDesign.title}
                                    </div>
                                    <div className="text-gray-600 text-sm">
                                        Faced: {facedOption}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <>
                    <h2 className="text-2xl font-medium text-[#000000]">Get Your Quote</h2>
                    <div className="text-gray-600 mt-1 text-base font-normal">
                        Select builders and get quotes for your dream home
                    </div>
                </>
            )}
        </>
    );

    return (
        <Sidebar 
            open={open} 
            onClose={onClose}
            onBack={onBack || onClose}
            showBackButton={true}
            headerContent={headerContent}
        >
            {lotSecured ? (
                <div className="p-6 space-y-6">
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-[#2F5D62] rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-semibold text-gray-900">Thank You!</h3>
                        <p className="text-gray-600">
                            Your lot has been successfully secured and is now<br />
                            reserved for your review.
                        </p>
                    </div>
                </div>
            ) : showThankYou ? (
                <div className="p-6 space-y-6">
                    <div className="text-center space-y-3">
                        <div className="w-9 h-9 bg-[#2F5D62] rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h4 className="text-2xl font-bold text-gray-900">Thank You!</h4>
                        <p className="text-gray-600">Your enquiry has been successfully submitted.</p>
                    </div>
                    
                    {/* Reserve Your Lot Section */}
                    <div className=" border border-gray-200 bg-[#eaf3f2]  rounded-lg p-6 space-y-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                            <h1 className="text-lg font-semibold text-gray-900">Reserve Your Lot Today</h1>
                        </div>
                        <p className="text-gray-600 text-sm">
                            Secure Lot {lotDetails.id} with a refundable deposit while you compare builder quotes
                        </p>
                        <div className="text-3xl font-bold text-[#2F5D62]">$1,000</div>
                        <div className="flex gap-3 pt-2 justify-center">
                            <button
                                onClick={() => setLotSecured(true)}
                                className="bg-[#2F5D62] text-white py-3 px-6 rounded-lg font-medium hover:bg-[#1a3d42] transition-colors"
                            >
                                Secure this lot
                            </button>
                            <button
                                onClick={onClose}
                                className="border border-[#2F5D62] text-[#2F5D62] py-3 px-6 rounded-lg font-medium hover:bg-[#2F5D62] hover:text-white transition-colors"
                            >
                                May be later
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                // Initial form screen
                <form className="space-y-4 p-6">
                    <div>
                        <label htmlFor="yourName" className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                        <input
                            type="text"
                            id="yourName"
                            className="block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-[#2F5D62] focus:border-[#2F5D62]"
                            placeholder="Your name"
                        />
                    </div>
                    <div>
                        <label htmlFor="emailAddress" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            id="emailAddress"
                            className="block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-[#2F5D62] focus:border-[#2F5D62]"
                            placeholder="you@company.com"
                        />
                    </div>
                    <div>
                        <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <input
                            type="tel"
                            id="phoneNumber"
                            className="block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-[#2F5D62] focus:border-[#2F5D62]"
                            placeholder="+1 (555) 000-0000"
                        />
                    </div>
                    <MultiSelect
                        options={builderOptions}
                        selectedOptions={selectedBuilders}
                        onSelectionChange={setSelectedBuilders}
                        placeholder="Choose builders to get quotes from"
                        label="Select Builders (Multiple Selection)"
                    />
                    <div>
                        <label htmlFor="additionalComments" className="block text-sm font-medium text-gray-700 mb-1">Additional Comments</label>
                        <textarea
                            id="additionalComments"
                            rows={3}
                            className="block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-[#2F5D62] focus:border-[#2F5D62]"
                            placeholder="Any specific requirements or questions?"
                        ></textarea>
                    </div>

                    {selectedHouseDesign && (
                        <div className="mt-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Selection</h3>
                            <div className="rounded-2xl border border-gray-200 bg-[#eaf3f2] p-4 flex gap-4 items-center">
                                <img src={selectedHouseDesign.image} alt="House" className="w-24 h-24 rounded-lg object-cover" />
                                <div className="flex-1">
                                    <div className="font-bold text-lg">{selectedHouseDesign.title}</div>
                                    <div className="text-gray-600 text-sm">
                                        Lot {lotDetails.id}, {lotDetails.suburb} ({lotDetails.size}m²)
                                    </div>
                                    <div className="text-gray-600 text-sm">
                                        Floor Plan: {selectedHouseDesign.title}
                                    </div>
                                    <div className="text-gray-600 text-sm">
                                        Faced: {facedOption}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </form>
            )}
            {!showThankYou && !lotSecured && (
                <div className="sticky bottom-0 p-6 border-t border-gray-200 bg-white rounded-b-2xl">
                    <Button
                        className="w-full text-lg py-3 rounded-lg bg-[#2F5D62] text-white"
                        onClick={() => setShowThankYou(true)}
                    >
                        Get Quote
                    </Button>
                </div>
            )}
        </Sidebar>
    );
}