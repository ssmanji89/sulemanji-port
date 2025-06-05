/**
 * Utility script to find and debug any problematic dark mode toggles
 * This is a development-only script and should be removed in production
 */

document.addEventListener('DOMContentLoaded', function() {
  // Log information about our toggle
  const ourToggle = document.querySelector('.theme-switch-wrapper');
  if (ourToggle) {
    console.log('Found our theme toggle:', ourToggle);
  } else {
    console.error('Our theme toggle (.theme-switch-wrapper) is missing!');
  }
  
  // Look for any element that might be a dark mode toggle
  const potentialToggles = [];
  
  // Look for elements with moon/sun icons
  document.querySelectorAll('.fa-moon, .fa-sun, [class*="moon"], [class*="sun"]').forEach(el => {
    const toggleParent = findToggleParent(el);
    if (toggleParent && !potentialToggles.includes(toggleParent)) {
      potentialToggles.push(toggleParent);
    }
  });
  
  // Look for elements with dark/light in their text
  document.querySelectorAll('*').forEach(el => {
    if (el.textContent && (
        el.textContent.includes('Dark Mode') || 
        el.textContent.includes('Light Mode') ||
        el.textContent.includes('dark mode') || 
        el.textContent.includes('light mode')
      )) {
      const toggleParent = findToggleParent(el);
      if (toggleParent && !potentialToggles.includes(toggleParent)) {
        potentialToggles.push(toggleParent);
      }
    }
  });
  
  // Look for elements with dark/theme in class/id
  document.querySelectorAll('[class*="dark"], [id*="dark"], [class*="theme"], [id*="theme"]').forEach(el => {
    const toggleParent = el;
    if (toggleParent && !potentialToggles.includes(toggleParent) && !toggleParent.closest('.theme-switch-wrapper')) {
      potentialToggles.push(toggleParent);
    }
  });
  
  // Report findings
  if (potentialToggles.length > 0) {
    console.warn('Found ' + potentialToggles.length + ' potential dark mode toggles that might conflict:');
    potentialToggles.forEach((toggle, index) => {
      console.warn((index + 1) + '. Element:', toggle);
      console.warn('   ↳ HTML: ' + toggle.outerHTML.substring(0, 150) + (toggle.outerHTML.length > 150 ? '...' : ''));
      console.warn('   ↳ Path: ' + getElementPath(toggle));
    });
  } else {
    console.log('No conflicting dark mode toggles found.');
  }
  
  // Check if dark mode is properly applied
  const currentTheme = localStorage.getItem('theme');
  console.log('Current theme from localStorage:', currentTheme);
  console.log('Body has dark-mode class:', document.body.classList.contains('dark-mode'));
  console.log('Document data-theme attribute:', document.documentElement.getAttribute('data-theme'));
});

/**
 * Find the parent element that's likely the toggle
 */
function findToggleParent(element) {
  // Check if element is likely a toggle itself
  if (element.tagName === 'BUTTON' || 
      element.tagName === 'LABEL' || 
      element.tagName === 'INPUT' || 
      element.tagName === 'SELECT' ||
      element.tagName === 'A' ||
      element.getAttribute('role') === 'button' ||
      element.classList.contains('toggle') ||
      element.classList.contains('switch') ||
      element.classList.contains('btn')) {
    return element;
  }
  
  // Check immediate parent
  let parent = element.parentElement;
  if (parent && (
      parent.tagName === 'BUTTON' || 
      parent.tagName === 'LABEL' || 
      parent.tagName === 'A' ||
      parent.getAttribute('role') === 'button' ||
      parent.classList.contains('toggle') ||
      parent.classList.contains('switch') ||
      parent.classList.contains('btn'))) {
    return parent;
  }
  
  // Go up one more level
  if (parent && parent.parentElement) {
    const grandparent = parent.parentElement;
    if (grandparent && (
        grandparent.classList.contains('toggle') ||
        grandparent.classList.contains('switch') ||
        grandparent.classList.contains('theme') ||
        grandparent.classList.contains('dark-mode'))) {
      return grandparent;
    }
  }
  
  // Default to the direct parent
  return parent || element;
}

/**
 * Get a CSS selector path for an element
 */
function getElementPath(element) {
  if (!element) return 'null';
  
  const path = [];
  let currentElement = element;
  
  while (currentElement && currentElement !== document.body && path.length < 5) {
    let selector = currentElement.tagName.toLowerCase();
    
    if (currentElement.id) {
      selector += '#' + currentElement.id;
    } else if (currentElement.className) {
      const classes = Array.from(currentElement.classList).join('.');
      if (classes) {
        selector += '.' + classes;
      }
    }
    
    path.unshift(selector);
    currentElement = currentElement.parentElement;
  }
  
  return path.join(' > ');
}
