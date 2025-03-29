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

// Dark mode toggling functionality
function setupDarkMode() {
    const darkModeToggle = document.querySelector('.dark-mode-toggle');
    
    if (darkModeToggle) {
        // Check for saved user preference
        const darkModePreference = localStorage.getItem('darkMode') === 'true';
        
        // Apply dark mode if previously selected
        if (darkModePreference) {
            document.body.classList.add('dark-mode');
            darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
        
        // Toggle dark mode when button is clicked
        darkModeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            
            const isDarkMode = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDarkMode);
            
            // Update icon based on current mode
            darkModeToggle.innerHTML = isDarkMode 
                ? '<i class="fas fa-sun"></i>' 
                : '<i class="fas fa-moon"></i>';
        });
    }
}

// Animate skill bars when in viewport
function initSkillBars() {
    const skillLevels = document.querySelectorAll('.skill-level');
    
    if (skillLevels.length) {
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const percent = entry.target.getAttribute('data-level');
                        entry.target.style.width = `${percent}%`;
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
            });
        }
    }
}

// Project filtering functionality
function initProjectFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    if (filterButtons.length) {
        const projects = document.querySelectorAll('.project-card');
        
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons
                filterButtons.forEach(btn => btn.classList.remove('active'));
                
                // Add active class to clicked button
                button.classList.add('active');
                
                const filter = button.getAttribute('data-filter');
                
                // Show all projects or filter by category
                projects.forEach(project => {
                    if (filter === 'all') {
                        project.style.display = 'block';
                    } else {
                        const projectCategories = project.getAttribute('data-categories');
                        if (projectCategories && projectCategories.includes(filter)) {
                            project.style.display = 'block';
                        } else {
                            project.style.display = 'none';
                        }
                    }
                });
            });
        });
    }
}

// Smooth scroll to anchor links
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
            }
        });
    });
}
