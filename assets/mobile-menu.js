/**
 * Mobile Menu Component
 * Handles hamburger menu with sliding panel and nested navigation
 */

import A11yDialog from './a11y-dialog.js';

export class MobileMenu {
  constructor(containerId = 'mobile-menu') {
    this.containerId = containerId;
    this.dialog = null;
    this.init();
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.initializeDialog();
        this.setupNestedMenus();
      });
    } else {
      this.initializeDialog();
      this.setupNestedMenus();
    }

    this.setupEventListeners();
  }

  initializeDialog() {
    const container = document.querySelector(`[data-a11y-dialog="${this.containerId}"]`);

    if (container) {
      try {
        this.dialog = new A11yDialog(container);
        console.log('MobileMenu: Dialog initialized successfully');

        // Listen for dialog events
        this.dialog.on('show', () => {
          console.log('Mobile menu opened');
          document.body.style.overflow = 'hidden'; // Prevent body scroll
        });

        this.dialog.on('hide', () => {
          console.log('Mobile menu closed');
          document.body.style.overflow = ''; // Restore body scroll
        });
      } catch (error) {
        console.error('MobileMenu: Error initializing dialog:', error);
      }
    } else {
      console.warn('MobileMenu: Container not found, retrying...');
      // Retry if container isn't ready yet
      setTimeout(() => this.initializeDialog(), 100);
    }
  }

  setupNestedMenus() {
    // Setup click handlers for parent menu items with children
    const parentButtons = document.querySelectorAll('[data-menu-parent]');

    parentButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleSubMenu(button);
      });
    });
  }

  toggleSubMenu(parentButton) {
    const subMenu = parentButton.nextElementSibling;
    const arrow = parentButton.querySelector('[data-menu-arrow]');
    const isExpanded = parentButton.getAttribute('aria-expanded') === 'true';

    if (subMenu) {
      if (isExpanded) {
        // Collapse
        parentButton.setAttribute('aria-expanded', 'false');
        subMenu.style.maxHeight = '0';
        if (arrow) {
          arrow.style.transform = 'rotate(0deg)';
        }
      } else {
        // Expand
        parentButton.setAttribute('aria-expanded', 'true');
        subMenu.style.maxHeight = subMenu.scrollHeight + 'px';
        if (arrow) {
          arrow.style.transform = 'rotate(180deg)';
        }
      }
    }
  }

  setupEventListeners() {
    // Listen for hamburger menu trigger clicks
    document.addEventListener('click', (e) => {
      const menuTrigger = e.target.closest('[data-menu-trigger]');
      if (menuTrigger) {
        e.preventDefault();
        console.log('Mobile menu trigger clicked');
        this.open();
      }
    });

    // Close menu when clicking on regular links (not parent items)
    document.addEventListener('click', (e) => {
      const menuLink = e.target.closest('[data-menu-link]');
      if (menuLink && !e.target.closest('[data-menu-parent]')) {
        // Small delay to allow navigation to start
        setTimeout(() => {
          this.close();
        }, 150);
      }
    });
  }

  open() {
    console.log('Mobile menu open() called, dialog:', this.dialog);
    if (this.dialog) {
      this.showDialog();
    } else {
      console.warn('Mobile menu: No dialog initialized, using manual method');
      this.showDialogManually();
    }
  }

  close() {
    if (this.dialog) {
      this.dialog.hide();
    } else {
      this.hideDialogManually();
    }
  }

  showDialog() {
    if (this.dialog && typeof this.dialog.show === 'function') {
      this.dialog.show();
    }
  }

  showDialogManually() {
    // Fallback if a11y-dialog not available
    const container = document.querySelector(`[data-a11y-dialog="${this.containerId}"]`);
    if (container) {
      container.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
  }

  hideDialogManually() {
    // Fallback if a11y-dialog not available
    const container = document.querySelector(`[data-a11y-dialog="${this.containerId}"]`);
    if (container) {
      container.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  getMethods() {
    return {
      open: () => this.open(),
      close: () => this.close()
    };
  }
}

// Auto-initialize if not imported as module
if (typeof window !== 'undefined') {
  // Will be initialized in main.js
  console.log('MobileMenu class loaded');
}
