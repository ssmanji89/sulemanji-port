---
layout: default
title: NPM Packages | Suleman Manji
description: Explore Suleman Manji's open-source NPM packages for automation, integration, and developer tooling.
permalink: /npm-packages
---

<div class="npm-header-section animate-on-scroll">
    <div class="npm-header">
        <div class="npm-logo">
            <i class="fab fa-npm"></i>
        </div>
        <div>
            <h1 class="section-title">NPM Packages</h1>
            <p class="section-subtitle">Open-source JavaScript and Node.js packages focused on automation and integration.</p>
        </div>
    </div>
    
    <div class="npm-metrics">
        <div class="npm-metric">
            <div class="npm-metric-value">10+</div>
            <div class="npm-metric-label">Published Packages</div>
        </div>
        <div class="npm-metric">
            <div class="npm-metric-value">5k+</div>
            <div class="npm-metric-label">Monthly Downloads</div>
        </div>
        <div class="npm-metric">
            <div class="npm-metric-value">100+</div>
            <div class="npm-metric-label">GitHub Stars</div>
        </div>
        <div class="npm-metric">
            <div class="npm-metric-value">20+</div>
            <div class="npm-metric-label">Active Contributors</div>
        </div>
    </div>
    
    <div class="npm-profile-link">
        <a href="https://www.npmjs.com/~sullyman" target="_blank" class="btn btn-primary">
            <i class="fab fa-npm"></i> View NPM Profile
        </a>
    </div>
</div>

<h2 class="section-title mt-5 animate-on-scroll">Featured Packages</h2>

<div class="npm-packages animate-on-scroll">
    <!-- m365-utils Package -->
    <div class="npm-package">
        <h3 class="npm-package-name">
            <i class="fab fa-npm"></i> m365-utils
        </h3>
        <p class="npm-package-description">
            Utility library for Microsoft 365 administration and automation tasks. Provides simplified interfaces for common M365 operations.
        </p>
        
        <div class="npm-package-downloads">
            <i class="fas fa-download"></i> 1.2k+ downloads per month
        </div>
        
        <div class="npm-package-install">
            npm install m365-utils
        </div>
        
        <div class="npm-package-example">
            <div class="code-preview">
                <pre><code class="language-javascript">const m365 = require('m365-utils');

// Setup authentication with app registration
await m365.auth.withClientCredentials({
  tenantId: 'your-tenant-id',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret'
});

// Get all SharePoint sites
const sites = await m365.sharepoint.getAllSites();

// Update security settings
await m365.security.enableMFA('user@example.com');</code></pre>
            </div>
        </div>
        
        <div class="npm-package-links">
            <a href="https://github.com/ssmanji89/m365-utils" target="_blank" class="btn btn-sm btn-outline">
                <i class="fab fa-github"></i> GitHub
            </a>
            <a href="https://www.npmjs.com/package/m365-utils" target="_blank" class="btn btn-sm btn-outline">
                <i class="fab fa-npm"></i> NPM
            </a>
        </div>
    </div>
    
    <!-- graph-tools Package -->
    <div class="npm-package">
        <h3 class="npm-package-name">
            <i class="fab fa-npm"></i> graph-tools
        </h3>
        <p class="npm-package-description">
            Comprehensive wrapper for Microsoft Graph API with simplified query building, batching, and authentication handling.
        </p>
        
        <div class="npm-package-downloads">
            <i class="fas fa-download"></i> 850+ downloads per month
        </div>
        
        <div class="npm-package-install">
            npm install graph-tools
        </div>
        
        <div class="npm-package-example">
            <div class="code-preview">
                <pre><code class="language-javascript">const { GraphClient } = require('graph-tools');

// Initialize with Azure AD app registration
const graph = new GraphClient({
  auth: {
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    tenantId: 'your-tenant-id'
  }
});

// Get user details with expanded manager info
const user = await graph.users('john.doe@example.com')
  .expand('manager')
  .select(['displayName', 'jobTitle', 'department'])
  .get();</code></pre>
            </div>
        </div>
        
        <div class="npm-package-links">
            <a href="https://github.com/ssmanji89/graph-tools" target="_blank" class="btn btn-sm btn-outline">
                <i class="fab fa-github"></i> GitHub
            </a>
            <a href="https://www.npmjs.com/package/graph-tools" target="_blank" class="btn btn-sm btn-outline">
                <i class="fab fa-npm"></i> NPM
            </a>
        </div>
    </div>
    
    <!-- azure-automator Package -->
    <div class="npm-package">
        <h3 class="npm-package-name">
            <i class="fab fa-npm"></i> azure-automator
        </h3>
        <p class="npm-package-description">
            Simplified Node.js toolkit for Azure resource provisioning and management with declarative configuration support.
        </p>
        
        <div class="npm-package-downloads">
            <i class="fas fa-download"></i> 720+ downloads per month
        </div>
        
        <div class="npm-package-install">
            npm install azure-automator
        </div>
        
        <div class="npm-package-example">
            <div class="code-preview">
                <pre><code class="language-javascript">const { AzureAutomator } = require('azure-automator');

// Initialize with service principal
const azure = new AzureAutomator({
  tenantId: 'your-tenant-id',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  subscriptionId: 'your-subscription-id'
});

// Create a resource group
await azure.resourceGroups.create('my-resource-group', {
  location: 'eastus',
  tags: {
    environment: 'development',
    project: 'automation-demo'
  }
});</code></pre>
            </div>
        </div>
        
        <div class="npm-package-links">
            <a href="https://github.com/ssmanji89/azure-automator" target="_blank" class="btn btn-sm btn-outline">
                <i class="fab fa-github"></i> GitHub
            </a>
            <a href="https://www.npmjs.com/package/azure-automator" target="_blank" class="btn btn-sm btn-outline">
                <i class="fab fa-npm"></i> NPM
            </a>
        </div>
    </div>
    
    <!-- powershell-runner Package -->
    <div class="npm-package">
        <h3 class="npm-package-name">
            <i class="fab fa-npm"></i> powershell-runner
        </h3>
        <p class="npm-package-description">
            Node.js library for executing PowerShell scripts with improved error handling and result parsing.
        </p>
        
        <div class="npm-package-downloads">
            <i class="fas fa-download"></i> 650+ downloads per month
        </div>
        
        <div class="npm-package-install">
            npm install powershell-runner
        </div>
        
        <div class="npm-package-example">
            <div class="code-preview">
                <pre><code class="language-javascript">const { PowerShell } = require('powershell-runner');

// Create a new PowerShell instance
const ps = new PowerShell();

// Run a script with parameters
const result = await ps.run('Get-Service', {
  parameters: {
    Name: 'BITS',
    ComputerName: 'localhost'
  }
});

console.log(result.status);  // Running, Stopped, etc.

// Run a script file
const scriptResult = await ps.runFile('./scripts/security-audit.ps1', {
  parameters: {
    ReportPath: './security-report.json'
  }
});</code></pre>
            </div>
        </div>
        
        <div class="npm-package-links">
            <a href="https://github.com/ssmanji89/powershell-runner" target="_blank" class="btn btn-sm btn-outline">
                <i class="fab fa-github"></i> GitHub
            </a>
            <a href="https://www.npmjs.com/package/powershell-runner" target="_blank" class="btn btn-sm btn-outline">
                <i class="fab fa-npm"></i> NPM
            </a>
        </div>
    </div>
</div>

<h2 class="section-title mt-5 animate-on-scroll">Integration Examples</h2>

<div class="integration-examples animate-on-scroll">
    <div class="integration-example">
        <div class="integration-header">
            <i class="fas fa-cogs"></i>
            <h3>Microsoft 365 Security Automation</h3>
        </div>
        <div class="integration-content">
            <p>Automating security policy enforcement across M365 services using m365-utils and graph-tools packages.</p>
            <div class="code-preview">
                <pre><code class="language-javascript">const { GraphClient } = require('graph-tools');
const m365 = require('m365-utils');

// Setup authentication
const graph = new GraphClient({...});

// Identify users without MFA
const usersWithoutMFA = await m365.security.getUsersWithoutMFA();

// Apply conditional access policies
for (const user of usersWithoutMFA) {
  await graph.identityProtection.applyPolicy('RequireMFA', user.id);
  await m365.notification.sendEmail({
    to: user.userPrincipalName,
    subject: 'MFA Requirement Notice',
    body: 'Your account requires multi-factor authentication...'
  });
}</code></pre>
            </div>
        </div>
    </div>
</div>

<h2 class="section-title mt-5 animate-on-scroll">Package Development Philosophy</h2>

<div class="philosophy-section animate-on-scroll">
    <div class="philosophy-grid">
        <div class="philosophy-item">
            <i class="fas fa-cube"></i>
            <h3>Modularity</h3>
            <p>Packages are designed with a focus on small, composable modules that can be used independently or combined for complex solutions.</p>
        </div>
        
        <div class="philosophy-item">
            <i class="fas fa-shield-alt"></i>
            <h3>Security First</h3>
            <p>All packages implement secure defaults, credential protection, and follow security best practices for enterprise-grade deployments.</p>
        </div>
        
        <div class="philosophy-item">
            <i class="fas fa-book"></i>
            <h3>Comprehensive Documentation</h3>
            <p>Clear, detailed documentation with practical examples to ensure developers can quickly implement solutions.</p>
        </div>
        
        <div class="philosophy-item">
            <i class="fas fa-code"></i>
            <h3>Type Safety</h3>
            <p>TypeScript definitions and interfaces for improved developer experience and reduced runtime errors.</p>
        </div>
    </div>
</div>

<h2 class="section-title mt-5 animate-on-scroll">Package Roadmap</h2>

<div class="roadmap-section animate-on-scroll">
    <div class="roadmap-timeline">
        <div class="roadmap-item">
            <div class="roadmap-status planned">Planned</div>
            <h3>M365 Governance Toolkit</h3>
            <p>Comprehensive governance solution for Microsoft 365 environments with reporting, remediation, and compliance features.</p>
        </div>
        
        <div class="roadmap-item">
            <div class="roadmap-status in-progress">In Progress</div>
            <h3>Serverless Framework Extensions</h3>
            <p>Azure-focused extensions for the Serverless Framework to simplify cloud function deployment and management.</p>
        </div>
        
        <div class="roadmap-item">
            <div class="roadmap-status planned">Planned</div>
            <h3>AI Integration Framework</h3>
            <p>Simplified integration layer for OpenAI and Azure Cognitive Services with context management and prompt engineering utilities.</p>
        </div>
    </div>
</div>

<div class="contribution-section animate-on-scroll mt-5">
    <h2 class="section-title">Contribute</h2>
    <p>All packages are open-source and welcome contributions. If you're interested in contributing:</p>
    
    <div class="contribution-steps">
        <div class="contribution-step">
            <div class="step-number">1</div>
            <div class="step-content">
                <h4>Find an Issue</h4>
                <p>Browse the GitHub repositories for open issues labeled "good first issue" or "help wanted".</p>
            </div>
        </div>
        
        <div class="contribution-step">
            <div class="step-number">2</div>
            <div class="step-content">
                <h4>Fork the Repository</h4>
                <p>Create your own fork of the repository to work on your changes.</p>
            </div>
        </div>
        
        <div class="contribution-step">
            <div class="step-number">3</div>
            <div class="step-content">
                <h4>Submit a Pull Request</h4>
                <p>Once you've made your changes, submit a pull request with a clear description of the improvements.</p>
            </div>
        </div>
    </div>
    
    <div class="contribution-cta">
        <a href="https://github.com/ssmanji89" target="_blank" class="btn btn-primary">
            <i class="fab fa-github"></i> View GitHub Profile
        </a>
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
    
    // Syntax highlighting for code blocks
    document.querySelectorAll('pre code').forEach(block => {
        if (window.hljs) {
            hljs.highlightBlock(block);
        }
    });
});
</script>
