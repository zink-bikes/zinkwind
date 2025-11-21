import './simple-slider.js';
import './carousel-slider.js';
import './grid-slider.js';
import './read-more.js';
import { CartManager } from './add-to-cart.js';
import { MobileMenu } from './mobile-menu.js';
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
console.log('Starting cart system initialization');
// Initialize mobile menu
function initMobileMenu() {
  window.mobileMenu = new MobileMenu();
  console.log('Mobile menu initialized');
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initCartSystem();
    initMobileMenu();
  });
} else {
  // DOM is already ready
  initCartSystem();
  initMobileMenu();
}