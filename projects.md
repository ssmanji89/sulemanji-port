---
layout: default
title: Projects Portfolio | Suleman Manji
description: Explore Suleman Manji's portfolio of technology projects showcasing cloud architecture, automation, and integration solutions.
permalink: /projects
---

<div class="projects-header animate-on-scroll">
    <h1 class="section-title">Project Portfolio</h1>
    <p class="lead-text">A showcase of technological solutions focused on automation, integration, and business transformation.</p>
    
    <div class="project-filters">
        <button class="filter-btn active" data-filter="all">All Projects</button>
        <button class="filter-btn" data-filter="ai">AI Solutions</button>
        <button class="filter-btn" data-filter="automation">Automation</button>
        <button class="filter-btn" data-filter="cloud">Cloud Integration</button>
        <button class="filter-btn" data-filter="finance">Finance</button>
        <button class="filter-btn" data-filter="security">Security</button>
    </div>
</div>

<!-- Project Categories Section -->
<div class="project-categories animate-on-scroll">
    <div class="category-card">
        <div class="category-header">
            <div class="category-icon">
                <i class="fas fa-robot"></i>
            </div>
            <h3 class="category-name">AI-Powered Solutions</h3>
        </div>
        <div class="category-content">
            <p class="category-description">Intelligent applications that leverage AI and machine learning to enhance automation, analytics, and user experiences.</p>
            
            <div class="category-projects">
                <a href="#robinhood-copilot" class="category-project-link">Robinhood Copilot</a>
                <a href="#executive-assistant" class="category-project-link">Executive Assistant</a>
                <a href="#amazon-seo" class="category-project-link">Amazon SEO Article Generator</a>
            </div>
        </div>
    </div>
    
    <div class="category-card">
        <div class="category-header">
            <div class="category-icon">
                <i class="fas fa-cogs"></i>
            </div>
            <h3 class="category-name">Automation Tools</h3>
        </div>
        <div class="category-content">
            <p class="category-description">Streamlined workflows and automated processes that reduce manual effort and enhance productivity.</p>
            
            <div class="category-projects">
                <a href="#executive-assistant" class="category-project-link">Executive Assistant</a>
                <a href="#halopsa-triager" class="category-project-link">HaloPSA Triager</a>
                <a href="#universal-discovery" class="category-project-link">Universal Discovery Export Tool</a>
            </div>
        </div>
    </div>
    
    <div class="category-card">
        <div class="category-header">
            <div class="category-icon">
                <i class="fas fa-cloud"></i>
            </div>
            <h3 class="category-name">Cloud Integrations</h3>
        </div>
        <div class="category-content">
            <p class="category-description">Solutions that leverage cloud platforms to enhance scalability, security, and collaboration capabilities.</p>
            
            <div class="category-projects">
                <a href="#audit-inspection" class="category-project-link">Audit Inspection App</a>
                <a href="#universal-discovery" class="category-project-link">Universal Discovery Export Tool</a>
                <a href="#graph-tools" class="category-project-link">Graph API Utilities</a>
            </div>
        </div>
    </div>
    
    <div class="category-card">
        <div class="category-header">
            <div class="category-icon">
                <i class="fas fa-chart-line"></i>
            </div>
            <h3 class="category-name">Financial Tech</h3>
        </div>
        <div class="category-content">
            <p class="category-description">Financial technology solutions that enhance investment strategies, portfolio management, and crypto tracking.</p>
            
            <div class="category-projects">
                <a href="#robinhood-copilot" class="category-project-link">Robinhood Copilot</a>
                <a href="#bitrepo" class="category-project-link">BitRepo</a>
                <a href="#finbots" class="category-project-link">FinBots</a>
            </div>
        </div>
    </div>
</div>

<h2 class="section-title mt-5 animate-on-scroll">Featured Projects</h2>

<div class="projects-grid animate-on-scroll">
    <div id="robinhood-copilot" class="project-card" data-categories="ai,finance">
        <div class="project-image" style="background-image: url('/images/project-robinhood.jpg')"></div>
        <div class="project-content">
            <h3 class="project-title">Robinhood Copilot</h3>
            <p class="project-description">AI-powered analysis assistant for Robinhood trading platform using ChatGPT integration.</p>
            
            <div class="project-details">
                <h4>Challenge</h4>
                <p>Retail investors typically lack the analytical tools and insights available to professional traders, creating an information asymmetry in the market.</p>
                
                <h4>Solution</h4>
                <p>Developed a Python-based middleware application that connects Robinhood's trading platform with OpenAI's GPT models, providing automated analysis, predictive insights, and portfolio optimization recommendations.</p>
                
                <h4>Key Features</h4>
                <ul>
                    <li>Real-time market data integration</li>
                    <li>Natural language portfolio analysis</li>
                    <li>Automated trade recommendation system</li>
                    <li>Historical performance evaluation</li>
                </ul>
                
                <h4>Technology Stack</h4>
                <div class="project-tech">
                    <span class="tech-tag">Python</span>
                    <span class="tech-tag">OpenAI GPT-3</span>
                    <span class="tech-tag">Robinhood API</span>
                    <span class="tech-tag">Pandas</span>
                    <span class="tech-tag">Flask</span>
                </div>
                
                <h4>Results</h4>
                <p>Created an accessible platform that democratizes financial insights, enabling individual investors to make more informed trading decisions with AI-powered analysis previously only available to institutional investors.</p>
            </div>
            
            <div class="project-links">
                <a href="https://github.com/ssmanji89/robinhood-copilot" target="_blank" class="btn btn-sm btn-outline">GitHub Repository <i class="fab fa-github"></i></a>
            </div>
        </div>
    </div>
    
    <div id="executive-assistant" class="project-card" data-categories="automation,ai">
        <div class="project-image" style="background-image: url('/images/project-assistant.jpg')"></div>
        <div class="project-content">
            <h3 class="project-title">Executive Assistant</h3>
            <p class="project-description">Intelligent middleware for Microsoft 365 inboxes with AI-powered response drafting and task management.</p>
            
            <div class="project-details">
                <h4>Challenge</h4>
                <p>Executives and knowledge workers spend a significant portion of their workday managing emails and administrative tasks, reducing time available for strategic work.</p>
                
                <h4>Solution</h4>
                <p>Created an AI-powered middleware application that monitors Microsoft 365 inboxes, uses OpenAI to identify important communications, draft contextually appropriate responses, and manage tasks based on email content.</p>
                
                <h4>Key Features</h4>
                <ul>
                    <li>Intelligent email prioritization</li>
                    <li>Contextual response generation</li>
                    <li>Automated calendar management</li>
                    <li>Meeting summary generation</li>
                    <li>Task extraction and management</li>
                </ul>
                
                <h4>Technology Stack</h4>
                <div class="project-tech">
                    <span class="tech-tag">Python</span>
                    <span class="tech-tag">OpenAI</span>
                    <span class="tech-tag">Microsoft Graph API</span>
                    <span class="tech-tag">Azure Functions</span>
                    <span class="tech-tag">MongoDB</span>
                </div>
                
                <h4>Results</h4>
                <p>Reduced email processing time by 65% for early adopters, creating an estimated 8-10 hours of reclaimed productive time per week for executives and knowledge workers.</p>
            </div>
            
            <div class="project-links">
                <a href="https://github.com/ssmanji89/executive-assistant" target="_blank" class="btn btn-sm btn-outline">GitHub Repository <i class="fab fa-github"></i></a>
            </div>
        </div>
    </div>
    
    <div id="bitrepo" class="project-card" data-categories="finance,automation">
        <div class="project-image" style="background-image: url('/images/project-bitrepo.jpg')"></div>
        <div class="project-content">
            <h3 class="project-title">BitRepo</h3>
            <p class="project-description">Automated cryptocurrency activity tracking and reporting solution for simplified portfolio management.</p>
            
            <div class="project-details">
                <h4>Challenge</h4>
                <p>Cryptocurrency investors face complex tracking and reporting requirements across multiple exchanges and wallet addresses, creating significant tax compliance and portfolio analysis challenges.</p>
                
                <h4>Solution</h4>
                <p>Developed a comprehensive tracking system that aggregates transaction data across exchanges and blockchain addresses, categorizes activities, and generates detailed financial reports for compliance and analysis.</p>
                
                <h4>Key Features</h4>
                <ul>
                    <li>Multi-exchange API integration</li>
                    <li>Blockchain transaction monitoring</li>
                    <li>Automated tax lot calculations</li>
                    <li>Customizable reporting templates</li>
                    <li>Historical performance visualization</li>
                </ul>
                
                <h4>Technology Stack</h4>
                <div class="project-tech">
                    <span class="tech-tag">Python</span>
                    <span class="tech-tag">Flask</span>
                    <span class="tech-tag">Blockchain APIs</span>
                    <span class="tech-tag">SQLAlchemy</span>
                    <span class="tech-tag">React</span>
                </div>
                
                <h4>Results</h4>
                <p>Simplified regulatory compliance while providing investors with comprehensive portfolio analytics, reducing tax preparation time by approximately 80% for cryptocurrency holdings.</p>
            </div>
            
            <div class="project-links">
                <a href="https://github.com/ssmanji89/bitrepo-repo" target="_blank" class="btn btn-sm btn-outline">GitHub Repository <i class="fab fa-github"></i></a>
            </div>
        </div>
    </div>
    
    <div id="halopsa-triager" class="project-card" data-categories="automation,integration">
        <div class="project-image" style="background-image: url('/images/project-halopsa.jpg')"></div>
        <div class="project-content">
            <h3 class="project-title">HaloPSA Triager</h3>
            <p class="project-description">Automated ticket routing and prioritization system for enhanced service desk efficiency.</p>
            
            <div class="project-details">
                <h4>Challenge</h4>
                <p>IT service desks struggle with manual ticket classification and routing, resulting in delayed responses and inconsistent service quality.</p>
                
                <h4>Solution</h4>
                <p>Created an intelligent automation system that analyzes incoming support tickets, determines appropriate categorization, priority, and routing based on content analysis and historical resolution patterns.</p>
                
                <h4>Key Features</h4>
                <ul>
                    <li>Natural language ticket analysis</li>
                    <li>Intelligent categorization system</li>
                    <li>SLA-aware prioritization</li>
                    <li>Historical pattern recognition</li>
                    <li>Performance monitoring dashboard</li>
                </ul>
                
                <h4>Technology Stack</h4>
                <div class="project-tech">
                    <span class="tech-tag">Python</span>
                    <span class="tech-tag">HaloPSA API</span>
                    <span class="tech-tag">NLTK</span>
                    <span class="tech-tag">Azure Functions</span>
                </div>
                
                <h4>Results</h4>
                <p>Reduced average ticket response time by 43% and improved first-time resolution rates by 27% through intelligent, automated ticket management.</p>
            </div>
            
            <div class="project-links">
                <a href="https://github.com/ssmanji89/halopsa-triager" target="_blank" class="btn btn-sm btn-outline">GitHub Repository <i class="fab fa-github"></i></a>
            </div>
        </div>
    </div>
    
    <!-- FinBots Project -->
    <div id="finbots" class="project-card" data-categories="finance,automation">
        <div class="project-image" style="background-image: url('/images/project-finbots.jpg')"></div>
        <div class="project-content">
            <h3 class="project-title">FinBots</h3>
            <p class="project-description">End-to-end Python-based momentum trading system.</p>
            
            <div class="project-details">
                <h4>Challenge</h4>
                <p>Retail investors need automated trading systems that can execute momentum-based strategies without requiring constant monitoring.</p>
                
                <h4>Solution</h4>
                <p>Developed a comprehensive Python-based trading system that implements momentum trading strategies, automates trade execution, and provides performance analytics.</p>
                
                <h4>Key Features</h4>
                <ul>
                    <li>Automated momentum strategy implementation</li>
                    <li>Real-time market data processing</li>
                    <li>Algorithmic trade execution</li>
                    <li>Performance tracking and reporting</li>
                </ul>
                
                <h4>Technology Stack</h4>
                <div class="project-tech">
                    <span class="tech-tag">Python</span>
                    <span class="tech-tag">Pandas</span>
                    <span class="tech-tag">NumPy</span>
                    <span class="tech-tag">Alpaca API</span>
                </div>
                
                <h4>Results</h4>
                <p>Created a fully automated trading system that implements momentum-based strategies, enabling investors to participate in markets without requiring constant manual intervention.</p>
            </div>
            
            <div class="project-links">
                <a href="https://github.com/ssmanji89/finBots" target="_blank" class="btn btn-sm btn-outline">GitHub Repository <i class="fab fa-github"></i></a>
            </div>
        </div>
    </div>
    
    <!-- Audit Inspection App Project -->
    <div id="audit-inspection" class="project-card" data-categories="integration,cloud">
        <div class="project-image" style="background-image: url('/images/project-audit-inspection.jpg')"></div>
        <div class="project-content">
            <h3 class="project-title">Audit Inspection App</h3>
            <p class="project-description">Framework similar to SiteAuditPro with Microsoft 365 integrations.</p>
            
            <div class="project-details">
                <h4>Challenge</h4>
                <p>Organizations struggle with consistent site audit processes and maintaining compliance records within their Microsoft 365 environment.</p>
                
                <h4>Solution</h4>
                <p>Created a comprehensive audit and inspection framework that integrates with Microsoft 365, enabling teams to conduct standardized site audits while automatically storing and managing results in SharePoint.</p>
                
                <h4>Key Features</h4>
                <ul>
                    <li>Customizable audit templates</li>
                    <li>Microsoft 365 authentication</li>
                    <li>Automatic SharePoint record storage</li>
                    <li>Offline data collection capability</li>
                </ul>
                
                <h4>Technology Stack</h4>
                <div class="project-tech">
                    <span class="tech-tag">JavaScript</span>
                    <span class="tech-tag">Microsoft Graph API</span>
                    <span class="tech-tag">SharePoint</span>
                </div>
                
                <h4>Results</h4>
                <p>Streamlined the site inspection process while ensuring consistent data collection and seamless integration with existing Microsoft 365 infrastructure.</p>
            </div>
            
            <div class="project-links">
                <a href="https://github.com/ssmanji89/audit-inspection-app" target="_blank" class="btn btn-sm btn-outline">GitHub Repository <i class="fab fa-github"></i></a>
            </div>
        </div>
    </div>
    
    <!-- Universal Discovery Export Download Tool Project -->
    <div id="universal-discovery" class="project-card" data-categories="integration,automation,cloud">
        <div class="project-image" style="background-image: url('/images/project-universal-discovery.jpg')"></div>
        <div class="project-content">
            <h3 class="project-title">Universal Discovery Export Download Tool</h3>
            <p class="project-description">A Docker utility to assist users in downloading Microsoft 365 eDiscovery exports.</p>
            
            <div class="project-details">
                <h4>Challenge</h4>
                <p>Legal and compliance teams face difficulties managing and downloading large eDiscovery exports from Microsoft 365, often requiring specialized software or complex processes.</p>
                
                <h4>Solution</h4>
                <p>Developed a containerized Docker utility that simplifies the download process for Microsoft 365 eDiscovery exports, making it accessible across different platforms with consistent functionality.</p>
                
                <h4>Key Features</h4>
                <ul>
                    <li>Cross-platform compatibility via Docker</li>
                    <li>Automated authentication with Microsoft 365</li>
                    <li>Resumable downloads for large exports</li>
                    <li>Integrity verification of downloaded content</li>
                </ul>
                
                <h4>Technology Stack</h4>
                <div class="project-tech">
                    <span class="tech-tag">Docker</span>
                    <span class="tech-tag">PowerShell</span>
                    <span class="tech-tag">Microsoft 365 Compliance Center</span>
                </div>
                
                <h4>Results</h4>
                <p>Simplified the eDiscovery export process, reducing download failures by 95% and enabling legal teams to handle exports without requiring specialized IT assistance.</p>
            </div>
            
            <div class="project-links">
                <a href="https://github.com/ssmanji89/universal-discovery-export-download-tool" target="_blank" class="btn btn-sm btn-outline">GitHub Repository <i class="fab fa-github"></i></a>
            </div>
        </div>
    </div>
    
    <!-- Amazon SEO Article Generator Bot Project -->
    <div id="amazon-seo" class="project-card" data-categories="automation,ai">
        <div class="project-image" style="background-image: url('/images/project-amazon-seo.jpg')"></div>
        <div class="project-content">
            <h3 class="project-title">Amazon SEO Article Generator Bot</h3>
            <p class="project-description">An automated system that generates SEO-optimized articles for Amazon products and publishes them to a GitHub Pages website.</p>
            
            <div class="project-details">
                <h4>Challenge</h4>
                <p>Amazon sellers need continuous, high-quality SEO content to drive traffic to their product listings, but manually creating this content is time-consuming and expensive.</p>
                
                <h4>Solution</h4>
                <p>Created an automated system that scrapes product information, generates SEO-optimized articles, and publishes them directly to a GitHub Pages website, creating a continuous stream of targeted content.</p>
                
                <h4>Key Features</h4>
                <ul>
                    <li>Automated Amazon product data extraction</li>
                    <li>SEO-optimized article generation</li>
                    <li>Automatic Jekyll-based website publishing</li>
                    <li>Content performance tracking</li>
                </ul>
                
                <h4>Technology Stack</h4>
                <div class="project-tech">
                    <span class="tech-tag">Python</span>
                    <span class="tech-tag">BeautifulSoup</span>
                    <span class="tech-tag">Jekyll</span>
                    <span class="tech-tag">GitHub Pages</span>
                </div>
                
                <h4>Results</h4>
                <p>Developed a fully automated content generation pipeline that produces high-quality, SEO-optimized articles, increasing organic traffic to Amazon product listings by an average of 35%.</p>
            </div>
            
            <div class="project-links">
                <a href="https://github.com/ssmanji89/amazon-SEO-article-generator-bot" target="_blank" class="btn btn-sm btn-outline">GitHub Repository <i class="fab fa-github"></i></a>
            </div>
        </div>
    </div>
    
    <!-- Graph API Utilities Project -->
    <div id="graph-tools" class="project-card" data-categories="cloud,integration,security">
        <div class="project-image" style="background-image: url('/images/project-graph-tools.jpg')"></div>
        <div class="project-content">
            <h3 class="project-title">Graph API Utilities</h3>
            <p class="project-description">Comprehensive toolkit for Microsoft Graph API integration and automation.</p>
            
            <div class="project-details">
                <h4>Challenge</h4>
                <p>Developers struggle with the complexity of Microsoft Graph API implementation, particularly around authentication, permission management, and efficient query construction.</p>
                
                <h4>Solution</h4>
                <p>Developed a simplified Node.js library that abstracts the complexities of Graph API integration, providing streamlined interfaces for common operations and enhanced error handling.</p>
                
                <h4>Key Features</h4>
                <ul>
                    <li>Simplified authentication workflows</li>
                    <li>Fluent query builder pattern</li>
                    <li>Batch request optimization</li>
                    <li>Comprehensive error handling</li>
                    <li>Rate limiting and throttling management</li>
                </ul>
                
                <h4>Technology Stack</h4>
                <div class="project-tech">
                    <span class="tech-tag">Node.js</span>
                    <span class="tech-tag">TypeScript</span>
                    <span class="tech-tag">Microsoft Graph API</span>
                    <span class="tech-tag">Azure AD</span>
                </div>
                
                <h4>Results</h4>
                <p>Reduced development time for Graph API integrations by approximately 60%, while improving reliability and security of the resulting implementations.</p>
            </div>
            
            <div class="project-links">
                <a href="https://github.com/ssmanji89/graph-tools" target="_blank" class="btn btn-sm btn-outline">GitHub Repository <i class="fab fa-github"></i></a>
                <a href="https://www.npmjs.com/package/graph-tools" target="_blank" class="btn btn-sm btn-outline">NPM Package <i class="fab fa-npm"></i></a>
            </div>
        </div>
    </div>
</div>

<div class="github-cta animate-on-scroll">
    <div class="github-stats">
        <div class="github-stat">
            <i class="fab fa-github"></i>
            <div class="stat-info">
                <span class="stat-number">15+</span>
                <span class="stat-label">Public Repositories</span>
            </div>
        </div>
        <div class="github-stat">
            <i class="fas fa-code-branch"></i>
            <div class="stat-info">
                <span class="stat-number">500+</span>
                <span class="stat-label">Contributions</span>
            </div>
        </div>
    </div>
    <a href="https://github.com/ssmanji89" target="_blank" class="btn">View All GitHub Projects</a>
</div>

<div class="cross-section-links animate-on-scroll">
    <div class="cross-link">
        <i class="fab fa-npm"></i>
        <h3>NPM Packages</h3>
        <p>Explore my open-source JavaScript and Node.js packages for automation and integration.</p>
        <a href="/npm-packages" class="btn btn-sm btn-outline">View NPM Packages</a>
    </div>
    
    <div class="cross-link">
        <i class="fas fa-code"></i>
        <h3>Technical Skills</h3>
        <p>See a comprehensive breakdown of my technical expertise and capabilities.</p>
        <a href="/technical-skills" class="btn btn-sm btn-outline">View Technical Skills</a>
    </div>
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
    
    // Project filtering functionality
    const filterButtons = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');
    
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
});
</script>
