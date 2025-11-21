/**
 * Grid Slider Component
 * Responsive grid that converts to carousel on specified breakpoints
 */
class GridSlider extends HTMLElement {
  constructor() {
    super();
    this.track = null;
    this.slides = [];
    this.currentIndex = 0;
    this.isCarouselMode = false;
    this.autoplayInterval = null;

    // Breakpoint thresholds
    this.breakpoints = {
      mobile: 768,
      tablet: 1024
    };
  }

  connectedCallback() {
    this.track = this.querySelector('.grid-slider-track');
    if (!this.track) return;

    this.slides = Array.from(this.track.children);

    // Get settings from data attributes
    this.settings = {
      carouselMobile: this.dataset.carouselMobile === 'true',
      carouselTablet: this.dataset.carouselTablet === 'true',
      slidesMobile: parseInt(this.dataset.slidesMobile) || 1,
      slidesTablet: parseInt(this.dataset.slidesTablet) || 2,
      slidesDesktop: parseInt(this.dataset.slidesDesktop) || 3,
      startSlide: parseInt(this.dataset.startSlide) || 1,
      showArrows: this.dataset.showArrows === 'true',
      showPagination: this.dataset.showPagination === 'true',
      autoplay: this.dataset.autoplay === 'true',
      autoplayDelay: parseInt(this.dataset.autoplayDelay) || 5000,
      gap: this.dataset.gap || 'gap-4'
    };

    // Set initial slide
    this.currentIndex = Math.max(0, Math.min(this.settings.startSlide - 1, this.slides.length - 1));

    this.setupNavigation();
    this.setupPagination();
    this.handleResize();

    // Setup event listeners
    window.addEventListener('resize', this.debounce(() => this.handleResize(), 150));

    // Keyboard navigation
    this.track.addEventListener('keydown', (e) => {
      if (!this.isCarouselMode) return;
      if (e.key === 'ArrowLeft') this.prev();
      if (e.key === 'ArrowRight') this.next();
    });

    // Pause autoplay on hover
    if (this.settings.autoplay) {
      this.addEventListener('mouseenter', () => this.stopAutoplay());
      this.addEventListener('mouseleave', () => this.startAutoplay());
    }
  }

  disconnectedCallback() {
    this.stopAutoplay();
  }

  handleResize() {
    const width = window.innerWidth;
    const wasCarouselMode = this.isCarouselMode;

    // Determine if carousel mode should be active
    if (width < this.breakpoints.mobile) {
      this.isCarouselMode = this.settings.carouselMobile;
      this.slidesPerView = this.settings.slidesMobile;
    } else if (width < this.breakpoints.tablet) {
      this.isCarouselMode = this.settings.carouselTablet;
      this.slidesPerView = this.settings.slidesTablet;
    } else {
      this.isCarouselMode = false; // Desktop always shows grid
      this.slidesPerView = this.settings.slidesDesktop;
    }

    // Toggle carousel features
    if (this.isCarouselMode) {
      this.activateCarousel();
      if (this.settings.autoplay && !wasCarouselMode) {
        this.startAutoplay();
      }
    } else {
      this.deactivateCarousel();
      this.stopAutoplay();
    }

    this.updateSlideWidths();
    this.updateNavigation();
    this.updatePagination();
  }

  activateCarousel() {
    this.track.classList.add('overflow-x-auto', 'scroll-smooth', 'snap-x', 'snap-mandatory', 'no-scrollbar');
    this.track.classList.remove('grid');
    this.track.style.display = 'flex';

    this.slides.forEach(slide => {
      slide.classList.add('snap-start', 'shrink-0', 'flex');
      slide.style.alignSelf = 'stretch';
    });

    // Show navigation if enabled
    const prevBtn = this.querySelector('.grid-slider-prev');
    const nextBtn = this.querySelector('.grid-slider-next');
    const pagination = this.querySelector('.grid-slider-pagination');

    if (this.settings.showArrows) {
      if (prevBtn) prevBtn.style.display = 'flex';
      if (nextBtn) nextBtn.style.display = 'flex';
    }

    if (this.settings.showPagination && pagination) {
      pagination.style.display = 'flex';
    }

    // Scroll to current slide
    this.scrollToSlide(this.currentIndex);
  }

  deactivateCarousel() {
    this.track.classList.remove('overflow-x-auto', 'scroll-smooth', 'snap-x', 'snap-mandatory', 'no-scrollbar');
    this.track.classList.add('grid');
    this.track.style.display = '';

    this.slides.forEach(slide => {
      slide.classList.remove('snap-start', 'shrink-0', 'flex');
      slide.style.width = '';
      slide.style.alignSelf = '';
    });

    // Hide navigation
    const prevBtn = this.querySelector('.grid-slider-prev');
    const nextBtn = this.querySelector('.grid-slider-next');
    const pagination = this.querySelector('.grid-slider-pagination');

    if (prevBtn) prevBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'none';
    if (pagination) pagination.style.display = 'none';
  }

  updateSlideWidths() {
    if (!this.isCarouselMode) return;

    const gap = this.getGapSize();
    const slidesPerView = this.slidesPerView;
    const totalGap = gap * (slidesPerView - 1);
    const slideWidth = `calc((100% - ${totalGap}px) / ${slidesPerView})`;

    this.slides.forEach(slide => {
      slide.style.width = slideWidth;
    });
  }

  getGapSize() {
    // Extract gap size from Tailwind class
    const gapMap = {
      'gap-0': 0,
      'gap-1': 4,
      'gap-2': 8,
      'gap-3': 12,
      'gap-4': 16,
      'gap-5': 20,
      'gap-6': 24,
      'gap-8': 32,
      'gap-10': 40,
      'gap-12': 48
    };
    return gapMap[this.settings.gap] || 16;
  }

  setupNavigation() {
    const prevBtn = this.querySelector('.grid-slider-prev');
    const nextBtn = this.querySelector('.grid-slider-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.prev());
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.next());
    }
  }

  setupPagination() {
    const pagination = this.querySelector('.grid-slider-pagination');
    if (!pagination) return;

    // Create dots
    pagination.innerHTML = '';
    this.slides.forEach((_, index) => {
      const dot = document.createElement('button');
      dot.className = 'grid-slider-dot w-2 h-2 rounded-full transition-all';
      dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
      dot.addEventListener('click', () => this.goToSlide(index));
      pagination.appendChild(dot);
    });
  }

  updateNavigation() {
    if (!this.isCarouselMode) return;

    const prevBtn = this.querySelector('.grid-slider-prev');
    const nextBtn = this.querySelector('.grid-slider-next');

    if (prevBtn) {
      prevBtn.disabled = this.currentIndex === 0;
      prevBtn.classList.toggle('opacity-50', this.currentIndex === 0);
    }

    if (nextBtn) {
      const maxIndex = this.slides.length - this.slidesPerView;
      nextBtn.disabled = this.currentIndex >= maxIndex;
      nextBtn.classList.toggle('opacity-50', this.currentIndex >= maxIndex);
    }
  }

  updatePagination() {
    if (!this.isCarouselMode) return;

    const dots = this.querySelectorAll('.grid-slider-dot');
    dots.forEach((dot, index) => {
      const isActive = index === this.currentIndex;
      dot.classList.toggle('bg-black', isActive);
      dot.classList.toggle('bg-gray-300', !isActive);
      dot.classList.toggle('w-6', isActive);
      dot.classList.toggle('w-2', !isActive);
    });
  }

  prev() {
    if (this.currentIndex > 0) {
      this.goToSlide(this.currentIndex - 1);
    }
  }

  next() {
    const maxIndex = this.slides.length - this.slidesPerView;
    if (this.currentIndex < maxIndex) {
      this.goToSlide(this.currentIndex + 1);
    }
  }

  goToSlide(index) {
    this.currentIndex = Math.max(0, Math.min(index, this.slides.length - 1));
    this.scrollToSlide(this.currentIndex);
    this.updateNavigation();
    this.updatePagination();

    if (this.settings.autoplay) {
      this.stopAutoplay();
      this.startAutoplay();
    }
  }

  scrollToSlide(index) {
    if (!this.isCarouselMode || !this.slides[index]) return;

    const slide = this.slides[index];
    const scrollLeft = slide.offsetLeft - this.track.offsetLeft;

    this.track.scrollTo({
      left: scrollLeft,
      behavior: 'smooth'
    });
  }

  startAutoplay() {
    if (!this.settings.autoplay || !this.isCarouselMode) return;

    this.stopAutoplay();
    this.autoplayInterval = setInterval(() => {
      const maxIndex = this.slides.length - this.slidesPerView;
      if (this.currentIndex >= maxIndex) {
        this.goToSlide(0);
      } else {
        this.next();
      }
    }, this.settings.autoplayDelay);
  }

  stopAutoplay() {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
    }
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

customElements.define('grid-slider', GridSlider);
