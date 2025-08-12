import React, { useState } from 'react';
import { Button } from "../../ui/Button";
import { Sidebar } from "../../ui/Sidebar";
import { MultiSelect } from "../../ui/MultiSelect";
import { Checkbox } from "../../ui/checkbox";
import type { GetYourQuoteSidebarProps, QuoteFormData } from "../../../types/houseDesign";
import { quoteFormSchema } from "../../../types/houseDesign";
import { builderOptions } from "../../../constants/houseDesigns";
import { quote, formatContent } from "../../../constants/content";
import { Input } from '../../ui/input';
import { getImageUrl } from '../../../lib/api/lotApi';

export function GetYourQuoteSidebar({ open, onClose, onBack, selectedHouseDesign, lotDetails }: GetYourQuoteSidebarProps) {
    const [selectedBuilders, setSelectedBuilders] = useState<string[]>([]);
    const [showThankYou, setShowThankYou] = useState(false);
    const [lotSecured, setLotSecured] = useState(false);
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState<QuoteFormData>({
        yourName: '',
        emailAddress: '',
        phoneNumber: '',
        selectedBuilders: [],
        additionalComments: '',
    });
    
    // Validation errors
    const [errors, setErrors] = useState<Partial<Record<keyof QuoteFormData, string>>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Update selectedBuilders in formData when it changes
    React.useEffect(() => {
        setFormData(prev => ({ ...prev, selectedBuilders }));
    }, [selectedBuilders]);

    // Reset form when sidebar opens
    React.useEffect(() => {
        if (open) {
            setFormData({
                yourName: '',
                emailAddress: '',
                phoneNumber: '',
                selectedBuilders: [],
                additionalComments: '',
            });
            setErrors({});
            setShowThankYou(false);
            setLotSecured(false);
        }
    }, [open]);

    if (!open) return null;

    const facedOption = selectedHouseDesign?.images[0]?.faced || 'N/A';

    // Handle form field changes
    const handleInputChange = (field: keyof QuoteFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            // Validate form data
            const validatedData = quoteFormSchema.parse(formData);
            
            // Here you would typically send the data to your API
            console.log('Form data validated:', validatedData);
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            setShowThankYou(true);
            setErrors({});
        } catch (error: unknown) {
            // Handle Zod validation errors
            if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
                const fieldErrors: Partial<Record<keyof QuoteFormData, string>> = {};
                const errorMessage = (error as any).message;
                const errors = JSON.parse(errorMessage);
                if (errors.length) {
                    errors.forEach((err: unknown) => {
                        if (err && typeof err === 'object' && 'path' in err && Array.isArray(err.path)) {
                            const field = err.path[0] as keyof QuoteFormData;
                            if ('message' in err && typeof err.message === 'string') {
                                fieldErrors[field] = err.message;
                            }
                        }
                    });
                }
                
                setErrors(fieldErrors);
            } else {
                console.error('Form submission error:', error);
            }
        } finally {
            setIsSubmitting(false);
        }
    };



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
                                <img 
                                    src={selectedHouseDesign.image} 
                                    alt="House" 
                                    width={96}
                                    height={96}
                                    className="rounded-lg object-cover" 
                                />
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
                    <h2 className="text-2xl font-medium text-[#000000]">{quote.title}</h2>
                    <div className="text-gray-600 mt-1 text-base font-normal">
                        {quote.subtitle}
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
                        <h3 className="text-2xl font-semibold text-gray-900">{quote.thankYou}</h3>
                        <p className="text-gray-600">
                            {quote.lotSecured}
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
                        <h4 className="text-2xl font-bold text-gray-900">{quote.thankYou}</h4>
                        <p className="text-gray-600">{quote.enquirySubmitted}</p>
                    </div>
                    
                    {/* Reserve Your Lot Section */}
                    <div className=" border border-gray-200 bg-[#eaf3f2]  rounded-lg p-6 space-y-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                            <h1 className="text-lg font-semibold text-gray-900">{quote.reserveYourLot}</h1>
                        </div>
                        <p className="text-gray-600 text-sm">
                            {formatContent(quote.secureLotDescription, { lotId: lotDetails.id })}
                        </p>
                        <div className="text-3xl font-bold text-[#2F5D62]">{quote.deposit}</div>
                        <div className="flex flex-col gap-3 pt-2">
                            <Button
                                onClick={() => setLotSecured(true)}
                                className="bg-[#2F5D62] text-white py-3 px-6 rounded-lg font-medium hover:bg-[#1a3d42] transition-colors"
                            >
                                {quote.secureThisLot}
                            </Button>
                            <Button
                            variant='outline'
                                onClick={onClose}
                                className="border border-gray-300 bg-white text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                                {quote.mayBeLater}
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                // Initial form screen
                <form onSubmit={handleSubmit}>
                    <div className='space-y-4 p-6'>
                        <div>
                            <label htmlFor="yourName" className="block text-sm font-medium text-gray-700 mb-1">{quote.yourName}</label>
                            <Input
                                type="text"
                                id="yourName"
                                value={formData.yourName}
                                onChange={(e) => handleInputChange('yourName', e.target.value)}
                                className={`block w-full h-12 p-3 border rounded-lg shadow-sm focus:ring-[#2F5D62] focus:border-[#2F5D62] ${
                                    errors.yourName ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="Your name"
                            />
                            {errors.yourName && (
                                <p className="mt-1 text-sm text-red-600">{errors.yourName}</p>
                            )}
                        </div>
                        <div>
                            <label htmlFor="emailAddress" className="block text-sm font-medium text-gray-700 mb-1">{quote.emailAddress}</label>
                            <Input
                                type="email"
                                id="emailAddress"
                                value={formData.emailAddress}
                                onChange={(e) => handleInputChange('emailAddress', e.target.value)}
                                className={`block w-full h-12 p-3 border rounded-lg shadow-sm focus:ring-[#2F5D62] focus:border-[#2F5D62] ${
                                    errors.emailAddress ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="mail@company.com"
                            />
                            {errors.emailAddress && (
                                <p className="mt-1 text-sm text-red-600">{errors.emailAddress}</p>
                            )}
                        </div>
                        <div>
                            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">{quote.phoneNumber}</label>
                            <Input
                                type="tel"
                                id="phoneNumber"
                                value={formData.phoneNumber}
                                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                                className={`block w-full h-12 p-3 border rounded-lg shadow-sm focus:ring-[#2F5D62] focus:border-[#2F5D62] ${
                                    errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="+1 (555) 000-0000"
                            />
                            {errors.phoneNumber && (
                                <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>
                            )}
                        </div>
                        <div>
                            <MultiSelect
                                options={builderOptions}
                                selectedOptions={selectedBuilders}
                                onSelectionChange={setSelectedBuilders}
                                placeholder={quote.chooseBuilders}
                                label={quote.selectBuilders}
                            />
                            {errors.selectedBuilders && (
                                <p className="mt-1 text-sm text-red-600">{errors.selectedBuilders}</p>
                            )}
                        </div>
                        <div>
                            <label htmlFor="additionalComments" className="block text-sm font-medium text-gray-700 mb-1">{quote.additionalComments}</label>
                            <textarea
                                id="additionalComments"
                                rows={3}
                                value={formData.additionalComments}
                                onChange={(e) => handleInputChange('additionalComments', e.target.value)}
                                className={`block w-full p-3 border rounded-lg shadow-sm focus:ring-[#2F5D62] focus:border-[#2F5D62] ${
                                    errors.additionalComments ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="Any specific requirements or questions?"
                            ></textarea>
                            {errors.additionalComments && (
                                <p className="mt-1 text-sm text-red-600">{errors.additionalComments}</p>
                            )}
                        </div>

                        {selectedHouseDesign && (
                            <div className="mt-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Selection</h3>
                                <div className="border-t border-gray-200 pt-2">
                                    <div className="rounded-2xl border border-gray-200 bg-[#eaf3f2] p-4 flex gap-4 items-center">
                                        <img 
                                            src={getImageUrl(selectedHouseDesign.floorPlanImage) || selectedHouseDesign.image} 
                                            alt="Floor Plan" 
                                            width={96}
                                            height={96}
                                            className="rounded-lg object-cover" 
                                        />
                                        <div className="flex-1">
                                            <div className="text-gray-900 text-sm">Lot {lotDetails.id}, {lotDetails.suburb}</div>
                                            <div className="text-gray-900 text-sm">Floor Plan: {selectedHouseDesign.title} ({selectedHouseDesign.area} ft²)</div>
                                            <div className="text-gray-900 text-sm">Faced: {facedOption}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Terms & Conditions Checkbox */}
                        <div className="flex items-start gap-3">
                            <Checkbox
                                id="agreeToTerms"
                                checked={agreeToTerms}
                                onCheckedChange={() => setAgreeToTerms(!agreeToTerms)}
                            />
                            <label htmlFor="agreeToTerms" className="text-sm text-gray-700">
                                I agree to the{' '}
                                <a 
                                    href="#" 
                                    className="text-[#2F5D62] underline hover:text-[#1a3d42] transition-colors"
                                    onClick={(e) => {
                                        e.preventDefault();
                                    }}
                                >
                                    Terms & Conditions
                                </a>
                            </label>
                        </div>
                    </div>
                    {/* Submit Button */}
                    <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
                        <Button
                            type="submit"
                            className="w-full text-lg py-3 rounded-lg bg-[#2F5D62] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isSubmitting || !agreeToTerms}
                        >
                            {isSubmitting ? quote.submitting : "Get Quote"}
                        </Button>
                    </div>
                </form>
            )}
        </Sidebar>
    );
}