# Mixpanel Migration Guide

## Overview
This guide explains how to migrate from Segment to direct Mixpanel integration for better performance and control.

## Benefits of Direct Mixpanel Integration

### ✅ **Advantages:**
- **Faster data delivery**: No intermediate Segment layer
- **Better control**: Direct API access to all Mixpanel features
- **Cost efficiency**: No Segment fees
- **Real-time data**: Immediate event tracking
- **Advanced features**: Access to Mixpanel's full feature set
- **Better debugging**: Direct error messages and logs

### ⚠️ **Considerations:**
- **Single destination**: Only Mixpanel (vs. Segment's multi-destination)
- **Manual setup**: Need to configure each integration separately
- **Learning curve**: Need to understand Mixpanel's API directly

## Setup Instructions

### 1. **Get Your Mixpanel Token**
1. Go to your Mixpanel project settings
2. Copy your Project Token
3. Add it to your environment variables:
   ```bash
   VITE_MIXPANEL_TOKEN=your_project_token_here
   ```

### 2. **Environment Variables**
Create a `.env` file in your project root:
```env
# Mixpanel Configuration
VITE_MIXPANEL_TOKEN=your_mixpanel_project_token_here

# App Configuration  
VITE_APP_VERSION=1.0.0

# Mapbox Configuration
VITE_MAPBOX_TOKEN=your_mapbox_token_here
```

### 3. **Code Changes**
The migration is already complete! The following files have been updated:

- ✅ `src/lib/analytics/mixpanel.ts` - New direct Mixpanel service
- ✅ `src/main.tsx` - Updated to use Mixpanel initialization
- ✅ `src/App.tsx` - Updated to use Mixpanel tracking

### 4. **Testing**
1. **Development Mode**: Mixpanel debug mode is enabled in development
2. **Check Console**: Look for "Mixpanel initialized successfully" message
3. **Mixpanel Dashboard**: Events should appear in real-time

## Event Tracking

### **Current Events Being Tracked:**
- `App Loaded` - When the app initializes
- `Lot Viewed` - When a lot is selected
- `House Design Viewed` - When viewing house designs
- `Lot Selected` - When a lot is chosen
- `Enquiry Submitted` - When quote forms are submitted
- `Search Performed` - When users search
- `Property Saved/Removed` - When properties are bookmarked
- `Filter Applied` - When filters are used
- `Sidebar Interaction` - When sidebars are opened/closed
- `Modal Interaction` - When modals are used
- `User Journey Milestone` - Key user actions
- `Error Occurred` - When errors happen
- `Performance Metric` - Performance tracking

### **User Properties:**
- User segmentation data
- Preferences (budget, property type, etc.)
- User journey milestones
- Custom properties

## Advanced Features Available

### **1. User Profiles**
```typescript
import { setUserProperties, incrementUserProperty } from '@/lib/analytics/mixpanel';

// Set user properties
setUserProperties({
  plan: 'premium',
  signupDate: '2024-01-15',
  totalLotsViewed: 25
});

// Increment counters
incrementUserProperty('lotsViewed');
incrementUserProperty('searchesPerformed', 3);
```

### **2. Revenue Tracking**
```typescript
import { trackRevenue } from '@/lib/analytics/mixpanel';

// Track revenue events
trackRevenue(1500, {
  lotId: '123',
  houseDesignId: '456',
  builderId: '789'
});
```

### **3. A/B Testing**
Mixpanel supports A/B testing directly - you can set up experiments in the Mixpanel dashboard.

### **4. Funnels & Cohorts**
- **Funnels**: Track user conversion paths
- **Cohorts**: Analyze user behavior over time
- **Retention**: Measure user engagement

## Rollback Plan

If you need to rollback to Segment:

1. **Revert imports** in `main.tsx` and `App.tsx`
2. **Remove** `src/lib/analytics/mixpanel.ts`
3. **Uninstall** `mixpanel-browser` package
4. **Restore** Segment configuration

## Monitoring & Debugging

### **Development Mode**
- Debug mode is enabled in development
- Check browser console for Mixpanel logs
- Events are logged with full details

### **Production Monitoring**
- Check Mixpanel dashboard for event delivery
- Monitor error rates in console
- Use Mixpanel's data quality tools

### **Common Issues**
1. **Token not found**: Check environment variables
2. **Events not appearing**: Verify token is correct
3. **Rate limiting**: Mixpanel has generous limits, but monitor usage

## Next Steps

1. **Set up Mixpanel token** in your environment
2. **Test in development** to ensure events are tracking
3. **Configure dashboards** in Mixpanel for your key metrics
4. **Set up alerts** for important events
5. **Create funnels** to track user conversion paths
6. **Set up cohorts** to analyze user behavior

## Support

- **Mixpanel Docs**: https://developer.mixpanel.com/
- **React Integration**: https://developer.mixpanel.com/docs/javascript
- **Dashboard Setup**: https://help.mixpanel.com/hc/en-us/articles/115004490503
