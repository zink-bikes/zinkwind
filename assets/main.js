import './simple-slider.js';
import './read-more.js';
import { CartManager } from './add-to-cart.js';
import './variant-selector.js';

// Wait for Alpine.js to be available (loaded from CDN)
function initCartSystem() {
  if (typeof window.Alpine !== 'undefined') {
    // Create cart manager (store will be registered)
    window.cartManager = new CartManager();
  } else {
    // Retry if Alpine isn't ready yet
    setTimeout(initCartSystem, 50);
  }
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCartSystem);
} else {
  // DOM is already ready, but wait for Alpine
  initCartSystem();
}