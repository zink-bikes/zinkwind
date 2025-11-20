import A11yDialog from './a11y-dialog.js';

/**
 * CartAPI - Handles all Shopify Cart API interactions
 */
export class CartAPI {
  constructor() {
    this.baseURL = '/cart';
  }

  /**
   * Add a single item to cart
   * @param {Object} item - { id: variantId, quantity: number, properties: {} }
   * @returns {Promise<Object>} Cart response
   */
  async addItem(item) {
    try {
      console.log('CartAPI.addItem - Request:', item); // Debug log
      
      const response = await fetch(`${this.baseURL}/add.js`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(item),
      });

      console.log('CartAPI.addItem - Response status:', response.status); // Debug log

      if (!response.ok) {
        let errorMessage = 'Failed to add item to cart';
        try {
          const error = await response.json();
          errorMessage = error.description || error.message || errorMessage;
          console.error('CartAPI.addItem - Error response:', error); // Debug log
        } catch (e) {
          // If response isn't JSON, get text
          const text = await response.text();
          console.error('CartAPI.addItem - Error text:', text); // Debug log
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('CartAPI.addItem - Success:', result); // Debug log
      
      // The add.js endpoint returns the item, not the full cart
      // Fetch the full cart to get updated state
      const fullCart = await this.getCart();
      console.log('CartAPI.addItem - Full cart after add:', fullCart); // Debug log
      return fullCart;
    } catch (error) {
      console.error('Error adding item to cart:', error);
      throw error;
    }
  }

  /**
   * Add multiple items to cart (for bundles)
   * @param {Array} items - Array of { id, quantity, properties }
   * @returns {Promise<Object>} Cart response
   */
  async addItems(items) {
    try {
      const response = await fetch(`${this.baseURL}/add.js`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.description || 'Failed to add items to cart');
      }

      const result = await response.json();
      console.log('CartAPI.addItems - Success:', result); // Debug log
      
      // The add.js endpoint returns items, not the full cart
      // Fetch the full cart to get updated state
      const fullCart = await this.getCart();
      console.log('CartAPI.addItems - Full cart after add:', fullCart); // Debug log
      return fullCart;
    } catch (error) {
      console.error('Error adding items to cart:', error);
      throw error;
    }
  }

  /**
   * Update item quantity in cart
   * @param {string} key - Line item key
   * @param {number} quantity - New quantity
   * @returns {Promise<Object>} Cart response
   */
  async updateItem(key, quantity) {
    try {
      const response = await fetch(`${this.baseURL}/change.js`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: key, quantity }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.description || 'Failed to update item');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  }

  /**
   * Remove item from cart
   * @param {string} key - Line item key
   * @returns {Promise<Object>} Cart response
   */
  async removeItem(key) {
    try {
      const response = await fetch(`${this.baseURL}/change.js`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: key, quantity: 0 }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.description || 'Failed to remove item');
      }

      return await response.json();
    } catch (error) {
      console.error('Error removing item:', error);
      throw error;
    }
  }

  /**
   * Get current cart state
   * @returns {Promise<Object>} Cart object
   */
  async getCart() {
    try {
      const response = await fetch(`${this.baseURL}.js`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch cart');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching cart:', error);
      throw error;
    }
  }
}

/**
 * CartStore - Alpine.js reactive store for cart state
 */
export class CartStore {
  constructor() {
    this.store = {
      items: [],
      item_count: 0,
      total_price: 0,
      formatted_total: '$0.00',
      loading: false,
      error: null,

      /**
       * Update cart state from API response
       * @param {Object} cartData - Cart data from Shopify API
       */
      updateCart(cartData) {
        console.log('CartStore.updateCart - Received cart data:', cartData);
        console.log('CartStore.updateCart - Items:', cartData.items);
        console.log('CartStore.updateCart - Item count:', cartData.item_count);
        console.log('CartStore.updateCart - Items type:', Array.isArray(cartData.items) ? 'Array' : typeof cartData.items);
        console.log('CartStore.updateCart - Items length:', cartData.items?.length);
        
        // Ensure items is an array
        const items = Array.isArray(cartData.items) ? cartData.items : [];
        
        // CRITICAL FIX: Direct property assignment for Alpine reactivity
        // Alpine.js tracks property changes, so we assign directly
        this.items = items;
        this.item_count = cartData.item_count || 0;
        this.total_price = cartData.total_price || 0;
        this.formatted_total = this.formatMoney(cartData.total_price || 0);
        this.error = null;
        
        console.log('CartStore.updateCart - Updated store state:', {
          items: this.items,
          itemsLength: this.items.length,
          item_count: this.item_count,
          total_price: this.total_price,
          formatted_total: this.formatted_total
        });
      },

      /**
       * Format money value
       * @param {number} cents - Price in cents
       * @returns {string} Formatted price
       */
      formatMoney(cents) {
        if (typeof window.Shopify !== 'undefined' && window.Shopify.formatMoney) {
          return window.Shopify.formatMoney(cents);
        }
        // Fallback formatting
        return `$${(cents / 100).toFixed(2)}`;
      },

      /**
       * Get item by key
       * @param {string} key - Line item key
       * @returns {Object|null} Cart item
       */
      getItem(key) {
        return this.items.find(item => item.key === key) || null;
      },

      /**
       * Set loading state
       * @param {boolean} isLoading - Loading state
       */
      setLoading(isLoading) {
        this.loading = isLoading;
      },

      /**
       * Set error state
       * @param {string|null} errorMessage - Error message
       */
      setError(errorMessage) {
        this.error = errorMessage;
      },
    };
  }

  /**
   * Register store with Alpine.js
   */
  register() {
    if (typeof window.Alpine !== 'undefined') {
      // Check if store already exists to avoid duplicate registration
      if (!window.Alpine.store('cart')) {
        window.Alpine.store('cart', this.store);
        console.log('CartStore: Registered new cart store with Alpine');
      } else {
        console.log('CartStore: Store already registered, skipping');
      }
      return true;
    }
    console.warn('CartStore: Alpine not available yet');
    return false;
  }
}

/**
 * SideCart - Manages the side cart drawer UI
 */
export class SideCart {
  constructor(containerId = 'side-cart') {
    this.containerId = containerId;
    this.dialog = null;
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeDialog());
    } else {
      this.initializeDialog();
    }
  }

  initializeDialog() {
    const container = document.querySelector(`[data-a11y-dialog="${this.containerId}"]`);
    if (container) {
      try {
        this.dialog = new A11yDialog(container);
        console.log('SideCart: Dialog initialized', this.dialog);
        
        // Verify initialization
        if (!this.dialog) {
          console.error('SideCart: A11yDialog constructor returned null/undefined');
        }
        
        // Add custom styling for slide-in animation
        this.setupStyles();
      } catch (error) {
        console.error('SideCart: Error initializing dialog:', error);
      }
    } else {
      // Retry if container isn't ready yet
      setTimeout(() => this.initializeDialog(), 100);
    }
  }

  setupStyles() {
    // Styles are now in input.css for better performance and earlier loading
    // This method is kept for potential future dynamic style additions
  }

  /**
   * Open the side cart
   */
  open() {
    // Ensure dialog is initialized before opening
    if (!this.dialog) {
      this.initializeDialog();
      // If still not initialized, wait a bit and try again
      if (!this.dialog) {
        setTimeout(() => {
          this.initializeDialog();
          if (this.dialog) {
            this.showDialog();
          } else {
            console.error('SideCart: Dialog not initialized after retry');
            // Fallback: manually show the dialog
            this.showDialogManually();
          }
        }, 100);
        return;
      }
    }
    
    if (this.dialog) {
      this.showDialog();
    } else {
      console.error('SideCart: Cannot open - dialog not initialized, using manual fallback');
      this.showDialogManually();
    }
  }

  /**
   * Show dialog using a11y-dialog
   */
  showDialog() {
    console.log('SideCart: Opening dialog via a11y-dialog');
    const container = document.querySelector(`[data-a11y-dialog="${this.containerId}"]`);
    
    try {
      if (this.dialog && typeof this.dialog.show === 'function') {
        this.dialog.show();
      } else {
        console.warn('SideCart: dialog.show() not available, using manual fallback');
        this.showDialogManually();
        return;
      }
      
      // Immediately check and fix if needed (don't wait)
      if (container) {
        const ariaHidden = container.getAttribute('aria-hidden');
        console.log('SideCart: Container aria-hidden after show():', ariaHidden);
        
        // If a11y-dialog didn't set it, do it manually immediately
        if (ariaHidden !== 'false') {
          console.warn('SideCart: a11y-dialog did not set aria-hidden, setting manually');
          this.showDialogManually();
        }
      }
    } catch (error) {
      console.error('SideCart: Error showing dialog:', error);
      this.showDialogManually();
    }
  }

  /**
   * Manual fallback to show dialog if a11y-dialog fails
   */
  showDialogManually() {
    console.log('SideCart: Using manual fallback to show dialog');
    const container = document.querySelector(`[data-a11y-dialog="${this.containerId}"]`);
    if (container) {
      container.setAttribute('aria-hidden', 'false');
      // Ensure it's visible
      container.style.display = 'block';
      console.log('SideCart: Manually set aria-hidden="false" and display="block"');
      
      // Verify it worked
      setTimeout(() => {
        const computed = window.getComputedStyle(container);
        console.log('SideCart: Manual fallback - display:', computed.display, 'aria-hidden:', container.getAttribute('aria-hidden'));
      }, 10);
    } else {
      console.error('SideCart: Container not found for manual fallback');
    }
  }

  /**
   * Close the side cart
   */
  close() {
    if (this.dialog) {
      try {
        this.dialog.hide();
      } catch (error) {
        console.error('SideCart: Error hiding dialog:', error);
        this.hideDialogManually();
      }
    } else {
      this.hideDialogManually();
    }
  }

  /**
   * Manual fallback to hide dialog
   */
  hideDialogManually() {
    const container = document.querySelector(`[data-a11y-dialog="${this.containerId}"]`);
    if (container) {
      container.setAttribute('aria-hidden', 'true');
    }
  }

  /**
   * Check if cart is open
   * @returns {boolean}
   */
  isOpen() {
    return this.dialog && !this.dialog.container.hasAttribute('aria-hidden');
  }
}

/**
 * CartManager - Coordinates CartAPI, CartStore, and SideCart
 */
export class CartManager {
  constructor() {
    this.api = new CartAPI();
    // Store should already be registered inline in theme.liquid
    // We'll always access it via Alpine.store('cart')
    this.store = null;
    this.sideCart = new SideCart();
    this.init();
  }

  init() {
    // Register Alpine store when Alpine is ready
    this.registerStore();

    // Set up event listeners (these work regardless of Alpine)
    this.setupEventListeners();
  }

  /**
   * Register store with Alpine.js when it's available
   */
  registerStore() {
    // Store is already registered inline in layout/theme.liquid via alpine:init
    // Just wait for it to be available and load the initial cart data
    if (typeof window.Alpine !== 'undefined' && window.Alpine.store('cart')) {
      console.log('CartManager: Store already available, loading cart data');
      this.loadInitialCart();
    } else {
      // Wait for Alpine to be ready
      document.addEventListener('alpine:init', () => {
        console.log('CartManager: Alpine initialized, loading cart data');
        this.loadInitialCart();
      });

      // Also try after a short delay in case alpine:init already fired
      setTimeout(() => {
        if (typeof window.Alpine !== 'undefined' && window.Alpine.store('cart')) {
          console.log('CartManager: Store available after delay, loading cart data');
          this.loadInitialCart();
        }
      }, 100);
    }
  }

  /**
   * Get the cart store (either from Alpine or our instance)
   */
  getCartStore() {
    if (typeof window.Alpine !== 'undefined' && window.Alpine.store('cart')) {
      return window.Alpine.store('cart');
    }
    return this.store ? this.store.store : null;
  }

  /**
   * Load initial cart state
   */
  async loadInitialCart() {
    try {
      const cart = await this.api.getCart();
      const cartStore = this.getCartStore();
      
      // Update Alpine store directly for reactivity
      if (cartStore && typeof window.Alpine !== 'undefined') {
        const store = window.Alpine.store('cart');
        if (store) {
          const items = Array.isArray(cart.items) ? cart.items : [];
          store.items = items;
          store.item_count = cart.item_count || 0;
          store.total_price = cart.total_price || 0;
          store.formatted_total = store.formatMoney(cart.total_price || 0);
        }
        cartStore.updateCart(cart);
      } else if (cartStore) {
        cartStore.updateCart(cart);
      }
    } catch (error) {
      console.error('Error loading initial cart:', error);
    }
  }

  /**
   * Set up event listeners for add-to-cart buttons
   */
  setupEventListeners() {
    // Listen for form submissions (use capture phase to catch early)
    document.addEventListener('submit', (e) => {
      const form = e.target;
      // Check if it's a product form (Shopify forms have data-cart-form or action contains /cart/add)
      if (form && form.tagName === 'FORM' && form.dataset.processing !== 'true') {
        const formAction = form.getAttribute('action') || '';
        const formName = form.getAttribute('name') || '';
        const hasCartFormAttr = form.hasAttribute('data-cart-form');
        const hasIdInput = form.querySelector('input[name="id"]');
        
        // Check if it's a product form or cart add form
        if (hasCartFormAttr || formAction.includes('/cart/add') || formName === 'product' || hasIdInput) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          this.handleFormSubmit(form);
          return false;
        }
      }
    }, true); // Use capture phase

    // Listen for quick add buttons
    document.addEventListener('click', (e) => {
      const button = e.target.closest('[data-quick-add]');
      if (button) {
        e.preventDefault();
        this.handleQuickAdd(button);
      }
    });

    // Listen for cart icon clicks
    document.addEventListener('click', (e) => {
      const cartTrigger = e.target.closest('[data-cart-trigger]');
      if (cartTrigger) {
        e.preventDefault();
        this.sideCart.open();
      }
    });
  }

  /**
   * Handle product form submission
   * @param {HTMLFormElement} form - Product form
   */
  async handleFormSubmit(form) {
    // Use temporary processing flag instead of permanent cartHandled
    if (form.dataset.processing === 'true') {
      return; // Already processing, ignore duplicate submission
    }
    form.dataset.processing = 'true';
    
    const cartStore = this.getCartStore();
    if (cartStore) {
      cartStore.setLoading(true);
    }

    try {
      const formData = new FormData(form);
      
      // Get variant ID - Shopify forms use 'id' field
      let variantId = formData.get('id');
      
      // If no variant ID, try to get from hidden input or data attribute
      if (!variantId) {
        const idInput = form.querySelector('input[name="id"]');
        variantId = idInput ? idInput.value : null;
      }
      
      if (!variantId) {
        throw new Error('Variant ID not found. Please select a product variant.');
      }
      
      const quantity = parseInt(formData.get('quantity') || '1', 10);

      // Collect properties (line item attributes)
      const properties = {};
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('properties[') && key.endsWith(']')) {
          const propKey = key.replace('properties[', '').replace(']', '');
          if (value) {
            properties[propKey] = value;
          }
        }
      }

      // Add item to cart - handle both string and number variant IDs
      const item = {
        id: variantId, // Keep as-is (Shopify accepts both string and number)
        quantity,
        ...(Object.keys(properties).length > 0 && { properties }),
      };

      console.log('Adding to cart:', item); // Debug log
      await this.addToCart(item);
    } catch (error) {
      console.error('Error adding to cart:', error);
      if (cartStore) {
        cartStore.setError(error.message);
      }
    } finally {
      if (cartStore) {
        cartStore.setLoading(false);
      }
      // Remove processing flag to allow form to be submitted again
      form.dataset.processing = 'false';
    }
  }

  /**
   * Handle quick add button click
   * @param {HTMLElement} button - Quick add button
   */
  async handleQuickAdd(button) {
    // Prevent multiple clicks
    if (button.dataset.processing === 'true') {
      return;
    }
    button.dataset.processing = 'true';
    
    const cartStore = this.getCartStore();
    if (cartStore) {
      cartStore.setLoading(true);
    }

    try {
      const variantId = button.dataset.variantId || button.closest('form')?.querySelector('input[name="id"]')?.value;
      const quantity = parseInt(button.dataset.quantity || '1', 10);

      if (!variantId) {
        throw new Error('Variant ID not found');
      }

      await this.addToCart({
        id: variantId, // Keep as-is (Shopify accepts both string and number)
        quantity,
      });
    } catch (error) {
      console.error('Error with quick add:', error);
      if (cartStore) {
        cartStore.setError(error.message);
      }
    } finally {
      if (cartStore) {
        cartStore.setLoading(false);
      }
      // Remove processing flag to allow button to be clicked again
      button.dataset.processing = 'false';
    }
  }

  /**
   * Add item(s) to cart
   * @param {Object|Array} itemOrItems - Single item or array of items
   * @param {boolean} openCart - Whether to open side cart after adding
   */
  async addToCart(itemOrItems, openCart = true) {
    const cartStore = this.getCartStore();
    if (cartStore) {
      cartStore.setLoading(true);
      cartStore.setError(null);
    }

    try {
      let cart;
      
      // Check if it's multiple items (bundle)
      if (Array.isArray(itemOrItems)) {
        cart = await this.api.addItems(itemOrItems);
      } else {
        cart = await this.api.addItem(itemOrItems);
      }

      // Update store
      if (cartStore) {
        console.log('CartManager.addToCart - Updating store with cart:', cart);
        
        // CRITICAL: Update Alpine store directly for reactivity
        if (typeof window.Alpine !== 'undefined') {
          const store = window.Alpine.store('cart');
          if (store) {
            // Direct property assignment to trigger Alpine reactivity
            const items = Array.isArray(cart.items) ? cart.items : [];
            store.items = items;
            store.item_count = cart.item_count || 0;
            store.total_price = cart.total_price || 0;
            store.formatted_total = store.formatMoney(cart.total_price || 0);
            store.error = null;
            
            console.log('CartManager.addToCart - Directly updated Alpine store:', {
              items: store.items,
              itemsLength: store.items.length,
              item_count: store.item_count
            });
            
            // Also call updateCart for consistency
            cartStore.updateCart(cart);
            
            // Use Alpine's nextTick to ensure DOM updates
            window.Alpine.nextTick(() => {
              console.log('Alpine nextTick - Store items after update:', store.items);
            });
          } else {
            // Fallback to cartStore method if Alpine store not available
            cartStore.updateCart(cart);
          }
        } else {
          // Fallback if Alpine not available
          cartStore.updateCart(cart);
        }
      } else {
        console.warn('CartManager.addToCart - No cart store available');
      }

      // Open side cart with longer delay to ensure Alpine updates
      if (openCart) {
        // Increased delay to ensure Alpine.js has updated the DOM
        setTimeout(() => {
          this.sideCart.open();
        }, 100);
      }

      return cart;
    } catch (error) {
      console.error('Error adding to cart:', error);
      if (cartStore) {
        cartStore.setError(error.message);
      }
      throw error;
    } finally {
      if (cartStore) {
        cartStore.setLoading(false);
      }
    }
  }

  /**
   * Update item quantity
   * @param {string} key - Line item key
   * @param {number} quantity - New quantity
   */
  async updateQuantity(key, quantity) {
    const cartStore = this.getCartStore();
    if (cartStore) {
      cartStore.setLoading(true);
    }

    try {
      const cart = await this.api.updateItem(key, quantity);
      if (cartStore) {
        cartStore.updateCart(cart);
      }
      return cart;
    } catch (error) {
      console.error('Error updating quantity:', error);
      if (cartStore) {
        cartStore.setError(error.message);
      }
      throw error;
    } finally {
      if (cartStore) {
        cartStore.setLoading(false);
      }
    }
  }

  /**
   * Remove item from cart
   * @param {string} key - Line item key
   */
  async removeItem(key) {
    const cartStore = this.getCartStore();
    if (cartStore) {
      cartStore.setLoading(true);
    }

    try {
      const cart = await this.api.removeItem(key);
      
      // Update Alpine store directly for reactivity
      if (cartStore && typeof window.Alpine !== 'undefined') {
        const store = window.Alpine.store('cart');
        if (store) {
          const items = Array.isArray(cart.items) ? cart.items : [];
          store.items = items;
          store.item_count = cart.item_count || 0;
          store.total_price = cart.total_price || 0;
          store.formatted_total = store.formatMoney(cart.total_price || 0);
        }
        cartStore.updateCart(cart);
      } else if (cartStore) {
        cartStore.updateCart(cart);
      }
      return cart;
    } catch (error) {
      console.error('Error removing item:', error);
      if (cartStore) {
        cartStore.setError(error.message);
      }
      throw error;
    } finally {
      if (cartStore) {
        cartStore.setLoading(false);
      }
    }
  }

  /**
   * Get cart manager instance methods for use in Alpine.js
   */
  getMethods() {
    return {
      incrementQuantity: (key) => {
        const cartStore = this.getCartStore();
        if (cartStore) {
          const item = cartStore.getItem(key);
          if (item) {
            this.updateQuantity(key, item.quantity + 1);
          }
        }
      },
      decrementQuantity: (key) => {
        const cartStore = this.getCartStore();
        if (cartStore) {
          const item = cartStore.getItem(key);
          if (item && item.quantity > 1) {
            this.updateQuantity(key, item.quantity - 1);
          }
        }
      },
      removeItem: (key) => {
        this.removeItem(key);
      },
      openCart: () => {
        this.sideCart.open();
      },
      closeCart: () => {
        this.sideCart.close();
      },
    };
  }
}

