/**
 * Main JavaScript for sulemanji.com
 * GitHub-inspired design and interaction patterns
 */

// Use lodash for utility functions
const debounceScroll = _.debounce(function() {
  checkAnimations();
}, 15);

// Initialize on document ready
$(document).ready(function() {
  // Initialize animations
  initAnimations();
  
  // Set up dark mode toggle
  setupDarkMode();
  
  // Initialize project filters
  initProjectFilters();
  
  // Add smooth scrolling to anchor links
  initSmoothScrolling();
  
  // Set up keyboard navigation enhancements
  setupKeyboardNavigation();
  
  // Add parallax effect to hero section
  initParallaxEffect();
  
  // Add sticky header behavior
  initStickyHeader();
  
  // Add intersection observers for scroll animations
  initScrollObservers();
});

/**
 * Animate elements as they come into view
 * Using IntersectionObserver from polyfill
 */
function initAnimations() {
  const animatedElements = document.querySelectorAll('.animate-on-scroll');
  
  if (animatedElements.length) {
    // Check if IntersectionObserver is supported
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade');
            observer.unobserve(entry.target);
          }
        });
      });
      
      animatedElements.forEach(element => {
        observer.observe(element);
      });
    } else {
      // Fallback for browsers that don't support IntersectionObserver
      $(window).on('scroll', debounceScroll);
      checkAnimations();
    }
  }
}

/**
 * Check which elements are in viewport and animate them
 * For browsers without IntersectionObserver support
 */
function checkAnimations() {
  $('.animate-on-scroll').each(function() {
    if (isElementInViewport(this) && !$(this).hasClass('animate-fade')) {
      $(this).addClass('animate-fade');
    }
  });
}

/**
 * Helper to check if element is in viewport
 * @param {HTMLElement} el - Element to check
 * @return {Boolean} - True if element is in viewport
 */
function isElementInViewport(el) {
  const rect = el.getBoundingClientRect();
  return (
    rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.bottom >= 0 &&
    rect.left <= (window.innerWidth || document.documentElement.clientWidth) &&
    rect.right >= 0
  );
}

/**
 * Dark mode toggle with system preference detection
 * Using localStorage for persistence
 */
function setupDarkMode() {
  const $darkModeToggle = $('.dark-mode-toggle');
  
  if ($darkModeToggle.length) {
    // Check for saved user preference
    const darkModePreference = localStorage.getItem('darkMode') === 'true';
    // Check system preference
    const systemPrefersDark = window.matchMedia && 
                              window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Apply appropriate mode
    if (darkModePreference || (localStorage.getItem('darkMode') === null && systemPrefersDark)) {
      $('body').addClass('dark-mode');
      $darkModeToggle.find('i').removeClass('fa-moon').addClass('fa-sun');
      $darkModeToggle.attr('aria-label', 'Switch to light mode');
    } else {
      $darkModeToggle.attr('aria-label', 'Switch to dark mode');
    }
    
    // Toggle dark mode when button is clicked
    $darkModeToggle.on('click', function() {
      $('body').toggleClass('dark-mode');
      
      const isDarkMode = $('body').hasClass('dark-mode');
      localStorage.setItem('darkMode', isDarkMode);
      
      // Update icon and aria-label based on current mode
      if (isDarkMode) {
        $(this).find('i').removeClass('fa-moon').addClass('fa-sun');
        $(this).attr('aria-label', 'Switch to light mode');
      } else {
        $(this).find('i').removeClass('fa-sun').addClass('fa-moon');
        $(this).attr('aria-label', 'Switch to dark mode');
      }
    });
    
    // Listen for system preference changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        // Only apply if user hasn't set a preference
        if (localStorage.getItem('darkMode') === null) {
          if (e.matches) {
            $('body').addClass('dark-mode');
            $darkModeToggle.find('i').removeClass('fa-moon').addClass('fa-sun');
            $darkModeToggle.attr('aria-label', 'Switch to light mode');
          } else {
            $('body').removeClass('dark-mode');
            $darkModeToggle.find('i').removeClass('fa-sun').addClass('fa-moon');
            $darkModeToggle.attr('aria-label', 'Switch to dark mode');
          }
        }
      });
    }
  }
}

/**
 * Animate skill bars when in viewport with ARIA support
 */
function initSkillBars() {
  const $skillLevels = $('.skill-level');
  
  if ($skillLevels.length) {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const $target = $(entry.target);
            const percent = $target.attr('data-level');
            
            // Visual animation
            $target.css('width', percent + '%');
            
            // Add ARIA attributes
            const $skillItem = $target.closest('.skill-item');
            if ($skillItem.length) {
              const $skillName = $skillItem.find('.skill-name span:first-child');
              if ($skillName.length) {
                $target.attr({
                  'aria-valuenow': percent,
                  'aria-valuemin': '0',
                  'aria-valuemax': '100',
                  'role': 'progressbar',
                  'aria-label': $skillName.text() + ': ' + percent + '%'
                });
              }
            }
            
            observer.unobserve(entry.target);
          }
        });
      });
      
      $skillLevels.each(function() {
        // Reset width initially for animation
        $(this).css('width', '0%');
        observer.observe(this);
      });
    } else {
      // Fallback
      $skillLevels.each(function() {
        const percent = $(this).attr('data-level');
        $(this).css('width', percent + '%');
        
        // Set ARIA attributes
        $(this).attr({
          'aria-valuenow': percent,
          'aria-valuemin': '0',
          'aria-valuemax': '100',
          'role': 'progressbar'
        });
      });
    }
  }
}

/**
 * Project filtering with accessibility enhancements
 * Using jQuery for DOM manipulation
 */
function initProjectFilters() {
  const $filterButtons = $('.filter-btn');
  
  if ($filterButtons.length) {
    const $projects = $('.project-card');
    
    // Add ARIA attributes
    const $filterContainer = $filterButtons.first().parent();
    if ($filterContainer.length) {
      $filterContainer.attr({
        'role': 'group',
        'aria-label': 'Project filters'
      });
    }
    
    $filterButtons.each(function() {
      // Set initial ARIA state
      if ($(this).hasClass('active')) {
        $(this).attr('aria-pressed', 'true');
      } else {
        $(this).attr('aria-pressed', 'false');
      }
    });
    
    $filterButtons.on('click', function() {
      // Remove active class from all buttons
      $filterButtons.removeClass('active').attr('aria-pressed', 'false');
      
      // Add active class to clicked button
      $(this).addClass('active').attr('aria-pressed', 'true');
      
      const filter = $(this).attr('data-filter');
      
      // Count for announcement
      let visibleCount = 0;
      
      // Show all projects or filter by category
      $projects.each(function() {
        const $project = $(this);
        const projectCategories = $project.attr('data-categories');
        let isVisible = false;
        
        if (filter === 'all') {
          isVisible = true;
        } else if (projectCategories && projectCategories.includes(filter)) {
          isVisible = true;
        }
        
        if (isVisible) {
          $project.show();
          $project.removeAttr('aria-hidden');
          visibleCount++;
        } else {
          $project.hide();
          $project.attr('aria-hidden', 'true');
        }
      });
      
      // Announce filtering results to screen readers
      announceToScreenReader(`Showing ${visibleCount} ${filter === 'all' ? 'all' : filter} projects`);
    });
  }
}

/**
 * Helper for screen reader announcements
 * @param {String} message - Message to announce
 */
function announceToScreenReader(message) {
  const $announcement = $('<div>', {
    'aria-live': 'polite',
    'aria-atomic': 'true',
    'class': 'sr-only',
    'text': message
  });
  
  $('body').append($announcement);
  
  // Remove after announcement is read
  setTimeout(() => {
    $announcement.remove();
  }, 3000);
}

/**
 * Smooth scrolling to anchor links
 * Using jQuery's animate for cross-browser compatibility
 */
function initSmoothScrolling() {
  $('a[href^="#"]').on('click', function(e) {
    const targetId = $(this).attr('href');
    
    // Only process if the target exists
    if (targetId !== '#' && $(targetId).length) {
      e.preventDefault();
      
      $('html, body').animate({
        scrollTop: $(targetId).offset().top - 50
      }, 800);
      
      // Set focus to the target element for better accessibility
      setTimeout(() => {
        $(targetId).attr('tabindex', '-1').focus().removeAttr('tabindex');
      }, 810);
    }
  });
}

/**
 * Enhanced keyboard navigation
 */
function setupKeyboardNavigation() {
  // Add focus styles to interactive elements
  const $interactiveElements = $('a, button, input, select, textarea, [tabindex="0"]');
  
  $interactiveElements.on({
    'focus': function() {
      $(this).addClass('keyboard-focus');
    },
    'blur': function() {
      $(this).removeClass('keyboard-focus');
    },
    'mousedown': function() {
      $(this).addClass('mouse-focus');
    },
    'keydown': function(e) {
      if (e.key === 'Tab') {
        $(this).removeClass('mouse-focus');
      }
    }
  });
  
  // Make project cards keyboard navigable
  $('.project-card').each(function() {
    // If card doesn't have a focusable element, make it focusable
    if (!$(this).find('a, button, input, [tabindex="0"]').length) {
      $(this).attr({
        'tabindex': '0',
        'role': 'article'
      });
      
      // Add keyboard interaction
      $(this).on('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          // Find and click first link in card
          const $firstLink = $(this).find('a').first();
          if ($firstLink.length) {
            $firstLink[0].click();
          }
        }
      });
    }
  });
}

/**
 * Set up lazy loading for images
 * Using lazysizes library
 */
/**
 * Add parallax effect to hero section
 * Subtle movement on scroll for visual interest
 */
function initParallaxEffect() {
  const $heroSection = $('.hero-section');
  
  if ($heroSection.length) {
    $(window).on('scroll', function() {
      const scrollPosition = $(window).scrollTop();
      const parallaxOffset = scrollPosition * 0.4;
      
      // Move background slightly to create parallax effect
      $heroSection.css('background-position', `center ${50 + parallaxOffset}%`);
      
      // Subtle text movement
      $heroSection.find('.profile-content').css('transform', `translateY(${parallaxOffset / 10}px)`);
    });
  }
}

/**
 * Initialize sticky header behavior
 * Header shrinks on scroll and shows shadow
 */
function initStickyHeader() {
  const $header = $('header');
  const $mainNav = $('.main-nav');
  
  if ($header.length) {
    let lastScrollTop = 0;
    const scrollThreshold = 50;
    
    $(window).on('scroll', function() {
      const scrollTop = $(window).scrollTop();
      
      // Add compact class when scrolling down
      if (scrollTop > scrollThreshold) {
        $header.addClass('compact');
      } else {
        $header.removeClass('compact');
      }
      
      // Hide/show header based on scroll direction
      if (scrollTop > lastScrollTop && scrollTop > 200) {
        // Scrolling down & past threshold
        $header.addClass('header-hidden');
      } else {
        // Scrolling up
        $header.removeClass('header-hidden');
      }
      
      lastScrollTop = scrollTop;
    });
  }
}

/**
 * Set up IntersectionObserver for scroll animations
 * Using native browser APIs for performance
 */
function initScrollObservers() {
  if ('IntersectionObserver' in window) {
    // Fade-in animation observer
    const fadeObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Add visible class with delay based on data attribute
          const delay = entry.target.getAttribute('data-delay') || 0;
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, delay);
          fadeObserver.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px'
    });
    
    // Select all elements with animation classes
    document.querySelectorAll('.fade-in, .slide-up, .slide-in').forEach(el => {
      // Set initial visibility to hidden
      el.style.visibility = 'hidden';
      // Observe element
      fadeObserver.observe(el);
    });
  }
}

/**
 * Setup lazy loading for images
 * Using data-src attribute pattern
 */
function setupLazyLoading() {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          const src = img.getAttribute('data-src');
          
          if (src) {
            img.src = src;
            img.classList.add('loaded');
            imageObserver.unobserve(img);
          }
        }
      });
    });
    
    // Replace src with data-src for images
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  } else {
    // Fallback for browsers without IntersectionObserver
    document.querySelectorAll('img[data-src]').forEach(img => {
      const src = img.getAttribute('data-src');
      if (src) {
        img.src = src;
      }
    });
  }
}
