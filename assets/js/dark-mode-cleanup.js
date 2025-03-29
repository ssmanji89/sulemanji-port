/**
 * Script to remove extra dark mode toggles
 */
document.addEventListener('DOMContentLoaded', function() {
  removeExtraToggles();
  
  // Also run after a short delay to catch elements loaded later
  setTimeout(removeExtraToggles, 500);
  setTimeout(removeExtraToggles, 1500);
});

/**
 * Remove any extra dark mode toggles that might be injected
 */
function removeExtraToggles() {
  console.log('Cleaning up extra dark mode toggles');
  
  // Look for the specific toggle at the bottom of the page
  const toggleElements = document.querySelectorAll('body > *:not(.wrapper):not(script):not(style):not(link):not(meta)');
  
  toggleElements.forEach(function(element) {
    // Check if this looks like a dark mode toggle
    if (element.textContent.includes('Dark Mode') || 
        element.textContent.includes('Light Mode') ||
        element.innerHTML.includes('moon') ||
        element.innerHTML.includes('sun')) {
      console.log('Removing detected dark mode toggle:', element);
      element.remove();
    }
    
    // Check for elements at the bottom of the page
    const rect = element.getBoundingClientRect();
    const bottomOfPage = window.innerHeight - 100;
    
    if (rect.top > bottomOfPage) {
      console.log('Removing element near bottom of page:', element);
      element.remove();
    }
  });
  
  // Specific cleanup for the element in the screenshot
  const moonSunElements = document.querySelectorAll('.fa-moon, .fa-sun');
  moonSunElements.forEach(function(element) {
    if (!element.closest('.theme-switch-wrapper')) {
      const parent = element.parentElement;
      if (parent && !parent.closest('.theme-switch-wrapper')) {
        console.log('Removing fa-moon/fa-sun element outside theme-switch-wrapper:', parent);
        parent.remove();
      }
    }
  });
  
  // Look for elements with dark mode in the class or id
  const darkModeElements = document.querySelectorAll('[class*="dark-mode"], [id*="dark-mode"], [class*="darkMode"], [id*="darkMode"]');
  darkModeElements.forEach(function(element) {
    if (!element.closest('.theme-switch-wrapper')) {
      console.log('Removing element with dark-mode class/id:', element);
      element.remove();
    }
  });
}
