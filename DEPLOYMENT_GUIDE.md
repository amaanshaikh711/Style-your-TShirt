# 3D Model Mobile Deployment - Troubleshooting Guide

## Changes Implemented

### ✅ 1. Enhanced Error Logging
- Added detailed console logging for model loading progress
- Error messages now show URL, user agent, and specific error details
- User-friendly error messages in the UI

### ✅ 2. Absolute Path Resolution
- Automatic detection of localhost vs deployed environment
- Dynamic path construction for deployed servers
- Prevents 404 errors on different hosting platforms

### ✅ 3. WebGL Detection
- Checks WebGL support before initializing 3D scene
- Shows clear error message if device doesn't support WebGL
- Prevents crashes on incompatible devices

### ✅ 4. Mobile Performance Optimizations
**Desktop**: Full quality maintained (antialias, shadows, 2x pixel ratio)
**Mobile**: Optimized settings
- Antialiasing: OFF (saves GPU memory)
- Shadows: OFF (improves FPS)
- Pixel Ratio: 1.5x (instead of 2x)
- Power Preference: low-power mode

### ✅ 5. Progress Tracking
- Loading percentage displayed in console
- Helps identify slow network issues

## How to Debug on Mobile

### Method 1: Remote Debugging (Recommended)

**For Android Chrome:**
1. Enable USB Debugging on your Android device
2. Connect to PC via USB
3. Open Chrome on PC → `chrome://inspect`
4. Select your device and inspect the page
5. Check Console tab for errors

**For iOS Safari:**
1. Enable Web Inspector on iPhone (Settings → Safari → Advanced)
2. Connect to Mac via USB
3. Open Safari on Mac → Develop → [Your iPhone]
4. Select the page and check Console

### Method 2: Error Display
- Open the 3D viewer on mobile
- If it fails, you'll see a red error message
- Take a screenshot and share it

### Method 3: Network Check
1. Open browser DevTools on desktop
2. Switch to mobile view (F12 → Toggle device toolbar)
3. Throttle to "Slow 3G"
4. Try loading 3D model
5. Check Network tab for failed requests

## Common Issues & Solutions

### Issue 1: Model File Not Found (404)
**Symptoms**: Error says "Failed to load 3D model"
**Console**: `404 Not Found` for `.glb` file

**Solutions**:
- Verify `assets/black-tshirt-1.0.glb` exists in deployed folder
- Check file name spelling (case-sensitive on Linux servers)
- Ensure `assets/` folder is included in deployment

### Issue 2: CORS Error
**Symptoms**: Model doesn't load, CORS error in console
**Console**: `Access to fetch at '...' has been blocked by CORS policy`

**Solutions**:
- Add to hosting platform config (e.g., Netlify `_headers`):
  ```
  /*
    Access-Control-Allow-Origin: *
  ```
- Or use Vercel `vercel.json`:
  ```json
  {
    "headers": [
      {
        "source": "/assets/(.*)",
        "headers": [
          { "key": "Access-Control-Allow-Origin", "value": "*" }
        ]
      }
    ]
  }
  ```

### Issue 3: Wrong MIME Type
**Symptoms**: Model loads but fails to parse
**Console**: `Unexpected token` or MIME type error

**Solutions**:
- Configure server to serve `.glb` as `model/gltf-binary`
- For Netlify, add to `netlify.toml`:
  ```toml
  [[headers]]
    for = "/*.glb"
    [headers.values]
      Content-Type = "model/gltf-binary"
  ```

### Issue 4: CDN Blocked
**Symptoms**: White screen, no 3D viewer loads
**Console**: Failed to load module from Skypack

**Solutions**:
- Check if Skypack is accessible: https://cdn.skypack.dev/
- Alternative: Download Three.js locally and update imports
- Or use different CDN (unpkg, jsdelivr)

### Issue 5: WebGL Not Supported
**Symptoms**: Error message "Your device does not support 3D graphics"
**Console**: WebGL context creation failed

**Solutions**:
- This is a device limitation (old phones, some browsers)
- No fix available - device doesn't support WebGL
- Consider adding 2D fallback preview

### Issue 6: Out of Memory
**Symptoms**: 3D loads but crashes after a few seconds
**Console**: WebGL context lost

**Solutions**:
- Model file might be too large
- Reduce texture resolution
- Simplify 3D model geometry
- Current optimizations should help (mobile settings)

## Deployment Platform Specific

### Netlify
```toml
# netlify.toml
[[headers]]
  for = "/*"
  [headers.values]
    Access-Control-Allow-Origin = "*"

[[headers]]
  for = "/*.glb"
  [headers.values]
    Content-Type = "model/gltf-binary"
```

### Vercel
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    }
  ]
}
```

### GitHub Pages
- Usually works out of the box
- Ensure `.glb` file is committed to repo
- Check Actions tab for deployment errors

## Testing Checklist

Before deploying:
- [ ] Test on desktop Chrome (should work perfectly)
- [ ] Test on mobile Chrome DevTools emulation
- [ ] Test with throttled network (Slow 3G)
- [ ] Check browser console for errors

After deploying:
- [ ] Test on real Android device (Chrome)
- [ ] Test on real iPhone (Safari)
- [ ] Check that `.glb` file is accessible: `https://yoursite.com/assets/black-tshirt-1.0.glb`
- [ ] Verify file size is reasonable (< 5MB recommended)

## Next Steps

1. **Deploy the updated code**
2. **Test on mobile device**
3. **If it fails**:
   - Use remote debugging to check console
   - Share the error message
   - Verify the model file URL is accessible

4. **If it works on some devices but not others**:
   - Check WebGL support: https://get.webgl.org/
   - Compare device specs (GPU, RAM, browser version)

## Performance Metrics

**Expected Performance:**
- Desktop: 60 FPS, full quality
- High-end mobile: 30-60 FPS
- Mid-range mobile: 20-30 FPS
- Low-end mobile: May not support WebGL

**Model Load Time:**
- Fast connection: < 1 second
- 3G: 2-5 seconds
- Slow 3G: 5-10 seconds

If load time exceeds 10 seconds, consider optimizing the `.glb` file size.
