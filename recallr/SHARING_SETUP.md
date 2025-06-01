# Instagram Share Sheet Implementation for Keepr

## Overview
This implementation allows users to share Instagram posts/reels directly to your Keepr app, which will automatically create a new memory and process the Instagram content using your existing backend infrastructure.

## What's Been Implemented

### 1. Dependencies Added
- `react-native-receive-sharing-intent` - Handles shared content from other apps

### 2. Android Configuration
**File: `recallr/android/app/src/main/AndroidManifest.xml`**
- Added intent filters to handle shared text content (URLs)
- Added intent filters for Instagram URLs specifically
- Your app will now appear in the share sheet when sharing from Instagram

### 3. iOS Configuration
**File: `recallr/ios/Keepr/Info.plist`**
- Added URL schemes for deep linking
- Added document types for sharing
- Added universal links for Instagram domains

### 4. Sharing Service
**File: `recallr/src/services/SharingService.ts`**
- Handles incoming shared content
- Processes Instagram URLs
- Creates memories using your existing `ApiService.addLinkMemory` method
- Integrates with your existing Instagram processing backend

### 5. App Integration
**File: `recallr/App.tsx`**
- Initializes sharing service on app startup
- Handles pending shared content
- Shows alerts when content is received

## How It Works

1. **User shares from Instagram**: When a user taps "Share" on an Instagram post/reel, your Keepr app will appear in the share options
2. **Content received**: Your app receives the Instagram URL
3. **Automatic processing**: The sharing service automatically calls your existing `ApiService.addLinkMemory` method
4. **Backend processing**: Your existing backend processes the Instagram URL using the Instagram processor
5. **Memory created**: A new memory is created with the Instagram content metadata

## Testing Instructions

### Android Testing
1. Build and install the app on an Android device/emulator
2. Open Instagram app
3. Navigate to any post or reel
4. Tap the share button (paper airplane icon)
5. Look for "Keepr" in the share options
6. Tap on Keepr - your app should open and process the shared URL

### iOS Testing
1. Build and install the app on an iOS device/simulator
2. Open Instagram app
3. Navigate to any post or reel
4. Tap the share button
5. Look for "Keepr" in the share sheet
6. Tap on Keepr - your app should open and process the shared URL

### Debug Testing
- Check the console logs for sharing activity
- The `SharingTest` component has been temporarily added to the AddMemoryScreen for debugging
- Look for console messages like "Received shared content:" and "Successfully created memory from shared content:"

## Build Commands

### Android
```bash
cd recallr
npx react-native run-android
```

### iOS
```bash
cd recallr
npx react-native run-ios
```

## Expected Behavior

1. **Successful sharing**: When you share an Instagram URL to Keepr:
   - App opens (if closed) or comes to foreground
   - Console shows "Received shared content: [...]"
   - A new memory is created automatically
   - Success message appears in console: "Successfully created memory from shared content:"

2. **Error handling**: If something goes wrong:
   - Error messages appear in console
   - User sees error notification (currently console only, can be enhanced with Toast/Alert)

## Backend Integration

The sharing functionality uses your existing backend infrastructure:
- **Endpoint**: `/api/memory/link`
- **Instagram Processor**: `backend/instagram_processor.py`
- **Metadata Extraction**: Automatically extracts title, description, hashtags, etc.
- **Vector Storage**: Stores in your existing vector database (Pinecone or in-memory)

## Customization Options

### 1. Notification Enhancement
Currently, success/error messages are logged to console. You can enhance this by:
- Adding Toast notifications
- Adding in-app alerts
- Adding visual feedback in the UI

### 2. Additional Platforms
The current setup focuses on Instagram, but you can extend it to support:
- YouTube URLs
- Twitter/X URLs
- TikTok URLs
- Any other social media platform

### 3. Share Extension (iOS)
For a more native iOS experience, you can add a Share Extension that provides a custom UI within the share sheet.

## Troubleshooting

### Common Issues

1. **App doesn't appear in share sheet**:
   - Ensure the app is installed and has been opened at least once
   - Check that the intent filters are correctly configured
   - Try sharing different types of content (text vs URLs)

2. **Sharing works but no memory is created**:
   - Check backend server is running
   - Verify API endpoints are accessible
   - Check console logs for error messages

3. **iOS sharing not working**:
   - Ensure Info.plist is correctly configured
   - Check that URL schemes are properly set up
   - Verify the app bundle ID matches the configuration

### Debug Steps

1. **Check console logs**: Look for sharing-related messages
2. **Test backend directly**: Try creating a link memory manually through the app
3. **Verify network connectivity**: Ensure the app can reach your backend
4. **Test with different URLs**: Try sharing different Instagram posts

## Next Steps

1. **Remove test component**: Remove `SharingTest` from `AddMemoryScreen` once testing is complete
2. **Enhance notifications**: Add proper user feedback for sharing success/failure
3. **Add iOS Share Extension**: For better iOS integration
4. **Support more platforms**: Extend to other social media platforms
5. **Add sharing analytics**: Track sharing usage and success rates

## Files Modified

- `recallr/android/app/src/main/AndroidManifest.xml` - Android intent filters
- `recallr/ios/Keepr/Info.plist` - iOS URL schemes and sharing config
- `recallr/src/services/SharingService.ts` - Main sharing logic
- `recallr/App.tsx` - Sharing service initialization
- `recallr/src/components/SharingTest.tsx` - Debug component (temporary)
- `recallr/src/pages/AddMemoryScreen/AddMemoryScreen.tsx` - Added test component (temporary)

The implementation leverages your existing Instagram processing infrastructure, so shared Instagram content will be processed with the same rich metadata extraction you already have in place. 