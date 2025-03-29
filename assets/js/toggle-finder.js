/**
 * Tool to find where the dark mode toggle is coming from
 */
(function() {
  // Function to log when dark mode toggle appears
  function findToggleSource() {
    console.log('Looking for dark mode toggle sources...');
    
    // Check all script elements
    const scripts = document.querySelectorAll('script');
    scripts.forEach(function(script) {
      if (script.textContent && 
          (script.textContent.includes('dark') || script.textContent.includes('mode') || 
           script.textContent.includes('theme') || script.textContent.includes('toggle'))) {
        console.log('Potential script source for toggle:', script);
        console.log('Script content:', script.textContent.slice(0, 200) + '...');
      }
      
      if (script.src) {
        console.log('External script that might be source:', script.src);
      }
    });
    
    // Check for specific toggle in the DOM
    const toggle = document.querySelector('body > *:not(.wrapper) [class*="dark-mode"], body > *:not(.wrapper) [class*="theme"], [class*="moon"]:not(.theme-switch-wrapper [class*="moon"]), [class*="sun"]:not(.theme-switch-wrapper [class*="sun"])');
    
    if (toggle) {
      console.log('Found toggle element:', toggle);
      console.log('Toggle HTML:', toggle.outerHTML);
      console.log('Toggle parent:', toggle.parentElement);
      
      // Remove it
      toggle.style.display = 'none';
      if (toggle.parentElement && !toggle.parentElement.closest('.wrapper')) {
        toggle.parentElement.style.display = 'none';
      }
    }
    
    // Look at the bottom of the page
    const bottomElements = Array.from(document.querySelectorAll('body > *')).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.bottom > window.innerHeight - 100;
    });
    
    if (bottomElements.length) {
      console.log('Found elements at bottom of page:', bottomElements);
      bottomElements.forEach(el => {
        if (!el.closest('.wrapper') && !el.matches('script')) {
          console.log('Removing bottom element:', el);
          el.style.display = 'none';
        }
      });
    }
  }
  
  // Run on load
  window.addEventListener('load', function() {
    // Wait a moment for all scripts to load
    setTimeout(findToggleSource, 1000);
  });
})();
