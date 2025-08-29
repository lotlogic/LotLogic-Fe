import React, { useState } from 'react';
import { Button } from "@/components/ui/Button";
import { Sidebar } from "@/components/ui/Sidebar";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Checkbox } from "@/components/ui/checkbox";
import type { GetYourQuoteSidebarProps, QuoteFormData } from "@/types/houseDesign";
import { quoteFormSchema } from "@/types/houseDesign";
import { quote, formatContent, getColorClass } from "@/constants/content";
import { Input } from '@/components/ui/input';
import { getImageUrl, submitEnquiry } from '@/lib/api/lotApi';
import { useBuilders, convertBuildersToOptions } from '@/hooks/useBuilders';
import { trackQuoteFormInteraction, trackEnquirySubmitted } from '@/lib/analytics/segment';

export function GetYourQuoteSidebar({ open, onClose, onBack, selectedHouseDesign, lotDetails }: GetYourQuoteSidebarProps) {
    const [selectedBuilders, setSelectedBuilders] = useState<string[]>([]);
    const [showThankYou, setShowThankYou] = useState(false);
    const [lotSecured, setLotSecured] = useState(false);
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    // Fetch builders from backend
    const { data: builders, isLoading: buildersLoading, error: buildersError } = useBuilders();
    const builderOptions = builders ? convertBuildersToOptions(builders) : [];
    
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
        
        // Track form field interaction
        trackQuoteFormInteraction('Field Updated', {
            field,
            hasValue: !!value.trim(),
            lotId: lotDetails.id,
            houseDesignId: selectedHouseDesign?.id
        });
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            // Validate form data
            quoteFormSchema.parse(formData);
            
            // Prepare enquiry data for API
            const enquiryData = {
                name: formData.yourName,
                email: formData.emailAddress,
                number: formData.phoneNumber,
                builders: formData.selectedBuilders,
                comments: formData.additionalComments || '',
                lot_id: parseInt(lotDetails.id.toString()),
                house_design_id: selectedHouseDesign?.id || '',
                facade_id: '' 
            };
            
            // Submit enquiry to API
            await submitEnquiry(enquiryData);
            
            // Track successful enquiry submission
            trackEnquirySubmitted({
                lotId: lotDetails.id,
                houseDesignId: selectedHouseDesign?.id || '',
                facadeId: null, 
                builder: formData.selectedBuilders
            });
            
            setShowThankYou(true);
            setErrors({});
        } catch (error: unknown) {
            // Handle Zod validation errors
            if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
                const fieldErrors: Partial<Record<keyof QuoteFormData, string>> = {};
                const errorMessage = (error as Record<string, unknown>).message as string;
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
                // console.error('Form submission error:', error);
                // Show user-friendly error message
                setErrors({
                    additionalComments: 'Failed to submit enquiry. Please try again.'
                });
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
                    <h2 className={`text-2xl font-medium ${getColorClass('text.primary', 'text')}`}>
                        {lotSecured ? '' : ''}
                    </h2>
                    {selectedHouseDesign && (
                        <div >
                            <div className="p-1 flex gap-4 items-center">
                                <img 
                                    src={selectedHouseDesign.floorPlanImage ? getImageUrl(selectedHouseDesign.floorPlanImage) : selectedHouseDesign.image} 
                                    alt="Floor Plan" 
                                    width={56}
                                    height={56}
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
                    <h2 className={`text-2xl font-medium ${getColorClass('text.primary', 'text')}`}>{quote.title}</h2>
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
                        <div className={`w-16 h-16 ${getColorClass('primary')} rounded-full flex items-center justify-center mx-auto`}>
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
                        <div className={`w-9 h-9 ${getColorClass('primary')} rounded-full flex items-center justify-center mx-auto`}>
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h4 className="text-2xl font-bold text-gray-900">{quote.thankYou}</h4>
                        <p className="text-gray-600">{quote.enquirySubmitted}</p>
                    </div>
                    
                    {/* Reserve Your Lot Section */}
                    <div className={` border border-gray-200 ${getColorClass('background.accent')}  rounded-lg p-6 space-y-4 text-center`}>
                        <div className="flex items-center justify-center gap-2">
                            <h1 className="text-lg font-semibold text-gray-900">{quote.reserveYourLot}</h1>
                        </div>
                        <p className="text-gray-600 text-sm">
                            {formatContent(quote.secureLotDescription, { lotId: lotDetails.id })}
                        </p>
                        <div className={`text-3xl font-bold ${getColorClass('primary', 'text')}`}>{quote.deposit}</div>
                        <div className="flex flex-col gap-3 pt-2">
                            <Button
                                onClick={() => setLotSecured(true)}
                                className={`${getColorClass('primary')} text-white py-3 px-6 rounded-lg font-medium hover:${getColorClass('accent')} transition-colors`}
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
                                className={`block w-full h-12 p-3 border rounded-lg shadow-sm focus:${getColorClass('primary', 'ring')} focus:${getColorClass('primary', 'border')} ${
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
                                className={`block w-full h-12 p-3 border rounded-lg shadow-sm focus:${getColorClass('primary', 'ring')} focus:${getColorClass('primary', 'border')} ${
                                    errors.emailAddress ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="your.email@company.com"
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
                                className={`block w-full h-12 p-3 border rounded-lg shadow-sm focus:${getColorClass('primary', 'ring')} focus:${getColorClass('primary', 'border')} ${
                                    errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="0412 *** ***"
                            />
                            {errors.phoneNumber && (
                                <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>
                            )}
                        </div>
                        <div>
                            {buildersLoading ? (
                                <div className="text-sm text-gray-500">Loading builders...</div>
                            ) : buildersError ? (
                                <div className="text-sm text-red-500">Error loading builders. Please try again.</div>
                            ) : (
                                <MultiSelect
                                    options={builderOptions}
                                    selectedOptions={selectedBuilders}
                                    onSelectionChange={setSelectedBuilders}
                                    placeholder={quote.chooseBuilders}
                                    label={quote.selectBuilders}
                                />
                            )}
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
                                className={`block w-full p-3 border rounded-lg shadow-sm focus:${getColorClass('primary', 'ring')} focus:${getColorClass('primary', 'border')} ${
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
                                    <div className={`rounded-2xl border border-gray-200 ${getColorClass('background.accent')} p-4 flex gap-4 items-center`}>
                                        <img 
                                            src={getImageUrl(selectedHouseDesign.floorPlanImage) || selectedHouseDesign.image} 
                                            alt="Floor Plan" 
                                            width={56}
                                            height={56}
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
                                    className={`${getColorClass('primary', 'text')} underline hover:${getColorClass('accent', 'text')} transition-colors`}
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
                            className={`w-full text-lg py-3 rounded-lg ${getColorClass('primary')} text-white disabled:opacity-50 disabled:cursor-not-allowed`}
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