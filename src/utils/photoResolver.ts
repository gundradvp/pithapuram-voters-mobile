/**
 * Photo Resolver for JSP Pithapuram Voters Mobile App
 * Resolves voter photo paths with support for:
 * 1. Local static assets (/photos/...)
 * 2. Google Drive Proxy / Cloudflare Worker / CDN (via localStorage 'photo_cdn_base_url' or window.__PHOTO_CDN_URL__)
 * 3. Direct HTTP/HTTPS URLs
 */

export function resolvePhotoUrl(rawUrl?: string): string | undefined {
  if (!rawUrl || typeof rawUrl !== 'string') return undefined;

  // If already absolute HTTP/HTTPS
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    return rawUrl;
  }

  // Check for configured external CDN or Google Drive Base URL
  try {
    const cdnBase = 
      (typeof window !== 'undefined' && (window as any).__PHOTO_CDN_URL__) ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('photo_cdn_base_url'));

    if (cdnBase && typeof cdnBase === 'string') {
      if (cdnBase.includes('?')) {
        const cleanBase = cdnBase.endsWith('=') || cdnBase.endsWith('&') || cdnBase.endsWith('?')
          ? cdnBase
          : `${cdnBase}&file=`;
        return `${cleanBase}${encodeURIComponent(rawUrl)}`;
      }
      const cleanBase = cdnBase.endsWith('/') ? cdnBase.slice(0, -1) : cdnBase;
      const cleanPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
      return `${cleanBase}${cleanPath}`;
    }
    // Cloud Sandbox / Bolt environment auto-resolution:
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const isCloudEnv = 
        hostname.includes('bolt.new') || 
        hostname.includes('webcontainer') || 
        hostname.includes('stackblitz') ||
        hostname.includes('github.dev') ||
        hostname.includes('codesandbox') ||
        (!hostname.includes('localhost') && hostname !== '127.0.0.1' && hostname !== '');
      
      if (isCloudEnv) {
        const cleanPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
        return `https://raw.githubusercontent.com/gundradvp/pithapuram-voters-mobile/main/public${cleanPath}`;
      }
    }
  } catch (e) {
    // Fallback silently if storage unavailable
  }

  return rawUrl;
}

export const resolveCardUrl = resolvePhotoUrl;
export const resolveMediaUrl = resolvePhotoUrl;

