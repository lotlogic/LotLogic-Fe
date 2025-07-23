# White-Labeling System Documentation

This document explains how to use the centralized content management and white-labeling system in the LotLogic application.

## Overview

The white-labeling system consists of three main components:

1. **Content Management** (`src/constants/content.ts`) - All text content
2. **Brand Configuration** (`src/config/brand.ts`) - Brand-specific settings
3. **Content Hooks** (`src/hooks/useContent.ts`) - React hooks for easy access

## Quick Start

### 1. Using Content in Components

```tsx
import { useContent } from '@/hooks/useContent';

export function MyComponent() {
  const { quote, getText, format } = useContent();
  
  return (
    <div>
      <h1>{quote.title}</h1>
      <p>{quote.subtitle}</p>
      
      {/* Using helper functions */}
      <button>{getText('quote.submit')}</button>
      
      {/* With variables */}
      <p>{format(quote.secureLotDescription, { lotId: '123' })}</p>
    </div>
  );
}
```

### 2. Using Specific Content Hooks

```tsx
import { useQuoteContent, useHeaderContent } from '@/hooks/useContent';

export function QuoteForm() {
  const quoteContent = useQuoteContent();
  const headerContent = useHeaderContent();
  
  return (
    <div>
      <h1>{headerContent.title}</h1>
      <form>
        <label>{quoteContent.yourName}</label>
        <input placeholder={quoteContent.yourName} />
      </form>
    </div>
  );
}
```

### 3. Customizing for Different Brands

Edit `src/config/brand.ts` to customize for your brand:

```typescript
export const BRAND_CONFIG = {
  brand: {
    name: "YourBrand",
    tagline: "Your Custom Tagline",
    logo: "/images/your-logo.png",
  },
  content: {
    overrides: {
      "quote.title": "Get Your Custom Quote",
      "app.name": "YourBrand",
    },
  },
  theme: {
    colors: {
      primary: "#your-primary-color",
      secondary: "#your-secondary-color",
    },
  },
};
```

## Content Structure

### Main Content Sections

- **app** - App-wide content (name, tagline, description)
- **header** - Header component text
- **sidebar** - Sidebar navigation text
- **lotSidebar** - Lot details sidebar content
- **houseDesign** - House design related text
- **quote** - Quote form and flow text
- **map** - Map interface text
- **filter** - Filter component text
- **summary** - Summary view text
- **validation** - Form validation messages
- **errors** - Error messages
- **success** - Success messages
- **loading** - Loading state messages

### Theme Sections

- **colors** - Brand colors
- **typography** - Font families, sizes, weights
- **spacing** - Spacing values
- **shadows** - Shadow definitions
- **transitions** - Transition timings

## Usage Examples

### 1. Basic Text Usage

```tsx
// Direct access
const { quote } = useContent();
<h1>{quote.title}</h1>

// Using get function
const { get } = useContent();
<h1>{get('quote.title')}</h1>
```

### 2. Text with Variables

```tsx
const { format } = useContent();

// Template: "Secure Lot {lotId} with a refundable deposit"
const message = format(quote.secureLotDescription, { lotId: '123' });
// Result: "Secure Lot 123 with a refundable deposit"
```

### 3. Validation Messages

```tsx
const { getValidation } = useContent();

// With variables
const message = getValidation('minLength', { min: 3 });
// Result: "Must be at least 3 characters"
```

### 4. Error and Success Messages

```tsx
const { getError, getSuccess } = useContent();

const errorMessage = getError('networkError');
const successMessage = getSuccess('formSubmitted');
```

### 5. Theme Usage

```tsx
const { colors, typography } = useContent();

const style = {
  color: colors.primary,
  fontFamily: typography.fontFamily.primary,
  fontSize: typography.fontSize.lg,
};
```

## Customization Guide

### 1. Changing App Name and Branding

Edit `src/constants/content.ts`:

```typescript
export const APP_CONTENT = {
  app: {
    name: "Your Brand Name",
    tagline: "Your Custom Tagline",
    description: "Your custom description",
  },
  // ... rest of content
};
```

### 2. Customizing Colors

```typescript
colors: {
  primary: "#your-primary-color",
  secondary: "#your-secondary-color",
  accent: "#your-accent-color",
  // ... other colors
},
```

### 3. Adding New Content

```typescript
// Add new section
newSection: {
  title: "New Section Title",
  description: "New section description",
  button: "New Button Text",
},

// Add to existing section
quote: {
  // ... existing content
  newField: "New quote field text",
},
```

### 4. Brand-Specific Overrides

Use `src/config/brand.ts` for brand-specific customizations:

```typescript
content: {
  overrides: {
    "quote.title": "Custom Quote Title",
    "app.name": "Custom App Name",
    "colors.primary": "#custom-color",
  },
},
```

## Best Practices

### 1. Content Organization

- Keep related content together in logical sections
- Use descriptive keys that are easy to understand
- Maintain consistency in naming conventions

### 2. Variable Usage

- Use `{variableName}` syntax for dynamic content
- Always provide fallback values
- Document expected variables

### 3. Type Safety

- Use TypeScript for better type safety
- Define interfaces for complex content structures
- Use const assertions for immutable content

### 4. Performance

- Use `useMemo` for expensive content operations
- Import only needed content sections
- Avoid unnecessary re-renders

## Migration Guide

### From Hardcoded Text

**Before:**
```tsx
<h1>Get Your Quote</h1>
<button>Submit</button>
```

**After:**
```tsx
const { quote } = useContent();
<h1>{quote.title}</h1>
<button>{quote.submit}</button>
```

### From Inline Styles

**Before:**
```tsx
<div style={{ color: '#2F5D62', fontSize: '1.5rem' }}>
```

**After:**
```tsx
const { colors, typography } = useContent();
<div style={{ color: colors.primary, fontSize: typography.fontSize['2xl'] }}>
```

## Troubleshooting

### Common Issues

1. **Content not updating**: Check if you're using the correct content key
2. **Variables not working**: Ensure template uses `{variableName}` syntax
3. **Type errors**: Check TypeScript interfaces and type definitions
4. **Performance issues**: Use specific content hooks instead of full content object

### Debug Tips

```tsx
// Debug content access
const { get } = useContent();
console.log('Content:', get('quote.title'));

// Debug brand config
import { getBrandConfig } from '@/config/brand';
console.log('Brand config:', getBrandConfig());
```

## API Reference

### Content Functions

- `getContent(path: string, fallback?: string): string`
- `formatContent(template: string, variables: Record<string, string | number>): string`

### Content Hooks

- `useContent()` - Full content access
- `useAppContent()` - App content only
- `useHeaderContent()` - Header content only
- `useQuoteContent()` - Quote content only
- `useThemeContent()` - Theme content only

### Brand Functions

- `getBrandConfig()` - Get brand configuration
- `getApiUrl()` - Get environment-specific API URL
- `isFeatureEnabled(feature: string): boolean` - Check feature availability
- `getIntegrationConfig(integration: string)` - Get integration settings

## Support

For questions or issues with the white-labeling system:

1. Check this documentation
2. Review the example implementations
3. Check the TypeScript types for guidance
4. Look at existing component implementations for patterns 