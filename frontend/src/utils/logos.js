/**
 * Get the logo URL for a game, supporting multiple file formats
 * @param {string} gameUid - The game identifier
 * @returns {string} The logo URL
 */
export const getGameLogoUrl = (gameUid) => {
  // The backend/orchestrator should handle logo resolution
  // We'll try png first, then fallback on error
  return `/game-logos/${gameUid}.png`;
};

/**
 * Supported image extensions for logos
 */
export const SUPPORTED_LOGO_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'];

/**
 * Try to load a logo with multiple extensions
 * Returns the first one that exists
 */
export const findLogoUrl = async (baseUrl, gameUid) => {
  for (const ext of SUPPORTED_LOGO_EXTENSIONS) {
    const url = `${baseUrl}/${gameUid}/logo.${ext}`;
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        return url;
      }
    } catch {
      continue;
    }
  }
  return null;
};

/**
 * Handle logo load error by trying alternative formats
 */
export const handleLogoError = (event, gameUid) => {
  const img = event.target;
  const currentSrc = img.src;
  
  // Find current extension
  const currentExt = currentSrc.split('.').pop();
  const currentIndex = SUPPORTED_LOGO_EXTENSIONS.indexOf(currentExt);
  
  // Try next extension
  if (currentIndex < SUPPORTED_LOGO_EXTENSIONS.length - 1) {
    const nextExt = SUPPORTED_LOGO_EXTENSIONS[currentIndex + 1];
    img.src = currentSrc.replace(`.${currentExt}`, `.${nextExt}`);
  } else {
    // Hide image if all formats fail
    img.style.display = 'none';
  }
};
