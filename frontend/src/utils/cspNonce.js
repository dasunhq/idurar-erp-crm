/**
 * CSP Nonce Utility for Ant Design Compatibility
 * 
 * This utility helps manage nonces for Content Security Policy (CSP) compliance
 * when using Ant Design components that inject inline styles.
 */

let currentNonce = null;

/**
 * Retrieves the current CSP nonce value for the application
 * @returns {Promise<string|null>} The nonce value or null if unavailable
 */
export const fetchCSPNonce = async () => {
  try {
    // Try to get nonce via current page first (for Vite dev server)
    const response = await fetch(window.location.href, {
      method: 'HEAD',
      credentials: 'include',
    });
    
    if (response.ok) {
      const nonce = response.headers.get('X-CSP-Nonce');
      if (nonce) {
        currentNonce = nonce;
        return nonce;
      }
    }
    
    // Fallback to backend API endpoint
    const apiResponse = await fetch('/api/nonce', {
      method: 'GET',
      credentials: 'include',
    });
    
    if (apiResponse.ok) {
      const nonce = apiResponse.headers.get('X-CSP-Nonce');
      if (nonce) {
        currentNonce = nonce;
        return nonce;
      }
    }
  } catch (error) {
    console.warn('Failed to fetch CSP nonce:', error);
  }
  
  return null;
};

/**
 * Gets the current nonce value
 * @returns {string|null} The current nonce or null
 */
export const getCurrentNonce = () => currentNonce;

/**
 * Sets up CSP nonce for Ant Design
 * This should be called early in your app initialization
 */
export const setupAntdCSPNonce = async () => {
  const nonce = await fetchCSPNonce();
  
  if (nonce) {
    // Set up a MutationObserver to add nonce to dynamically created style elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check for style elements (Ant Design often injects these)
            if (node.tagName === 'STYLE' && !node.hasAttribute('nonce')) {
              node.setAttribute('nonce', nonce);
            }
            
            // Also check for style elements within added nodes
            const styleElements = node.querySelectorAll ? node.querySelectorAll('style:not([nonce])') : [];
            styleElements.forEach((styleEl) => {
              styleEl.setAttribute('nonce', nonce);
            });
          }
        });
      });
    });
    
    // Start observing
    observer.observe(document.head, {
      childList: true,
      subtree: true,
    });
    
    // Also handle existing style elements
    const existingStyles = document.querySelectorAll('style:not([nonce])');
    existingStyles.forEach((styleEl) => {
      styleEl.setAttribute('nonce', nonce);
    });
    
    console.log('CSP nonce setup completed for Ant Design');
    return nonce;
  } else {
    console.warn('CSP nonce not available - Ant Design styles may be blocked');
    return null;
  }
};

/**
 * Manually applies nonce to a style element
 * @param {HTMLStyleElement} styleElement - The style element to add nonce to
 */
export const applyNonceToStyle = (styleElement) => {
  if (currentNonce && styleElement && !styleElement.hasAttribute('nonce')) {
    styleElement.setAttribute('nonce', currentNonce);
  }
};


