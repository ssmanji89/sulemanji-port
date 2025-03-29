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
});

/**
 * Initialize animations for elements when they scroll into view
 */
function initScrollAnimations() {
  const animatedElements = document.querySelectorAll('.animate-on-scroll');
  
  if (animatedElements.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        }
      });
    }, {
      threshold: 0.1
    });
    
    animatedElements.forEach(element => {
      observer.observe(element);
    });
  }
}

/**
 * Initialize dark mode toggle functionality
 */
function initDarkModeToggle() {
  const darkModeToggle = document.getElementById('checkbox');
  const themeLabel = document.querySelector('.theme-label');
  
  // Check for saved theme preference or respect OS preference
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  const storedTheme = localStorage.getItem('theme');
  
  if (storedTheme === 'dark' || (!storedTheme && prefersDarkScheme.matches)) {
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
  
  // Add event listener for theme toggle
  if (darkModeToggle) {
    darkModeToggle.addEventListener('change', function() {
      if (this.checked) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        if (themeLabel) {
          themeLabel.textContent = 'Light Mode';
        }
      } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
        if (themeLabel) {
          themeLabel.textContent = 'Dark Mode';
        }
      }
    });
  }
  
  // Add standalone dark mode toggle button
  const darkModeButton = document.querySelector('.dark-mode-toggle');
  if (darkModeButton) {
    darkModeButton.addEventListener('click', function() {
      document.body.classList.toggle('dark-mode');
      const isDarkMode = document.body.classList.contains('dark-mode');
      localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
      
      if (darkModeToggle) {
        darkModeToggle.checked = isDarkMode;
      }
      
      if (themeLabel) {
        themeLabel.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
      }
    });
  }
}

/**
 * Initialize project filtering functionality
 */
function initProjectFilters() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project-card');
  
  if (filterButtons.length > 0 && projectCards.length > 0) {
    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Remove active class from all buttons
        filterButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        button.classList.add('active');
        
        // Get filter value
        const filterValue = button.getAttribute('data-filter');
        
        // Filter projects
        projectCards.forEach(card => {
          if (filterValue === 'all') {
            card.style.display = 'block';
          } else {
            const categories = card.getAttribute('data-categories').split(',');
            if (categories.includes(filterValue)) {
              card.style.display = 'block';
            } else {
              card.style.display = 'none';
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
  if (window.hljs) {
    document.querySelectorAll('pre code').forEach(block => {
      hljs.highlightBlock(block);
    });
  }
}
