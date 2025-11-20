class CarouselSlider extends HTMLElement {
  connectedCallback() {
    // Get configuration from data attributes
    this.slidesMobile = parseInt(this.dataset.slidesMobile) || 1;
    this.slidesTablet = parseInt(this.dataset.slidesTablet) || 2;
    this.slidesDesktop = parseInt(this.dataset.slidesDesktop) || 3;
    this.autoplay = this.dataset.autoplay === 'true';
    this.autoplayDelay = parseInt(this.dataset.autoplayDelay) || 5000;
    this.pauseOnHover = this.dataset.pauseOnHover === 'true';
    this.transition = this.dataset.transition || 'scroll';
    this.transitionDuration = this.dataset.transitionDuration || 'duration-500';
    this.showArrows = this.dataset.showArrows === 'true';
    this.showPagination = this.dataset.showPagination === 'true';

    // Get DOM elements
    this.track = this.querySelector('.carousel-track');
    this.slides = Array.from(this.querySelectorAll('.carousel-slide'));
    this.prevBtn = this.querySelector('.carousel-prev');
    this.nextBtn = this.querySelector('.carousel-next');
    this.dots = Array.from(this.querySelectorAll('.carousel-dot'));

    if (!this.track || this.slides.length === 0) return;

    // Initialize state
    this.currentIndex = 0;
    this.autoplayInterval = null;
    this.isTransitioning = false;

    // Set up slides
    this.updateSlideWidths();
    this.updateSlideVisibility();

    // Set up navigation
    if (this.showArrows && this.prevBtn && this.nextBtn) {
      this.prevBtn.addEventListener('click', () => this.prev());
      this.nextBtn.addEventListener('click', () => this.next());
    }

    // Set up pagination dots
    if (this.showPagination && this.dots.length > 0) {
      this.dots.forEach((dot, index) => {
        dot.addEventListener('click', () => this.goToSlide(index));
      });
    }

    // Set up keyboard navigation
    this.track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') this.next();
      if (e.key === 'ArrowLeft') this.prev();
    });

    // Set up scroll snap for scroll transition
    if (this.transition === 'scroll') {
      this.track.addEventListener('scroll', () => {
        this.handleScroll();
      });
    }

    // Update button states
    this.updateButtonState();
    this.updatePaginationState();

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      this.updateSlideWidths();
      this.updateSlideVisibility();
      this.updateButtonState();
    });
    resizeObserver.observe(this.track);

    // Set up autoplay
    if (this.autoplay) {
      this.startAutoplay();

      // Pause on hover
      if (this.pauseOnHover) {
        this.addEventListener('mouseenter', () => this.stopAutoplay());
        this.addEventListener('mouseleave', () => this.startAutoplay());
      }

      // Pause when out of viewport
      const intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              this.startAutoplay();
            } else {
              this.stopAutoplay();
            }
          });
        },
        { threshold: 0.5 }
      );
      intersectionObserver.observe(this);
    }
  }

  // Get current slides per view based on viewport
  getSlidesPerView() {
    const width = window.innerWidth;
    if (width >= 1024) return this.slidesDesktop; // lg breakpoint
    if (width >= 768) return this.slidesTablet; // md breakpoint
    return this.slidesMobile;
  }

  // Update slide widths based on viewport
  updateSlideWidths() {
    const slidesPerView = this.getSlidesPerView();
    const gap = this.getGapSize();
    const totalGap = gap * (slidesPerView - 1);
    const slideWidth = `calc((100% - ${totalGap}px) / ${slidesPerView})`;

    this.slides.forEach((slide) => {
      slide.style.width = slideWidth;
    });
  }

  // Get gap size in pixels from Tailwind class
  getGapSize() {
    const gapClass = this.track.className.match(/gap-(\d+)/);
    if (!gapClass) return 0;
    const gapValue = parseInt(gapClass[1]);
    // Tailwind spacing: gap-0=0, gap-2=8px, gap-4=16px, gap-6=24px, gap-8=32px
    const gapMap = { 0: 0, 2: 8, 4: 16, 6: 24, 8: 32 };
    return gapMap[gapValue] || 16;
  }

  // Update slide visibility for fade/slide transitions
  updateSlideVisibility() {
    if (this.transition === 'scroll') return;

    const slidesPerView = this.getSlidesPerView();
    this.slides.forEach((slide, index) => {
      const isVisible = index >= this.currentIndex && index < this.currentIndex + slidesPerView;

      if (this.transition === 'fade') {
        slide.classList.toggle('opacity-0', !isVisible);
        slide.classList.toggle('opacity-100', isVisible);
        slide.classList.toggle('absolute', !isVisible);
        slide.classList.toggle('relative', isVisible);
      }
    });
  }

  // Navigate to specific slide
  goToSlide(index, smooth = true) {
    if (this.isTransitioning) return;

    const slidesPerView = this.getSlidesPerView();
    const maxIndex = Math.max(0, this.slides.length - slidesPerView);
    this.currentIndex = Math.max(0, Math.min(index, maxIndex));

    if (this.transition === 'scroll') {
      const slideWidth = this.slides[0].offsetWidth;
      const gap = this.getGapSize();
      const scrollPosition = this.currentIndex * (slideWidth + gap);

      this.track.scrollTo({
        left: scrollPosition,
        behavior: smooth ? 'smooth' : 'auto'
      });
    } else {
      this.isTransitioning = true;
      this.updateSlideVisibility();

      // Reset transition flag after animation
      setTimeout(() => {
        this.isTransitioning = false;
      }, 700); // Max transition duration
    }

    this.updateButtonState();
    this.updatePaginationState();
  }

  // Navigate to next slide
  next() {
    const slidesPerView = this.getSlidesPerView();
    const maxIndex = this.slides.length - slidesPerView;

    if (this.currentIndex < maxIndex) {
      this.goToSlide(this.currentIndex + 1);
    } else {
      // Loop back to start
      this.goToSlide(0);
    }
  }

  // Navigate to previous slide
  prev() {
    if (this.currentIndex > 0) {
      this.goToSlide(this.currentIndex - 1);
    } else {
      // Loop to end
      const slidesPerView = this.getSlidesPerView();
      const maxIndex = this.slides.length - slidesPerView;
      this.goToSlide(maxIndex);
    }
  }

  // Handle scroll event for scroll transition
  handleScroll() {
    if (this.transition !== 'scroll') return;

    const slideWidth = this.slides[0].offsetWidth;
    const gap = this.getGapSize();
    const scrollPosition = this.track.scrollLeft;
    const newIndex = Math.round(scrollPosition / (slideWidth + gap));

    if (newIndex !== this.currentIndex) {
      this.currentIndex = newIndex;
      this.updateButtonState();
      this.updatePaginationState();
    }
  }

  // Update button states
  updateButtonState() {
    if (!this.showArrows || !this.prevBtn || !this.nextBtn) return;

    const slidesPerView = this.getSlidesPerView();
    const maxScroll = this.track.scrollWidth - this.track.clientWidth;
    const hasOverflow = maxScroll > 0;
    const atStart = this.currentIndex === 0;
    const atEnd = this.currentIndex >= this.slides.length - slidesPerView;

    // Hide both buttons if no overflow
    if (!hasOverflow) {
      this.prevBtn.style.opacity = '0';
      this.nextBtn.style.opacity = '0';
      this.prevBtn.style.pointerEvents = 'none';
      this.nextBtn.style.pointerEvents = 'none';
      return;
    } else {
      this.prevBtn.style.opacity = '';
      this.nextBtn.style.opacity = '';
      this.prevBtn.style.pointerEvents = '';
      this.nextBtn.style.pointerEvents = '';
    }

    // For looping carousel, always show both buttons
    this.prevBtn.classList.remove('opacity-50', 'pointer-events-none');
    this.prevBtn.classList.add('opacity-100');
    this.nextBtn.classList.remove('opacity-50', 'pointer-events-none');
    this.nextBtn.classList.add('opacity-100');
  }

  // Update pagination dot states
  updatePaginationState() {
    if (!this.showPagination || this.dots.length === 0) return;

    const slidesPerView = this.getSlidesPerView();

    this.dots.forEach((dot, index) => {
      const isActive = index >= this.currentIndex && index < this.currentIndex + slidesPerView;
      dot.classList.toggle('opacity-100', isActive);
      dot.classList.toggle('opacity-30', !isActive);
      dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  // Start autoplay
  startAutoplay() {
    if (!this.autoplay || this.autoplayInterval) return;

    this.autoplayInterval = setInterval(() => {
      this.next();
    }, this.autoplayDelay);
  }

  // Stop autoplay
  stopAutoplay() {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
    }
  }

  // Clean up on disconnect
  disconnectedCallback() {
    this.stopAutoplay();
  }
}

customElements.define('carousel-slider', CarouselSlider);
