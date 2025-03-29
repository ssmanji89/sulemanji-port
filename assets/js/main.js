document.addEventListener('DOMContentLoaded', function() {
    // Initialize animations
    initAnimations();
    
    // Set up dark mode toggle if present
    setupDarkMode();
    
    // Initialize skill bars animation
    initSkillBars();
    
    // Initialize project filters if present
    initProjectFilters();
    
    // Add smooth scrolling to all anchor links
    initSmoothScrolling();
    
    // Set up keyboard navigation enhancements
    setupKeyboardNavigation();
});

// Animate elements as they come into view
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
            animatedElements.forEach(element => {
                element.classList.add('animate-fade');
            });
        }
    }
}

// Dark mode toggling functionality with improved accessibility
function setupDarkMode() {
    const darkModeToggle = document.querySelector('.dark-mode-toggle');
    
    if (darkModeToggle) {
        // Check for saved user preference
        const darkModePreference = localStorage.getItem('darkMode') === 'true';
        // Check system preference
        const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        // Apply appropriate mode
        if (darkModePreference || (localStorage.getItem('darkMode') === null && systemPrefersDark)) {
            document.body.classList.add('dark-mode');
            darkModeToggle.innerHTML = '<i class="fas fa-sun" aria-hidden="true"></i>';
            darkModeToggle.setAttribute('aria-label', 'Switch to light mode');
        } else {
            darkModeToggle.setAttribute('aria-label', 'Switch to dark mode');
        }
        
        // Toggle dark mode when button is clicked
        darkModeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            
            const isDarkMode = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDarkMode);
            
            // Update icon and aria-label based on current mode
            if (isDarkMode) {
                darkModeToggle.innerHTML = '<i class="fas fa-sun" aria-hidden="true"></i>';
                darkModeToggle.setAttribute('aria-label', 'Switch to light mode');
            } else {
                darkModeToggle.innerHTML = '<i class="fas fa-moon" aria-hidden="true"></i>';
                darkModeToggle.setAttribute('aria-label', 'Switch to dark mode');
            }
            
            // Announce mode change to screen readers
            announceToScreenReader(`${isDarkMode ? 'Dark' : 'Light'} mode enabled`);
        });
        
        // Listen for system preference changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                // Only apply if user hasn't set a preference
                if (localStorage.getItem('darkMode') === null) {
                    if (e.matches) {
                        document.body.classList.add('dark-mode');
                        darkModeToggle.innerHTML = '<i class="fas fa-sun" aria-hidden="true"></i>';
                        darkModeToggle.setAttribute('aria-label', 'Switch to light mode');
                    } else {
                        document.body.classList.remove('dark-mode');
                        darkModeToggle.innerHTML = '<i class="fas fa-moon" aria-hidden="true"></i>';
                        darkModeToggle.setAttribute('aria-label', 'Switch to dark mode');
                    }
                }
            });
        }
    }
}

// Helper function to announce messages to screen readers
function announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.classList.add('sr-only'); // Screen reader only
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement is read
    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 3000);
}

// Animate skill bars when in viewport - now with ARIA support
function initSkillBars() {
    const skillLevels = document.querySelectorAll('.skill-level');
    
    if (skillLevels.length) {
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const percent = entry.target.getAttribute('data-level');
                        
                        // Visual animation
                        entry.target.style.width = `${percent}%`;
                        
                        // Add aria values for accessibility
                        const skillItem = entry.target.closest('.skill-item');
                        if (skillItem) {
                            const skillName = skillItem.querySelector('.skill-name span:first-child');
                            if (skillName) {
                                entry.target.setAttribute('aria-valuenow', percent);
                                entry.target.setAttribute('aria-valuemin', '0');
                                entry.target.setAttribute('aria-valuemax', '100');
                                entry.target.setAttribute('role', 'progressbar');
                                entry.target.setAttribute('aria-label', `${skillName.textContent}: ${percent}%`);
                            }
                        }
                        
                        observer.unobserve(entry.target);
                    }
                });
            });
            
            skillLevels.forEach(skill => {
                // Reset width initially for animation
                skill.style.width = '0%';
                observer.observe(skill);
            });
        } else {
            // Fallback
            skillLevels.forEach(skill => {
                const percent = skill.getAttribute('data-level');
                skill.style.width = `${percent}%`;
                
                // Set ARIA attributes
                skill.setAttribute('aria-valuenow', percent);
                skill.setAttribute('aria-valuemin', '0');
                skill.setAttribute('aria-valuemax', '100');
                skill.setAttribute('role', 'progressbar');
                
                const skillItem = skill.closest('.skill-item');
                if (skillItem) {
                    const skillName = skillItem.querySelector('.skill-name span:first-child');
                    if (skillName) {
                        skill.setAttribute('aria-label', `${skillName.textContent}: ${percent}%`);
                    }
                }
            });
        }
    }
}

// Project filtering functionality with improved accessibility
function initProjectFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    if (filterButtons.length) {
        const projects = document.querySelectorAll('.project-card');
        
        // Add ARIA attributes
        const filterContainer = filterButtons[0].parentElement;
        if (filterContainer) {
            filterContainer.setAttribute('role', 'group');
            filterContainer.setAttribute('aria-label', 'Project filters');
        }
        
        filterButtons.forEach(button => {
            // Set initial ARIA state
            if (button.classList.contains('active')) {
                button.setAttribute('aria-pressed', 'true');
            } else {
                button.setAttribute('aria-pressed', 'false');
            }
            
            button.addEventListener('click', () => {
                // Remove active class from all buttons
                filterButtons.forEach(btn => {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-pressed', 'false');
                });
                
                // Add active class to clicked button
                button.classList.add('active');
                button.setAttribute('aria-pressed', 'true');
                
                const filter = button.getAttribute('data-filter');
                
                // Count for announcement
                let visibleCount = 0;
                
                // Show all projects or filter by category
                projects.forEach(project => {
                    const projectCategories = project.getAttribute('data-categories');
                    let isVisible = false;
                    
                    if (filter === 'all') {
                        isVisible = true;
                    } else if (projectCategories && projectCategories.includes(filter)) {
                        isVisible = true;
                    }
                    
                    if (isVisible) {
                        project.style.display = 'block';
                        project.removeAttribute('aria-hidden');
                        visibleCount++;
                    } else {
                        project.style.display = 'none';
                        project.setAttribute('aria-hidden', 'true');
                    }
                });
                
                // Announce filtering results to screen readers
                announceToScreenReader(`Showing ${visibleCount} ${filter === 'all' ? 'all' : filter} projects`);
            });
        });
    }
}

// Smooth scroll to anchor links with improved focus management
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            
            // Only process if the target exists
            if (targetId !== '#' && document.querySelector(targetId)) {
                e.preventDefault();
                
                document.querySelector(targetId).scrollIntoView({
                    behavior: 'smooth'
                });
                
                // Set focus to the target element for better accessibility
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    // Make the element focusable if it's not already
                    if (!targetElement.hasAttribute('tabindex')) {
                        targetElement.setAttribute('tabindex', '-1');
                    }
                    
                    // Set focus after scrolling completes
                    setTimeout(() => {
                        targetElement.focus({preventScroll: true});
                    }, 500);
                }
            }
        });
    });
}

// Enhance keyboard navigation
function setupKeyboardNavigation() {
    // Add focus styles to interactive elements
    const interactiveElements = document.querySelectorAll('a, button, input, select, textarea, [tabindex="0"]');
    
    interactiveElements.forEach(element => {
        // Add clear visual focus indicator for keyboard users
        element.addEventListener('focus', () => {
            element.classList.add('keyboard-focus');
        });
        
        element.addEventListener('blur', () => {
            element.classList.remove('keyboard-focus');
        });
        
        // Add mouse detection to distinguish keyboard vs mouse focus
        element.addEventListener('mousedown', () => {
            element.classList.add('mouse-focus');
        });
        
        element.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                element.classList.remove('mouse-focus');
            }
        });
    });
    
    // Make project cards keyboard navigable
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach(card => {
        // If card doesn't have a focusable element, make it focusable
        if (!card.querySelector('a, button, input, [tabindex="0"]')) {
            card.setAttribute('tabindex', '0');
            card.setAttribute('role', 'article');
            
            // Add keyboard interaction
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    // Find and click first link in card
                    const firstLink = card.querySelector('a');
                    if (firstLink) {
                        firstLink.click();
                    }
                }
            });
        }
    });
}

// Add CSS classes needed for accessibility that aren't in the CSS
document.addEventListener('DOMContentLoaded', function() {
    // Add a screen reader only class
    const style = document.createElement('style');
    style.textContent = `
        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border-width: 0;
        }
        
        .keyboard-focus:not(.mouse-focus):focus {
            outline: 3px solid var(--focus-color, orange) !important;
            outline-offset: 2px !important;
        }
    `;
    document.head.appendChild(style);
});
