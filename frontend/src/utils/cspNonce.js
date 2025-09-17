/**
 * CSP nonce helpers for style/script elements used by UI libraries.
 */

let currentNonce = null;

/**
 * Retrieve the current CSP nonce value (if exposed via headers).
 * @returns {Promise<string|null>} nonce or null
 */
export const fetchCSPNonce = async () => {
  try {
    // Attempt HEAD request to obtain nonce header
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

    // Fallback to backend endpoint
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
    // Nonce header may be unavailable depending on deployment; ignore
  }

  return null;
};

/**
 * Get the current nonce value.
 * @returns {string|null}
 */
export const getCurrentNonce = () => currentNonce;

/**
 * Initialize MutationObserver to apply nonce to dynamically injected style tags.
 */
export const setupAntdCSPNonce = async () => {
  const nonce = await fetchCSPNonce();

  if (nonce) {
    // Observe new elements and add nonce to style tags
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Add nonce to style elements lacking it
            if (node.tagName === 'STYLE' && !node.hasAttribute('nonce')) {
              node.setAttribute('nonce', nonce);
            }

            // Also handle nested style elements
            const styleElements = node.querySelectorAll
              ? node.querySelectorAll('style:not([nonce])')
              : [];
            styleElements.forEach((styleEl) => {
              styleEl.setAttribute('nonce', nonce);
            });
          }
        });
      });
    });

    // Begin observing
    observer.observe(document.head, {
      childList: true,
      subtree: true,
    });

    // Also handle existing style elements
    const existingStyles = document.querySelectorAll('style:not([nonce])');
    existingStyles.forEach((styleEl) => {
      styleEl.setAttribute('nonce', nonce);
    });

    // Ready
    return nonce;
  } else {
    // Nonce not available
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
