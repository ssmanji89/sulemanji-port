---
layout: default
title: Blog & Resources | Suleman Manji
description: Technical articles, tutorials, and resources focused on cloud architecture, automation, and Microsoft 365 integration.
permalink: /blog
---

<div class="blog-header animate-on-scroll">
    <h1 class="section-title">Blog & Resources</h1>
    <p class="section-subtitle">Technical insights and tutorials from my experience in enterprise technology</p>
    
    <div class="blog-categories">
        <button class="category-btn active" data-category="all">All Topics</button>
        <button class="category-btn" data-category="automation">Automation</button>
        <button class="category-btn" data-category="development">Development</button>
        <button class="category-btn" data-category="microsoft">Microsoft 365</button>
        <button class="category-btn" data-category="security">Security</button>
    </div>
</div>

<div class="blog-articles animate-on-scroll">
    {% for post in site.posts %}
    <article class="blog-article" data-categories="{{ post.categories | join: ',' }}">
        <div class="article-content">
            <div class="article-meta">
                <span class="article-date"><i class="far fa-calendar-alt"></i> {{ post.date | date: "%B %d, %Y" }}</span>
                {% for category in post.categories %}
                <span class="article-category">{{ category }}</span>
                {% endfor %}
            </div>
            
            <h2 class="article-title"><a href="{{ post.url }}">{{ post.title }}</a></h2>
            
            <div class="article-excerpt">
                {{ post.content | strip_html | truncatewords: 40 }}
            </div>
            
            <div class="article-tags">
                {% for tag in post.tags %}
                <span class="article-tag">{{ tag }}</span>
                {% endfor %}
            </div>
            
            <a href="{{ post.url }}" class="read-more">Read Article <i class="fas fa-arrow-right"></i></a>
        </div>
    </article>
    {% endfor %}
</div>

<div class="resources-section animate-on-scroll">
    <h2 class="section-title">Free Resources</h2>
    <p class="section-subtitle">Download these resources to enhance your technical toolkit</p>
    
    <div class="resources-grid">
        <div class="resource-card">
            <div class="resource-icon">
                <i class="fas fa-file-code"></i>
            </div>
            <h3 class="resource-title">PowerShell Automation Toolkit</h3>
            <p class="resource-description">A collection of PowerShell scripts and modules for common Microsoft 365 automation tasks.</p>
            <a href="/downloads/powershell-toolkit.zip" class="btn btn-sm">Download</a>
        </div>
        
        <div class="resource-card">
            <div class="resource-icon">
                <i class="fas fa-cloud"></i>
            </div>
            <h3 class="resource-title">Azure Architecture Templates</h3>
            <p class="resource-description">Infrastructure-as-code templates for common Azure architecture patterns.</p>
            <a href="/downloads/azure-templates.zip" class="btn btn-sm">Download</a>
        </div>
        
        <div class="resource-card">
            <div class="resource-icon">
                <i class="fas fa-lock"></i>
            </div>
            <h3 class="resource-title">Security Compliance Checklist</h3>
            <p class="resource-description">Comprehensive checklist for Microsoft 365 security and compliance configuration.</p>
            <a href="/downloads/security-checklist.pdf" class="btn btn-sm">Download</a>
        </div>
        
        <div class="resource-card">
            <div class="resource-icon">
                <i class="fas fa-sitemap"></i>
            </div>
            <h3 class="resource-title">Graph API Collection for Postman</h3>
            <p class="resource-description">Ready-to-use Postman collection for Microsoft Graph API development and testing.</p>
            <a href="/downloads/graph-api-postman.json" class="btn btn-sm">Download</a>
        </div>
    </div>
</div>

<div class="newsletter-signup animate-on-scroll">
    <h2>Stay Updated</h2>
    <p>Subscribe to receive notifications when new articles and resources are published</p>
    
    <form class="newsletter-form">
        <input type="email" placeholder="Your email address" required>
        <button type="submit" class="btn">Subscribe</button>
    </form>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    // Animation for elements when they come into view
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    
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
    
    // Blog category filtering
    const categoryButtons = document.querySelectorAll('.category-btn');
    const blogArticles = document.querySelectorAll('.blog-article');
    
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Get category value
            const categoryValue = button.getAttribute('data-category');
            
            // Filter articles
            blogArticles.forEach(article => {
                if (categoryValue === 'all') {
                    article.style.display = 'block';
                } else {
                    const articleCategories = article.getAttribute('data-categories').split(',');
                    if (articleCategories.includes(categoryValue)) {
                        article.style.display = 'block';
                    } else {
                        article.style.display = 'none';
                    }
                }
            });
        });
    });
    
    // Newsletter form submission
    const newsletterForm = document.querySelector('.newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const emailInput = this.querySelector('input[type="email"]');
            const email = emailInput.value;
            
            // Normally you would send this to your backend
            alert(`Thank you for subscribing with ${email}! You'll receive updates when new content is published.`);
            
            // Reset form
            emailInput.value = '';
        });
    }
});
</script>
