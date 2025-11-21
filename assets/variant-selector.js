/**
 * Product Variant Selector
 * Handles variant selection logic for Shopify products with multiple options
 * Supports color swatches, size buttons, and other variant types
 */

export class VariantSelector {
  constructor(productData, sectionId) {
    this.product = productData;
    this.sectionId = sectionId;
    this.selectedOptions = {};

    // DOM elements
    this.variantIdInput = null;
    this.priceElement = null;
    this.compareAtPriceElement = null;
    this.productImages = null;

    // Initialize with first available variant
    const firstVariant = this.product.selected_or_first_available_variant;
    if (firstVariant) {
      this.initializeSelectedOptions(firstVariant);
    }

    this.init();
  }

  /**
   * Initialize the variant selector
   */
  init() {
    this.cacheDOMElements();
    this.attachEventListeners();
    this.updateUI();
  }

  /**
   * Cache DOM elements for performance
   */
  cacheDOMElements() {
    const prefix = `[data-product-form="${this.sectionId}"]`;

    // Hidden variant ID input
    this.variantIdInput = document.querySelector(`${prefix} input[name="id"]`);

    // Price elements
    this.priceElement = document.querySelector(`${prefix} [data-product-price]`);
    this.compareAtPriceElement = document.querySelector(`${prefix} [data-compare-price]`);

    // Product images
    this.productImages = document.querySelectorAll(`[data-product-image="${this.sectionId}"]`);
  }

  /**
   * Initialize selected options from a variant
   */
  initializeSelectedOptions(variant) {
    variant.options.forEach((value, index) => {
      const optionName = this.product.options[index];
      this.selectedOptions[optionName] = value;
    });
  }

  /**
   * Attach event listeners to all variant option buttons/inputs
   */
  attachEventListeners() {
    // Color swatches
    const colorButtons = document.querySelectorAll(
      `[data-variant-option="${this.sectionId}"][data-option-type="color"]`
    );
    colorButtons.forEach(button => {
      button.addEventListener('click', (e) => this.handleOptionClick(e));
    });

    // Size and other option buttons
    const optionButtons = document.querySelectorAll(
      `[data-variant-option="${this.sectionId}"][data-option-type="button"]`
    );
    optionButtons.forEach(button => {
      button.addEventListener('click', (e) => this.handleOptionClick(e));
    });

    // Dropdown selects (fallback)
    const selects = document.querySelectorAll(
      `[data-variant-option="${this.sectionId}"][data-option-type="select"]`
    );
    selects.forEach(select => {
      select.addEventListener('change', (e) => this.handleSelectChange(e));
    });
  }

  /**
   * Handle option button click
   */
  handleOptionClick(event) {
    const button = event.currentTarget;
    const optionName = button.dataset.optionName;
    const optionValue = button.dataset.optionValue;

    // Update selected options
    this.selectedOptions[optionName] = optionValue;

    // Update UI
    this.updateButtonStates(optionName);
    this.updateVariant(optionName);
  }

  /**
   * Handle select dropdown change
   */
  handleSelectChange(event) {
    const select = event.currentTarget;
    const optionName = select.dataset.optionName;
    const optionValue = select.value;

    // Update selected options
    this.selectedOptions[optionName] = optionValue;

    // Update variant
    this.updateVariant(optionName);
  }

  /**
   * Update button states (active/inactive)
   */
  updateButtonStates(changedOptionName) {
    const buttons = document.querySelectorAll(
      `[data-variant-option="${this.sectionId}"][data-option-name="${changedOptionName}"]`
    );

    buttons.forEach(button => {
      const value = button.dataset.optionValue;
      const isSelected = this.selectedOptions[changedOptionName] === value;

      if (isSelected) {
        button.classList.add('variant-option--selected');
        button.setAttribute('aria-pressed', 'true');
      } else {
        button.classList.remove('variant-option--selected');
        button.setAttribute('aria-pressed', 'false');
      }
    });
  }

  /**
   * Find variant matching current selected options
   */
  findMatchingVariant() {
    return this.product.variants.find(variant => {
      return variant.options.every((value, index) => {
        const optionName = this.product.options[index];
        return this.selectedOptions[optionName] === value;
      });
    });
  }

  /**
   * Update variant based on selected options
   * @param {string} changedOptionName - The name of the option that was changed (optional)
   */
  updateVariant(changedOptionName = null) {
    const matchingVariant = this.findMatchingVariant();

    if (matchingVariant) {
      this.updateVariantId(matchingVariant.id);
      this.updatePrice(matchingVariant);

      // Only update gallery image if a color/colour option changed
      const isColorChange = changedOptionName &&
        (changedOptionName.toLowerCase() === 'color' || changedOptionName.toLowerCase() === 'colour');

      if (isColorChange) {
        this.updateImage(matchingVariant);
      }

      this.updateAvailability(matchingVariant);

      // Update URL with variant ID for sharing/bookmarking
      this.updateURL(matchingVariant);

      // Emit custom event for other components
      this.emitVariantChange(matchingVariant);
    } else {
      console.warn('No matching variant found for:', this.selectedOptions);
    }
  }

  /**
   * Update browser URL with selected variant
   */
  updateURL(variant) {
    if (!window.history.replaceState) return;

    const url = new URL(window.location.href);
    url.searchParams.set('variant', variant.id);
    window.history.replaceState({}, '', url.toString());
  }

  /**
   * Update hidden variant ID input
   */
  updateVariantId(variantId) {
    if (this.variantIdInput) {
      this.variantIdInput.value = variantId;
    }
  }

  /**
   * Update price display
   */
  updatePrice(variant) {
    if (this.priceElement && variant.price) {
      this.priceElement.textContent = this.formatMoney(variant.price);
    }

    if (this.compareAtPriceElement) {
      if (variant.compare_at_price && variant.compare_at_price > variant.price) {
        this.compareAtPriceElement.textContent = this.formatMoney(variant.compare_at_price);
        this.compareAtPriceElement.classList.remove('hidden');
      } else {
        this.compareAtPriceElement.classList.add('hidden');
      }
    }
  }

  /**
   * Update product image and gallery
   */
  updateImage(variant) {
    // Only update images if variant has a featured image
    if (!variant.featured_image) {
      return;
    }

    // Update main product images if they exist
    if (this.productImages.length > 0) {
      this.productImages.forEach(img => {
        // Update image src
        if (img.tagName === 'IMG' && variant.featured_image.src) {
          img.src = variant.featured_image.src;
          img.alt = variant.featured_image.alt || variant.title || '';
        }
      });
    }

    // Switch gallery tab to the variant image if gallery exists
    this.switchGalleryImage(variant.featured_media);
  }

  /**
   * Switch gallery to show the variant's featured media
   */
  switchGalleryImage(featuredMedia) {
    if (!featuredMedia || !featuredMedia.position) return;

    // Find the gallery container
    const gallery = document.querySelector(`[data-product-gallery="${this.sectionId}"]`);
    if (!gallery) return;

    // Get all gallery tabs and panels
    const tabs = gallery.querySelectorAll('[data-gallery-tab]');
    const panels = gallery.querySelectorAll('[data-gallery-panel]');

    // Use position to find the matching tab (position is 1-indexed, array is 0-indexed)
    const matchingTabIndex = featuredMedia.position - 1;

    // If we found a matching tab, activate it
    if (matchingTabIndex >= 0 && matchingTabIndex < tabs.length) {
      // Update tabs
      tabs.forEach((t, i) => {
        t.setAttribute('aria-selected', i === matchingTabIndex ? 'true' : 'false');
      });

      // Update panels
      panels.forEach((p, i) => {
        p.setAttribute('aria-hidden', i === matchingTabIndex ? 'false' : 'true');
        p.hidden = i !== matchingTabIndex;
      });
    }
  }

  /**
   * Update availability (in stock / out of stock)
   */
  updateAvailability(variant) {
    const addToCartButton = document.querySelector(
      `form[data-cart-form] button[type="submit"], form[data-cart-form] input[type="submit"]`
    );

    if (addToCartButton) {
      if (variant.available) {
        addToCartButton.disabled = false;
        addToCartButton.textContent = addToCartButton.dataset.textAvailable || 'Add to cart';
      } else {
        addToCartButton.disabled = true;
        addToCartButton.textContent = addToCartButton.dataset.textSoldOut || 'Sold out';
      }
    }
  }

  /**
   * Emit custom event when variant changes
   */
  emitVariantChange(variant) {
    const event = new CustomEvent('variant:changed', {
      detail: {
        variant: variant,
        product: this.product,
        selectedOptions: this.selectedOptions
      },
      bubbles: true
    });
    document.dispatchEvent(event);
  }

  /**
   * Update UI to reflect current state
   */
  updateUI() {
    // Update all button states
    Object.keys(this.selectedOptions).forEach(optionName => {
      this.updateButtonStates(optionName);
    });

    // Find and update current variant
    const currentVariant = this.findMatchingVariant();
    if (currentVariant) {
      this.updateVariantId(currentVariant.id);
      this.updatePrice(currentVariant);
      this.updateAvailability(currentVariant);
    }
  }

  /**
   * Format money using Shopify's money format
   */
  formatMoney(cents) {
    if (typeof Shopify !== 'undefined' && Shopify.formatMoney) {
      return Shopify.formatMoney(cents, Shopify.money_format || '${{amount}}');
    }
    // Fallback formatting
    return `$${(cents / 100).toFixed(2)}`;
  }

  /**
   * Check if an option combination is available
   */
  isOptionAvailable(optionName, optionValue) {
    const testOptions = { ...this.selectedOptions, [optionName]: optionValue };

    return this.product.variants.some(variant => {
      const matches = variant.options.every((value, index) => {
        const name = this.product.options[index];
        return testOptions[name] === value;
      });
      return matches && variant.available;
    });
  }

  /**
   * Disable unavailable options
   */
  updateOptionAvailability() {
    this.product.options.forEach(optionName => {
      const buttons = document.querySelectorAll(
        `[data-variant-option="${this.sectionId}"][data-option-name="${optionName}"]`
      );

      buttons.forEach(button => {
        const optionValue = button.dataset.optionValue;
        const available = this.isOptionAvailable(optionName, optionValue);

        if (!available) {
          button.classList.add('variant-option--unavailable');
          button.disabled = true;
        } else {
          button.classList.remove('variant-option--unavailable');
          button.disabled = false;
        }
      });
    });
  }
}

/**
 * Initialize variant selectors on the page
 */
export function initVariantSelectors() {
  // Find all variant selector containers
  const containers = document.querySelectorAll('[data-variant-selector]');

  containers.forEach(container => {
    const productDataElement = container.querySelector('[data-product-json]');
    const sectionId = container.dataset.variantSelector;

    if (productDataElement) {
      try {
        const productData = JSON.parse(productDataElement.textContent);
        new VariantSelector(productData, sectionId);
      } catch (error) {
        console.error('Error initializing variant selector:', error);
      }
    }
  });
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVariantSelectors);
} else {
  initVariantSelectors();
}
