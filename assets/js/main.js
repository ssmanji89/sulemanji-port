/**
 * Main JavaScript for sulemanji.com (2025 Edition)
 * Modern interactions and functionality
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize all components
  initThemeToggle();
  initMobileMenu();
  initScrollAnimations();
  initStickyHeader();
  initScrollToTop();
  initLazyLoading();
  initProjectFilters();
  initCodeHighlighting();
  initSmoothScroll();
  initTooltips();
  initParallaxEffect();
});

/**
 * Theme Toggle Functionality
 * Modern dark/light mode with localStorage persistence and system preference detection
 */
function initThemeToggle() {
  const themeToggle = document.querySelector('.theme-switch input');
  const themeLabel = document.querySelector('.theme-label');
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  const currentTheme = localStorage.getItem('theme');
  
  // Set initial theme based on saved preference or system preference
  if (currentTheme === 'dark') {
    document.body.classList.add('dark-theme');
    if (themeToggle) themeToggle.checked = true;
    if (themeLabel) themeLabel.textContent = 'Dark Mode';
  } else if (currentTheme === 'light') {
    document.body.classList.remove('dark-theme');
    if (themeToggle) themeToggle.checked = false;
    if (themeLabel) themeLabel.textContent = 'Light Mode';
  } else if (prefersDarkScheme.matches) {
    document.body.classList.add('dark-theme');
    if (themeToggle) themeToggle.checked = true;
    if (themeLabel) themeLabel.textContent = 'Dark Mode';
  }
  
  // Add transition class after initial load to enable smooth theme transitions
  setTimeout(() => {
    document.body.classList.add('theme-transition');
  }, 100);
  
  // Handle theme toggle click
  if (themeToggle) {
    themeToggle.addEventListener('change', function() {
      if (this.checked) {
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
        if (themeLabel) themeLabel.textContent = 'Dark Mode';
      } else {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
        if (themeLabel) themeLabel.textContent = 'Light Mode';
      }
    });
  }
  
  // Handle system preference change
  prefersDarkScheme.addEventListener('change', function(e) {
    // Only update if the user hasn't set a preference
    if (!localStorage.getItem('theme')) {
      if (e.matches) {
        document.body.classList.add('dark-theme');
        if (themeToggle) themeToggle.checked = true;
        if (themeLabel) themeLabel.textContent = 'Dark Mode';
      } else {
        document.body.classList.remove('dark-theme');
        if (themeToggle) themeToggle.checked = false;
        if (themeLabel) themeLabel.textContent = 'Light Mode';
      }
    }
  });
}

/**
 * Mobile Menu Functionality
 * Modern mobile navigation with smooth animations
 */
function initMobileMenu() {
  const menuToggle = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  const mobileNavOverlay = document.querySelector('.mobile-nav-overlay');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav a');
  
  if (!menuToggle || !mobileNav) return;
  
  // Toggle mobile menu
  menuToggle.addEventListener('click', function() {
    menuToggle.classList.toggle('is-active');
    mobileNav.classList.toggle('is-active');
    if (mobileNavOverlay) mobileNavOverlay.classList.toggle('is-active');
    document.body.classList.toggle('menu-open');
  });
  
  // Close menu when overlay is clicked
  if (mobileNavOverlay) {
    mobileNavOverlay.addEventListener('click', function() {
      menuToggle.classList.remove('is-active');
      mobileNav.classList.remove('is-active');
      mobileNavOverlay.classList.remove('is-active');
      document.body.classList.remove('menu-open');
    });
  }
  
  // Close menu when link is clicked
  mobileNavLinks.forEach(link => {
    link.addEventListener('click', function() {
      menuToggle.classList.remove('is-active');
      mobileNav.classList.remove('is-active');
      if (mobileNavOverlay) mobileNavOverlay.classList.remove('is-active');
      document.body.classList.remove('menu-open');
    });
  });
  
  // Handle escape key press
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && mobileNav.classList.contains('is-active')) {
      menuToggle.classList.remove('is-active');
      mobileNav.classList.remove('is-active');
      if (mobileNavOverlay) mobileNavOverlay.classList.remove('is-active');
      document.body.classList.remove('menu-open');
    }
  });
}

/**
 * Scroll Animations
 * Modern reveal animations when elements scroll into view
 */
function initScrollAnimations() {
  // Check if IntersectionObserver is supported
  if (!('IntersectionObserver' in window)) return;
  
  const elementsToAnimate = document.querySelectorAll(
    '.scroll-fade-in, .scroll-slide-up, .scroll-slide-left, .scroll-slide-right, .scroll-scale-in, .stagger-item'
  );
  
  const options = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };
  
  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target); // Stop observing once visible
      }
    });
  }, options);
  
  elementsToAnimate.forEach(element => {
    observer.observe(element);
  });
}

/**
 * Sticky Header
 * Modern header that changes on scroll
 */
function initStickyHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  
  const headerHeight = header.offsetHeight;
  const scrollThreshold = 100; // Pixels to scroll before header changes
  
  window.addEventListener('scroll', function() {
    const scrollPosition = window.scrollY;
    
    if (scrollPosition > scrollThreshold) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
}

/**
 * Scroll to Top Button
 * Modern button that appears when scrolling down
 */
function initScrollToTop() {
  const scrollTopButton = document.querySelector('.scroll-top');
  if (!scrollTopButton) return;
  
  const scrollThreshold = 400; // Pixels to scroll before button appears
  
  // Show/hide button based on scroll position
  window.addEventListener('scroll', function() {
    if (window.scrollY > scrollThreshold) {
      scrollTopButton.classList.add('visible');
    } else {
      scrollTopButton.classList.remove('visible');
    }
  });
  
  // Scroll to top when button is clicked
  scrollTopButton.addEventListener('click', function() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

/**
 * Lazy Loading Images
 * Modern performance optimization for images
 */
function initLazyLoading() {
  // Check if IntersectionObserver is supported
  if (!('IntersectionObserver' in window)) return;
  
  const lazyImages = document.querySelectorAll('img[loading="lazy"]');
  
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.getAttribute('data-src');
        
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
        }
        
        observer.unobserve(img);
      }
    });
  });
  
  lazyImages.forEach(img => {
    imageObserver.observe(img);
  });
}

/**
 * Project Filters
 * Modern filtering system for portfolio projects
 */
function initProjectFilters() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  const projectItems = document.querySelectorAll('.project-item');
  
  if (!filterButtons.length || !projectItems.length) return;
  
  filterButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Update active button
      filterButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      
      const filterValue = this.getAttribute('data-filter');
      
      // Filter projects
      projectItems.forEach(item => {
        if (filterValue === 'all') {
          item.style.display = 'block';
          setTimeout(() => {
            item.classList.remove('hidden');
          }, 10);
        } else if (item.classList.contains(filterValue)) {
          item.style.display = 'block';
          setTimeout(() => {
            item.classList.remove('hidden');
          }, 10);
        } else {
          item.classList.add('hidden');
          setTimeout(() => {
            item.style.display = 'none';
          }, 300);
        }
      });
    });
  });
}

/**
 * Code Highlighting
 * Syntax highlighting for code blocks
 */
function initCodeHighlighting() {
  // Check if highlight.js is loaded
  if (typeof hljs !== 'undefined') {
    document.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block);
    });
  }
}

/**
 * Smooth Scroll
 * Smooth scrolling for anchor links
 */
function initSmoothScroll() {
  const anchorLinks = document.querySelectorAll('a[href^="#"]:not([href="#"])');
  
  anchorLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        const headerHeight = document.querySelector('.site-header')?.offsetHeight || 0;
        const targetPosition = targetElement.getBoundingClientRect().top + window.scrollY - headerHeight;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

/**
 * Tooltips
 * Modern tooltip system
 */
function initTooltips() {
  const tooltipTriggers = document.querySelectorAll('[data-tooltip]');
  
  tooltipTriggers.forEach(trigger => {
    const tooltipText = trigger.getAttribute('data-tooltip');
    const tooltipPosition = trigger.getAttribute('data-tooltip-position') || 'top';
    
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = `tooltip tooltip-${tooltipPosition}`;
    tooltip.textContent = tooltipText;
    
    // Add tooltip to DOM
    document.body.appendChild(tooltip);
    
    // Show tooltip on hover/focus
    trigger.addEventListener('mouseenter', function() {
      const triggerRect = trigger.getBoundingClientRect();
      
      // Position tooltip based on position attribute
      switch (tooltipPosition) {
        case 'top':
          tooltip.style.bottom = `${window.innerHeight - triggerRect.top + 10}px`;
          tooltip.style.left = `${triggerRect.left + triggerRect.width / 2}px`;
          tooltip.style.transform = 'translateX(-50%)';
          break;
        case 'bottom':
          tooltip.style.top = `${triggerRect.bottom + 10}px`;
          tooltip.style.left = `${triggerRect.left + triggerRect.width / 2}px`;
          tooltip.style.transform = 'translateX(-50%)';
          break;
        case 'left':
          tooltip.style.top = `${triggerRect.top + triggerRect.height / 2}px`;
          tooltip.style.right = `${window.innerWidth - triggerRect.left + 10}px`;
          tooltip.style.transform = 'translateY(-50%)';
          break;
        case 'right':
          tooltip.style.top = `${triggerRect.top + triggerRect.height / 2}px`;
          tooltip.style.left = `${triggerRect.right + 10}px`;
          tooltip.style.transform = 'translateY(-50%)';
          break;
      }
      
      tooltip.classList.add('visible');
    });
    
    // Hide tooltip on mouseleave/blur
    trigger.addEventListener('mouseleave', function() {
      tooltip.classList.remove('visible');
    });
    
    trigger.addEventListener('focus', function() {
      const triggerRect = trigger.getBoundingClientRect();
      
      // Position tooltip based on position attribute (same logic as mouseenter)
      switch (tooltipPosition) {
        case 'top':
          tooltip.style.bottom = `${window.innerHeight - triggerRect.top + 10}px`;
          tooltip.style.left = `${triggerRect.left + triggerRect.width / 2}px`;
          tooltip.style.transform = 'translateX(-50%)';
          break;
        case 'bottom':
          tooltip.style.top = `${triggerRect.bottom + 10}px`;
          tooltip.style.left = `${triggerRect.left + triggerRect.width / 2}px`;
          tooltip.style.transform = 'translateX(-50%)';
          break;
        case 'left':
          tooltip.style.top = `${triggerRect.top + triggerRect.height / 2}px`;
          tooltip.style.right = `${window.innerWidth - triggerRect.left + 10}px`;
          tooltip.style.transform = 'translateY(-50%)';
          break;
        case 'right':
          tooltip.style.top = `${triggerRect.top + triggerRect.height / 2}px`;
          tooltip.style.left = `${triggerRect.right + 10}px`;
          tooltip.style.transform = 'translateY(-50%)';
          break;
      }
      
      tooltip.classList.add('visible');
    });
    
    trigger.addEventListener('blur', function() {
      tooltip.classList.remove('visible');
    });
  });
}

/**
 * Parallax Effect
 * Modern parallax scrolling for background elements
 */
function initParallaxEffect() {
  const parallaxElements = document.querySelectorAll('.parallax-bg');
  
  if (!parallaxElements.length) return;
  
  // Update parallax positions on scroll
  window.addEventListener('scroll', function() {
    const scrollPosition = window.scrollY;
    
    parallaxElements.forEach(element => {
      const speed = element.getAttribute('data-parallax-speed') || 0.2;
      const yPos = -(scrollPosition * speed);
      
      element.style.transform = `translate3d(0, ${yPos}px, 0)`;
    });
  });
}

/**
 * Tilt Effect
 * Modern 3D tilt effect for interactive elements
 * @param {string} selector - CSS selector for elements to apply tilt effect
 */
function initTiltEffect(selector = '.tilt-element') {
  const tiltElements = document.querySelectorAll(selector);
  
  if (!tiltElements.length) return;
  
  tiltElements.forEach(element => {
    element.addEventListener('mousemove', function(e) {
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const deltaX = (x - centerX) / centerX;
      const deltaY = (y - centerY) / centerY;
      
      const tiltX = deltaY * 10; // Max tilt in degrees
      const tiltY = -deltaX * 10; // Max tilt in degrees
      
      element.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
    });
    
    element.addEventListener('mouseleave', function() {
      element.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
    });
  });
}

/**
 * Count Up Animation
 * Animate counting up numbers when they scroll into view
 */
function initCountUpAnimation() {
  const countElements = document.querySelectorAll('.count-up');
  
  if (!countElements.length || !('IntersectionObserver' in window)) return;
  
  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;
        const target = parseInt(element.getAttribute('data-target'), 10);
        const duration = parseInt(element.getAttribute('data-duration'), 10) || 2000;
        const increment = target / (duration / 16);
        
        let current = 0;
        const timer = setInterval(() => {
          current += increment;
          element.textContent = Math.floor(current).toLocaleString();
          
          if (current >= target) {
            element.textContent = target.toLocaleString();
            clearInterval(timer);
          }
        }, 16);
        
        observer.unobserve(element);
      }
    });
  });
  
  countElements.forEach(element => {
    observer.observe(element);
  });
}
