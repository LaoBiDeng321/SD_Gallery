class ResponsiveManager {
  constructor() {
    this.debounceTimer = null;
    this.debounceDelay = 250;
    this.currentBreakpoint = null;
    this.breakpoints = {
      mobile: { max: 768, itemsPerPage: { grid: 6, list: 10 } },
      tablet: { max: 1200, itemsPerPage: { grid: 12, list: 15 } },
      desktop: { max: Infinity, itemsPerPage: { grid: 20, list: 20 } }
    };
    
    this.init();
  }

  init() {
    this.detectBreakpoint();
    this.bindEvents();
    console.log(`[Responsive] Initialized at ${this.currentBreakpoint} breakpoint`);
  }

  detectBreakpoint() {
    const width = window.innerWidth;
    let newBreakpoint = 'desktop';

    if (width <= this.breakpoints.mobile.max) {
      newBreakpoint = 'mobile';
    } else if (width <= this.breakpoints.tablet.max) {
      newBreakpoint = 'tablet';
    }

    if (newBreakpoint !== this.currentBreakpoint) {
      const oldBreakpoint = this.currentBreakpoint;
      this.currentBreakpoint = newBreakpoint;
      
      if (oldBreakpoint !== null) {
        console.log(`[Responsive] Breakpoint changed: ${oldBreakpoint} -> ${newBreakpoint}`);
        window.dispatchEvent(new CustomEvent('breakpointChanged', {
          detail: {
            oldBreakpoint,
            newBreakpoint,
            width,
            height: window.innerHeight
          }
        }));
      }
    }

    return this.currentBreakpoint;
  }

  getOptimalItemsPerPage(viewMode = 'grid') {
    const breakpoint = this.breakpoints[this.currentBreakpoint];
    return breakpoint.itemsPerPage[viewMode] || 20;
  }

  calculateOptimalItemsPerPage() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const navbarHeight = 60;
    const pagerHeight = 60;
    const padding = 48;
    const availableHeight = height - navbarHeight - pagerHeight - padding;
    
    const isLandscape = width > height;
    const isMobile = width <= 768;
    const isTablet = width > 768 && width <= 1200;
    
    let gridCols, listItems;
    
    if (isMobile) {
      gridCols = 2;
      listItems = isLandscape ? 15 : 10;
    } else if (isTablet) {
      gridCols = isLandscape ? 5 : 4;
      listItems = isLandscape ? 20 : 15;
    } else {
      gridCols = isLandscape ? 6 : 4;
      listItems = 20;
    }
    
    const cardMinHeight = isMobile ? 180 : 280;
    const rows = Math.max(1, Math.floor(availableHeight / (cardMinHeight + 24)));
    
    const gridItems = gridCols * rows;
    const imageQuality = this.detectImageQuality();
    
    const qualityMultiplier = {
      low: 1.5,
      medium: 1.2,
      high: 1.0
    };
    
    const adjustedGridItems = Math.round(gridItems * qualityMultiplier[imageQuality]);
    
    console.log(`[Responsive] Calculated items: grid=${adjustedGridItems}, list=${listItems}, breakpoint=${this.currentBreakpoint}`);
    
    return {
      grid: Math.min(Math.max(adjustedGridItems, 6), 30),
      list: Math.min(Math.max(listItems, 10), 25),
      cols: gridCols
    };
  }

  detectImageQuality() {
    const pixelRatio = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    
    if (pixelRatio >= 2 || width >= 2560) {
      return 'low';
    } else if (pixelRatio >= 1.5 || width >= 1920) {
      return 'medium';
    }
    return 'high';
  }

  bindEvents() {
    let resizeTimeout = null;
    
    window.addEventListener('resize', () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      
      resizeTimeout = setTimeout(() => {
        this.detectBreakpoint();
        window.dispatchEvent(new CustomEvent('viewportChanged', {
          detail: {
            width: window.innerWidth,
            height: window.innerHeight,
            breakpoint: this.currentBreakpoint
          }
        }));
      }, this.debounceDelay);
    });

    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.detectBreakpoint();
        window.dispatchEvent(new CustomEvent('viewportChanged', {
          detail: {
            width: window.innerWidth,
            height: window.innerHeight,
            breakpoint: this.currentBreakpoint,
            orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
          }
        }));
      }, 100);
    });
  }

  getScreenInfo() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      breakpoint: this.currentBreakpoint,
      pixelRatio: window.devicePixelRatio || 1,
      orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
    };
  }
}

const responsiveManager = new ResponsiveManager();
