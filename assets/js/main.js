/**
 * Main JavaScript for sulemanji.com
 * GitHub-inspired design and interaction patterns
 */

// Initialize on document ready
$(document).ready(function() {
  // Initialize dark mode toggle
  initDarkMode();
  
  // Add smooth scrolling to anchor links
  initSmoothScrolling();
});

/**
 * Initialize dark mode functionality
 */
function initDarkMode() {
  const toggleSwitch = document.querySelector('#checkbox');
  const currentTheme = localStorage.getItem('theme');
  
  // Check for saved user preference
  if (currentTheme) {
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    if (currentTheme === 'dark') {
      toggleSwitch.checked = true;
      document.body.classList.add('dark-mode');
    }
  } else {
    // Check system preference
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    if (prefersDarkScheme.matches) {
      toggleSwitch.checked = true;
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      localStorage.setItem('theme', 'light');
    }
  }
  
  // Listen for toggle changes
  toggleSwitch.addEventListener('change', function(e) {
    if (this.checked) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }    
  });
  
  // Listen for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    // Only apply if user hasn't set a preference
    const savedTheme = localStorage.getItem('theme');
    if (!savedTheme) {
      if (e.matches) {
        toggleSwitch.checked = true;
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
      } else {
        toggleSwitch.checked = false;
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
      }
    }
  });
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
