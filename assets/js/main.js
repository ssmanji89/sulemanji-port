/**
 * Main JavaScript for sulemanji.com
 * Contains interactive functionality for the portfolio site
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize scroll animations
  initScrollAnimations();
  
  // Initialize dark mode toggle
  initDarkModeToggle();
  
  // Initialize project filtering
  initProjectFilters();
  
  // Initialize syntax highlighting for code blocks
  initSyntaxHighlighting();
  
  // Initialize mobile navigation
  initMobileNavigation();
  
  // Initialize skill proficiency animation
  initSkillProficiencyAnimation();
});

/**
 * Initialize animations for elements when they scroll into view
 */
function initScrollAnimations() {
  const animatedElements = document.querySelectorAll('.animate-on-scroll');
  
  if (animatedElements.length > 0 && !prefersReducedMotion()) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          
          // Remove observer after animation is triggered to improve performance
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px'
    });
    
    animatedElements.forEach(element => {
      observer.observe(element);
    });
  } else {
    // If prefers-reduced-motion, add in-view class to all elements immediately
    animatedElements.forEach(element => {
      element.classList.add('in-view');
    });
  }
}

/**
 * Initialize dark mode toggle functionality
 */
function initDarkModeToggle() {
  const darkModeToggle = document.getElementById('checkbox');
  const themeLabel = document.querySelector('.theme-label');
  const darkModeButtons = document.querySelectorAll('.dark-mode-toggle');
  
  // Check for saved theme preference or respect OS preference
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  const storedTheme = localStorage.getItem('theme');
  
  function setTheme(isDark) {
    if (isDark) {
      document.body.classList.add('dark-mode');
      if (darkModeToggle) {
        darkModeToggle.checked = true;
      }
      if (themeLabel) {
        themeLabel.textContent = 'Light Mode';
      }
    } else {
      document.body.classList.remove('dark-mode');
      if (darkModeToggle) {
        darkModeToggle.checked = false;
      }
      if (themeLabel) {
        themeLabel.textContent = 'Dark Mode';
      }
    }
  }
  
  // Set initial theme
  if (storedTheme === 'dark' || (!storedTheme && prefersDarkScheme.matches)) {
    setTheme(true);
  } else {
    setTheme(false);
  }
  
  // Add event listener for theme toggle
  if (darkModeToggle) {
    darkModeToggle.addEventListener('change', function() {
      setTheme(this.checked);
      localStorage.setItem('theme', this.checked ? 'dark' : 'light');
    });
  }
  
  // Add standalone dark mode toggle buttons
  if (darkModeButtons.length > 0) {
    darkModeButtons.forEach(button => {
      button.addEventListener('click', function() {
        const isDarkMode = document.body.classList.contains('dark-mode');
        setTheme(!isDarkMode);
        localStorage.setItem('theme', !isDarkMode ? 'dark' : 'light');
      });
    });
  }
  
  // Listen for OS theme changes
  prefersDarkScheme.addEventListener('change', e => {
    if (!localStorage.getItem('theme')) {
      setTheme(e.matches);
    }
  });
}

/**
 * Initialize project filtering functionality
 */
function initProjectFilters() {
  const filterButtons = document.querySelectorAll('.filter-btn, .category-btn');
  
  if (filterButtons.length > 0) {
    const targetElements = document.querySelector('.filter-btn') 
      ? document.querySelectorAll('.project-card')
      : document.querySelectorAll('.blog-article');
    
    const filterAttribute = document.querySelector('.filter-btn')
      ? 'data-categories'
      : 'data-categories';
    
    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Remove active class from all buttons
        filterButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        button.classList.add('active');
        
        // Get filter value
        const filterValue = button.getAttribute('data-filter') || button.getAttribute('data-category');
        
        // Filter elements
        targetElements.forEach(element => {
          if (filterValue === 'all') {
            element.style.display = '';
            
            // Optional animation for appearing elements
            if (!prefersReducedMotion()) {
              element.classList.add('filter-fade-in');
              setTimeout(() => {
                element.classList.remove('filter-fade-in');
              }, 500);
            }
          } else {
            const categories = element.getAttribute(filterAttribute).split(',');
            
            if (categories.includes(filterValue)) {
              element.style.display = '';
              
              // Optional animation
              if (!prefersReducedMotion()) {
                element.classList.add('filter-fade-in');
                setTimeout(() => {
                  element.classList.remove('filter-fade-in');
                }, 500);
              }
            } else {
              element.style.display = 'none';
            }
          }
        });
      });
    });
  }
}

/**
 * Initialize syntax highlighting for code blocks
 */
function initSyntaxHighlighting() {
  const codeBlocks = document.querySelectorAll('pre code');
  
  if (window.hljs && codeBlocks.length > 0) {
    codeBlocks.forEach(block => {
      hljs.highlightBlock(block);
    });
  }
}

/**
 * Initialize mobile navigation menu
 */
function initMobileNavigation() {
  const nav = document.querySelector('.main-nav');
  
  if (nav && window.innerWidth <= 480) {
    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.classList.add('mobile-nav-toggle');
    toggleButton.setAttribute('aria-label', 'Toggle navigation menu');
    toggleButton.innerHTML = '<i class="fas fa-bars"></i>';
    
    // Add toggle functionality
    toggleButton.addEventListener('click', function() {
      nav.classList.toggle('open');
      this.innerHTML = nav.classList.contains('open') 
        ? '<i class="fas fa-times"></i>' 
        : '<i class="fas fa-bars"></i>';
      
      // Set aria-expanded attribute
      this.setAttribute('aria-expanded', nav.classList.contains('open'));
    });
    
    // Insert before nav
    nav.parentNode.insertBefore(toggleButton, nav);
    
    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
      if (!nav.contains(event.target) && !toggleButton.contains(event.target) && nav.classList.contains('open')) {
        nav.classList.remove('open');
        toggleButton.innerHTML = '<i class="fas fa-bars"></i>';
        toggleButton.setAttribute('aria-expanded', 'false');
      }
    });
    
    // Close menu when a link is clicked
    const navLinks = nav.querySelectorAll('a');
    navLinks.forEach(link => {
      link.addEventListener('click', function() {
        nav.classList.remove('open');
        toggleButton.innerHTML = '<i class="fas fa-bars"></i>';
        toggleButton.setAttribute('aria-expanded', 'false');
      });
    });
  }
}

/**
 * Initialize skill proficiency bar animations
 */
function initSkillProficiencyAnimation() {
  const skillGroups = document.querySelectorAll('.skill-group');
  
  if (skillGroups.length > 0 && !prefersReducedMotion()) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const proficiencyLevel = entry.target.querySelector('.proficiency-level');
          
          if (proficiencyLevel) {
            const width = proficiencyLevel.style.width || proficiencyLevel.getAttribute('data-width') || '0%';
            
            // Animate the width
            setTimeout(() => {
              proficiencyLevel.style.width = width;
            }, 100);
          }
          
          // Add in-view class for other animations
          entry.target.classList.add('in-view');
          
          // Unobserve after animation
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.2
    });
    
    skillGroups.forEach(group => {
      // Store the width in a data attribute to animate later
      const proficiencyLevel = group.querySelector('.proficiency-level');
      if (proficiencyLevel) {
        const width = proficiencyLevel.style.width;
        proficiencyLevel.setAttribute('data-width', width);
        proficiencyLevel.style.width = '0%';
      }
      
      observer.observe(group);
    });
  } else {
    // If prefers-reduced-motion, just show the bars without animation
    skillGroups.forEach(group => {
      group.classList.add('in-view');
    });
  }
}

/**
 * Check if user prefers reduced motion
 * @returns {boolean} True if user prefers reduced motion
 */
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Lazy load images for performance
 */
function lazyLoadImages() {
  if ('loading' in HTMLImageElement.prototype) {
    // Browser supports native lazy loading
    const images = document.querySelectorAll('img[loading="lazy"]');
    images.forEach(img => {
      img.src = img.dataset.src;
    });
  } else {
    // Fallback for browsers that don't support lazy loading
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lazysizes/5.3.2/lazysizes.min.js';
    document.body.appendChild(script);
  }
}

/**
 * Handle responsive iframes (like YouTube embeds)
 */
function setupResponsiveIframes() {
  const iframes = document.querySelectorAll('iframe');
  
  iframes.forEach(iframe => {
    // Skip if already wrapped
    if (iframe.parentNode.classList.contains('responsive-iframe-container')) {
      return;
    }
    
    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.classList.add('responsive-iframe-container');
    
    // Wrap iframe
    iframe.parentNode.insertBefore(wrapper, iframe);
    wrapper.appendChild(iframe);
    
    // Add aspect ratio class if it's a video embed
    if (iframe.src.includes('youtube.com') || iframe.src.includes('vimeo.com')) {
      wrapper.classList.add('aspect-ratio-16-9');
    }
  });
}

/**
 * Initialize dynamic page header highlighting
 */
function initHeaderHighlighting() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.main-nav a');
  
  if (sections.length > 0 && navLinks.length > 0) {
    window.addEventListener('scroll', () => {
      let current = '';
      const scrollPosition = window.scrollY + 100; // Offset for better UX
      
      sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
          current = section.getAttribute('id');
        }
      });
      
      navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').substring(1) === current) {
          link.classList.add('active');
        }
      });
    });
  }
}

/**
 * Add CSS-only scroll indicator to show more content is available
 */
function addScrollIndicators() {
  const scrollContainers = document.querySelectorAll('.scroll-container');
  
  scrollContainers.forEach(container => {
    // Check if scroll is possible
    if (container.scrollWidth > container.clientWidth) {
      container.classList.add('has-scroll');
      
      // Create indicators
      const leftIndicator = document.createElement('div');
      leftIndicator.classList.add('scroll-indicator', 'scroll-left');
      
      const rightIndicator = document.createElement('div');
      rightIndicator.classList.add('scroll-indicator', 'scroll-right');
      
      // Add to container
      container.appendChild(leftIndicator);
      container.appendChild(rightIndicator);
      
      // Update indicator visibility on scroll
      container.addEventListener('scroll', () => {
        if (container.scrollLeft <= 20) {
          leftIndicator.classList.add('hidden');
        } else {
          leftIndicator.classList.remove('hidden');
        }
        
        if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 20) {
          rightIndicator.classList.add('hidden');
        } else {
          rightIndicator.classList.remove('hidden');
        }
      });
      
      // Initial state
      container.dispatchEvent(new Event('scroll'));
    }
  });
}
