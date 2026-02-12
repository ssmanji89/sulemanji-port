---
layout: default
title: Projects Portfolio | Suleman Manji | Hands-On Solutions
description: Explore Suleman Manji's portfolio of technology projects, showcasing a hands-on, analytical approach to cloud architecture, automation, AI integration, and security solutions. Keywords: project portfolio, hands-on projects, analytical solutions, technology projects, AI, automation, cloud integration, security, finance technology, problem-solving.
permalink: /projects
---

<div class="projects-header animate-on-scroll">
    <h1 class="section-title">Project Portfolio</h1>
    <p class="lead-text">A showcase of technological solutions developed with a **hands-on**, **analytical** approach, focused on automation, integration, and practical business transformation.</p>
    
    <div class="project-filters">
        <button class="filter-btn active" data-filter="all">All Projects</button>
        <button class="filter-btn" data-filter="mcp">MCP / AI Agents</button>
        <button class="filter-btn" data-filter="migration">Enterprise Migration</button>
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
            <h3 class="category-name">MCP & AI Agent Development</h3>
        </div>
        <div class="category-content">
            <p class="category-description">MCP servers and Claude Code plugins bridging enterprise platforms — M365, ITGlue, ConnectWise, HaloPSA — with AI-powered autonomous agents.</p>

            <div class="category-projects">
                <a href="#graph-mcp-server" class="category-project-link">Graph MCP Server</a>
                <a href="#viyu-itglue-agents" class="category-project-link">viyu-itglue-agents</a>
                <a href="#halopsa-workflows-mcp" class="category-project-link">halopsa-workflows-mcp</a>
            </div>
        </div>
    </div>

    <div class="category-card">
        <div class="category-header">
            <div class="category-icon">
                <i class="fas fa-exchange-alt"></i>
            </div>
            <h3 class="category-name">Enterprise Migration</h3>
        </div>
        <div class="category-content">
            <p class="category-description">Migration tooling and orchestration for tenant-to-tenant M365 migrations at scale — SharePoint, Exchange, OneDrive, and device management.</p>

            <div class="category-projects">
                <a href="#ezmig" class="category-project-link">EZMig</a>
                <a href="#graph-tools" class="category-project-link">Graph API Utilities</a>
                <a href="#universal-discovery" class="category-project-link">Universal Discovery Export Tool</a>
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
            <p class="category-description">Workflow automation with Power Automate, n8n, Python, and PowerShell — reducing manual effort and driving operational efficiency across MSP platforms.</p>

            <div class="category-projects">
                <a href="#n8n-cavelo-nodes" class="category-project-link">n8n-cavelo-nodes</a>
                <a href="#executive-assistant" class="category-project-link">Executive Assistant</a>
                <a href="#halopsa-triager" class="category-project-link">HaloPSA Triager</a>
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
            <p class="category-description">Solutions leveraging cloud platforms for scalability, security, and collaboration — Azure, M365, and Microsoft Graph API integrations.</p>

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
            <p class="category-description">Financial technology solutions for investment, portfolio management, and cryptocurrency tracking with automated analysis.</p>

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
    <!-- Graph MCP Server -->
    <div id="graph-mcp-server" class="project-card" data-categories="mcp,cloud">
        <div class="project-image" style="background-image: url('/images/project-graph-tools.jpg')"></div>
        <div class="project-content">
            <h3 class="project-title">Graph MCP Server</h3>
            <p class="project-description">101-tool MCP server providing complete Microsoft 365 access via Claude — users, mail, Teams, SharePoint, OneDrive, Intune, and security operations.</p>

            <div class="project-details">
                <h4>Challenge</h4>
                <p>AI assistants lack native access to Microsoft 365 data, requiring manual context-switching between tools and limiting autonomous workflows.</p>

                <h4>Solution</h4>
                <p>Built a comprehensive MCP server exposing 101 Microsoft Graph API operations to Claude, enabling natural language M365 administration, reporting, and automation.</p>

                <h4>Key Features</h4>
                <ul>
                    <li>101 tools spanning Users, Mail, Calendar, Teams, SharePoint, OneDrive, Intune, Security</li>
                    <li>OAuth 2.0 authentication with delegated and application permissions</li>
                    <li>Batch operations and pagination for large datasets</li>
                    <li>Multi-tenant support for MSP environments</li>
                </ul>

                <h4>Technology Stack</h4>
                <div class="project-tech">
                    <span class="tech-tag">TypeScript</span>
                    <span class="tech-tag">MCP Protocol</span>
                    <span class="tech-tag">Microsoft Graph API</span>
                    <span class="tech-tag">OAuth 2.0</span>
                </div>
            </div>

            <div class="project-links">
                <a href="https://github.com/ssmanji89/viyu-graph-mcp" target="_blank" class="btn btn-sm btn-outline">GitHub Repository <i class="fab fa-github"></i></a>
            </div>
        </div>
    </div>

    <!-- viyu-itglue-agents -->
    <div id="viyu-itglue-agents" class="project-card" data-categories="mcp,automation">
        <div class="project-image" style="background-image: url('/images/project-assistant.jpg')"></div>
        <div class="project-content">
            <h3 class="project-title">viyu-itglue-agents</h3>
            <p class="project-description">Claude Code plugin with 31 skills and 7 autonomous agents orchestrating M365 and ITGlue for MSP automation — saving 10-15 hours/week.</p>

            <div class="project-details">
                <h4>Challenge</h4>
                <p>MSP teams spend hours on repetitive tasks — syncing documentation, onboarding/offboarding users, generating compliance reports, and auditing configurations across disconnected platforms.</p>

                <h4>Solution</h4>
                <p>Developed a Claude Code plugin that orchestrates Graph MCP (101 tools) and ITGlue MCP (31 tools) through 31 skills and 7 autonomous agents for end-to-end MSP workflow automation.</p>

                <h4>Key Features</h4>
                <ul>
                    <li>Automated data sync between M365 and ITGlue documentation</li>
                    <li>Employee lifecycle management (onboarding/offboarding)</li>
                    <li>Compliance reporting and identity posture assessment</li>
                    <li>Credential monitoring and contract renewal tracking</li>
                    <li>Show-before-write diff previews and audit logging</li>
                </ul>

                <h4>Technology Stack</h4>
                <div class="project-tech">
                    <span class="tech-tag">TypeScript</span>
                    <span class="tech-tag">Claude Code SDK</span>
                    <span class="tech-tag">ITGlue API</span>
                    <span class="tech-tag">Microsoft Graph API</span>
                </div>
            </div>

            <div class="project-links">
                <a href="https://github.com/ssmanji89" target="_blank" class="btn btn-sm btn-outline">GitHub Profile <i class="fab fa-github"></i></a>
            </div>
        </div>
    </div>

    <!-- EZMig -->
    <div id="ezmig" class="project-card" data-categories="migration,cloud">
        <div class="project-image" style="background-image: url('/images/project-universal-discovery.jpg')"></div>
        <div class="project-content">
            <h3 class="project-title">EZMig</h3>
            <p class="project-description">14-phase SharePoint migration platform with Azure Blob staging, incremental sync, and cross-tenant permission mapping.</p>

            <div class="project-details">
                <h4>Challenge</h4>
                <p>Enterprise SharePoint migrations require careful orchestration of content, permissions, metadata, and version history across tenants — existing tools lack flexibility for complex scenarios.</p>

                <h4>Solution</h4>
                <p>Engineered a 14-phase migration platform handling discovery, packaging, Azure Blob staging, incremental sync, permission mapping, and validation with comprehensive checkpoint management.</p>

                <h4>Key Features</h4>
                <ul>
                    <li>14-phase migration lifecycle with checkpoint recovery</li>
                    <li>Azure Blob Storage staging with SAS token management</li>
                    <li>Incremental sync and delta detection</li>
                    <li>Cross-tenant permission and identity mapping</li>
                    <li>React dashboard for migration monitoring</li>
                </ul>

                <h4>Technology Stack</h4>
                <div class="project-tech">
                    <span class="tech-tag">Python</span>
                    <span class="tech-tag">Azure Blob Storage</span>
                    <span class="tech-tag">SharePoint Migration API</span>
                    <span class="tech-tag">PostgreSQL</span>
                    <span class="tech-tag">React</span>
                </div>
            </div>

            <div class="project-links">
                <a href="https://github.com/ssmanji89/ezmig" target="_blank" class="btn btn-sm btn-outline">GitHub Repository <i class="fab fa-github"></i></a>
            </div>
        </div>
    </div>

    <!-- halopsa-workflows-mcp -->
    <div id="halopsa-workflows-mcp" class="project-card" data-categories="mcp,automation">
        <div class="project-image" style="background-image: url('/images/project-halopsa.jpg')"></div>
        <div class="project-content">
            <h3 class="project-title">halopsa-workflows-mcp</h3>
            <p class="project-description">Published npm MCP package integrating HaloPSA workflows with Claude and AI assistants for IT service management automation.</p>

            <div class="project-details">
                <h4>Challenge</h4>
                <p>IT service desks need AI-powered ticket management, workflow automation, and reporting — but HaloPSA lacks native AI integration.</p>

                <h4>Solution</h4>
                <p>Built a scalable MCP server exposing HaloPSA ticket management, agent workflows, and reporting to Claude — published on npm and featured in MCP registries.</p>

                <h4>Key Features</h4>
                <ul>
                    <li>Ticket CRUD operations with intelligent routing</li>
                    <li>Agent workflow automation and SLA tracking</li>
                    <li>Published on npm with 4 GitHub stars</li>
                    <li>Featured in MCP Container and Glama registries</li>
                </ul>

                <h4>Technology Stack</h4>
                <div class="project-tech">
                    <span class="tech-tag">TypeScript</span>
                    <span class="tech-tag">MCP Protocol</span>
                    <span class="tech-tag">HaloPSA API</span>
                    <span class="tech-tag">npm</span>
                </div>
            </div>

            <div class="project-links">
                <a href="https://github.com/ssmanji89/halopsa-workflows-mcp" target="_blank" class="btn btn-sm btn-outline">GitHub Repository <i class="fab fa-github"></i></a>
                <a href="https://www.npmjs.com/package/halopsa-workflows-mcp" target="_blank" class="btn btn-sm btn-outline">NPM Package <i class="fab fa-npm"></i></a>
            </div>
        </div>
    </div>

    <!-- n8n-cavelo-nodes -->
    <div id="n8n-cavelo-nodes" class="project-card" data-categories="automation,security">
        <div class="project-image" style="background-image: url('/images/project-audit-inspection.jpg')"></div>
        <div class="project-content">
            <h3 class="project-title">n8n-cavelo-nodes</h3>
            <p class="project-description">Original n8n community nodes for Cavelo attack surface management — extending n8n's automation capabilities for security operations.</p>

            <div class="project-details">
                <h4>Challenge</h4>
                <p>MSPs using Cavelo for attack surface management lack integration with popular workflow automation platforms, forcing manual data extraction and reporting.</p>

                <h4>Solution</h4>
                <p>Created custom n8n community nodes providing native Cavelo API integration within n8n workflows — enabling automated security scanning, asset discovery, and vulnerability reporting.</p>

                <h4>Key Features</h4>
                <ul>
                    <li>Native n8n node for Cavelo API operations</li>
                    <li>Asset discovery and attack surface monitoring</li>
                    <li>Automated vulnerability reporting workflows</li>
                    <li>Community contribution to n8n ecosystem</li>
                </ul>

                <h4>Technology Stack</h4>
                <div class="project-tech">
                    <span class="tech-tag">TypeScript</span>
                    <span class="tech-tag">n8n</span>
                    <span class="tech-tag">Cavelo API</span>
                </div>
            </div>

            <div class="project-links">
                <a href="https://github.com/viyusmanji/n8n-cavelo-nodes" target="_blank" class="btn btn-sm btn-outline">GitHub Repository <i class="fab fa-github"></i></a>
            </div>
        </div>
    </div>

    <div id="robinhood-copilot" class="project-card" data-categories="ai,finance">
        <div class="project-image" style="background-image: url('/images/project-robinhood.jpg')"></div>
        <div class="project-content">
            <h3 class="project-title">Robinhood Copilot</h3>
            <p class="project-description">AI-powered **analytical assistant** for Robinhood trading platform using ChatGPT integration.</p>
            
            <div class="project-details">
                <h4>Challenge</h4>
                <p>Retail investors typically lack the **analytical tools** and insights available to professional traders, creating an information asymmetry in the market.</p>
                
                <h4>Solution</h4>
                <p>Developed a Python-based middleware application (**hands-on development**) connecting Robinhood's platform with OpenAI's GPT models, providing automated analysis, predictive insights, and portfolio optimization recommendations based on **data analysis**.</p>
                
                <h4>Key Features</h4>
                <ul>
                    <li>Real-time market data integration</li>
                    <li>Natural language portfolio **analysis**</li>
                    <li>Automated trade recommendation system</li>
                    <li>Historical performance evaluation (**analytical**)</li>
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
                <p>Created an accessible platform that democratizes financial insights, enabling individual investors to make more informed trading decisions with AI-powered **analysis** previously only available to institutional investors.</p>
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
            <p class="project-description">Intelligent middleware for Microsoft 365 inboxes with AI-powered response drafting and task management, a **practical automation** solution.</p>
            
            <div class="project-details">
                <h4>Challenge</h4>
                <p>Executives and knowledge workers spend significant time managing emails, reducing availability for strategic work. This required a **practical, automated solution**.</p>
                
                <h4>Solution</h4>
                <p>Created an AI-powered middleware application (**hands-on integration**) monitoring Microsoft 365 inboxes, using OpenAI for intelligent communication handling, response drafting, and task management based on **content analysis**.</p>
                
                <h4>Key Features</h4>
                <ul>
                    <li>Intelligent email prioritization (**analytical**)</li>
                    <li>Contextual response generation</li>
                    <li>Automated calendar management</li>
                    <li>Meeting summary generation</li>
                    <li>Task extraction and management (**practical**)</li>
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
                <p>Reduced email processing time by 65% for early adopters, demonstrating the **practical impact** of AI-driven automation by reclaiming 8-10 hours of productive time weekly.</p>
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
            <p class="project-description">Automated cryptocurrency activity tracking and reporting solution for simplified portfolio management, requiring **methodical data handling**.</p>
            
            <div class="project-details">
                <h4>Challenge</h4>
                <p>Cryptocurrency investors face complex tracking across multiple sources, creating significant compliance and **analytical challenges**.</p>
                
                <h4>Solution</h4>
                <p>Developed a comprehensive tracking system (**hands-on development**) aggregating transaction data, categorizing activities, and generating detailed financial reports through **systematic processing**.</p>
                
                <h4>Key Features</h4>
                <ul>
                    <li>Multi-exchange API integration</li>
                    <li>Blockchain transaction monitoring</li>
                    <li>Automated tax lot calculations (**analytical**)</li>
                    <li>Customizable reporting templates</li>
                    <li>Historical performance visualization (**data-driven**)</li>
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
                <p>Simplified regulatory compliance and provided comprehensive portfolio **analytics**, reducing tax preparation time by ~80% through **structured automation**.</p>
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
            <p class="project-description">Automated ticket routing and prioritization system, enhancing service desk efficiency through **intelligent analysis**.</p>
            
            <div class="project-details">
                <h4>Challenge</h4>
                <p>IT service desks struggle with manual ticket classification, leading to delays. An **analytical approach** to automation was needed.</p>
                
                <h4>Solution</h4>
                <p>Created an intelligent automation system (**hands-on implementation**) analyzing incoming tickets, determining categorization, priority, and routing based on **content analysis** and historical patterns.</p>
                
                <h4>Key Features</h4>
                <ul>
                    <li>Natural language ticket **analysis**</li>
                    <li>Intelligent categorization system</li>
                    <li>SLA-aware prioritization</li>
                    <li>Historical pattern recognition (**analytical**)</li>
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
                <p>Reduced average ticket response time by 43% and improved first-time resolution rates by 27% through **analytical**, automated ticket management.</p>
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
            <p class="project-description">End-to-end Python-based momentum trading system, a **practical application** of automated strategies.</p>
            
            <div class="project-details">
                <h4>Challenge</h4>
                <p>Retail investors need automated trading systems to execute **data-driven** strategies without constant monitoring.</p>
                
                <h4>Solution</h4>
                <p>Developed a comprehensive Python-based trading system (**hands-on coding**) implementing momentum strategies, automating execution, and providing performance **analytics**.</p>
                
                <h4>Key Features</h4>
                <ul>
                    <li>Automated momentum strategy implementation (**analytical**)</li>
                    <li>Real-time market data processing</li>
                    <li>Algorithmic trade execution</li>
                    <li>Performance tracking and reporting (**data-driven**)</li>
                </ul>
                
                <h4>Technology Stack</h4>
                <div class="project-tech">
                    <span class="tech-tag">Python</span>
                    <span class="tech-tag">Pandas</span>
                    <span class="tech-tag">NumPy</span>
                    <span class="tech-tag">Alpaca API</span>
                </div>
                
                <h4>Results</h4>
                <p>Created a fully automated trading system implementing momentum-based strategies, enabling investors to participate in markets via a **practical, hands-off tool**.</p>
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
            <p class="project-description">Framework similar to SiteAuditPro with **practical** Microsoft 365 integrations for **structured** data collection.</p>
            
            <div class="project-details">
                <h4>Challenge</h4>
                <p>Organizations need consistent site audit processes integrated with their M365 environment. A **structured, conventional** approach was required.</p>
                
                <h4>Solution</h4>
                <p>Created a comprehensive audit framework (**hands-on development**) integrating with M365, enabling standardized audits with automatic SharePoint record storage, adhering to **established procedures**.</p>
                
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
                <p>Streamlined the site inspection process, ensuring consistent data collection and seamless integration with existing M365 infrastructure using a **practical, procedural** tool.</p>
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
            <p class="project-description">A Docker utility providing a **practical solution** for downloading Microsoft 365 eDiscovery exports.</p>
            
            <div class="project-details">
                <h4>Challenge</h4>
                <p>Legal/compliance teams face difficulties managing large eDiscovery exports, needing a simplified, **reliable tool**.</p>
                
                <h4>Solution</h4>
                <p>Developed a containerized Docker utility (**hands-on configuration**) simplifying the eDiscovery export download process, making it accessible and consistent across platforms.</p>
                
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
                <p>Simplified the eDiscovery export process, reducing download failures by 95% and enabling legal teams to handle exports without specialized IT assistance, demonstrating **practical utility**.</p>
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
            <p class="project-description">An automated system (**hands-on automation**) generating SEO-optimized articles for Amazon products and publishing them.</p>
            
            <div class="project-details">
                <h4>Challenge</h4>
                <p>Amazon sellers need continuous, high-quality SEO content, but manual creation is time-consuming. This required an **efficient, automated** approach.</p>
                
                <h4>Solution</h4>
                <p>Created an automated system (**practical implementation**) scraping product info, generating SEO articles, and publishing to GitHub Pages for a continuous stream of targeted content.</p>
                
                <h4>Key Features</h4>
                <ul>
                    <li>Automated Amazon product data extraction</li>
                    <li>SEO-optimized article generation</li>
                    <li>Automatic Jekyll-based website publishing</li>
                    <li>Content performance tracking (**analytical**)</li>
                </ul>
                
                <h4>Technology Stack</h4>
                <div class="project-tech">
                    <span class="tech-tag">Python</span>
                    <span class="tech-tag">BeautifulSoup</span>
                    <span class="tech-tag">Jekyll</span>
                    <span class="tech-tag">GitHub Pages</span>
                </div>
                
                <h4>Results</h4>
                <p>Developed a fully automated content generation pipeline producing high-quality, SEO-optimized articles, demonstrating **practical automation** increasing organic traffic by an average of 35%.</p>
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
            <p class="project-description">Comprehensive toolkit providing a **practical abstraction** for Microsoft Graph API integration and automation.</p>
            
            <div class="project-details">
                <h4>Challenge</h4>
                <p>Developers face complexity with Graph API implementation, needing a **simpler, structured approach**.</p>
                
                <h4>Solution</h4>
                <p>Developed a simplified Node.js library (**hands-on coding**) abstracting Graph API complexities, providing streamlined interfaces for common operations and enhanced error handling based on **understanding system needs**.</p>
                
                <h4>Key Features</h4>
                <ul>
                    <li>Simplified authentication workflows</li>
                    <li>Fluent query builder pattern (**structured**)</li>
                    <li>Batch request optimization</li>
                    <li>Comprehensive error handling</li>
                    <li>Rate limiting management</li>
                </ul>
                
                <h4>Technology Stack</h4>
                <div class="project-tech">
                    <span class="tech-tag">Node.js</span>
                    <span class="tech-tag">TypeScript</span>
                    <span class="tech-tag">Microsoft Graph API</span>
                    <span class="tech-tag">Azure AD</span>
                </div>
                
                <h4>Results</h4>
                <p>Reduced development time for Graph API integrations by ~60%, improving reliability and security through a **practical, well-structured library**.</p>
            </div>
            
            <div class="project-links">
                <a href="https://github.com/ssmanji89/graph-tools" target="_blank" class="btn btn-sm btn-outline">GitHub Repository <i class="fab fa-github"></i></a>
                <a href="https://www.npmjs.com/package/graph-tools" target="_blank" class="btn btn-sm btn-outline">NPM Package <i class="fab fa-npm"></i></a>
            </div>
        </div>
    </div>
</div>

<div class="about-section animate-on-scroll mt-5">
    <h2 class="section-title">Open Source Contributions</h2>
    <p>Active contributor to MSP and automation tooling ecosystems — forking and enhancing projects to fit enterprise workflows.</p>
    <div class="project-tech" style="margin-top: 1rem;">
        <a href="https://github.com/ssmanji89/claude-mem" target="_blank" class="tech-tag">claude-mem</a>
        <a href="https://github.com/ssmanji89/spec-kitty" target="_blank" class="tech-tag">spec-kitty</a>
        <a href="https://github.com/viyusmanji/n8n-nodes-msp-ai" target="_blank" class="tech-tag">n8n-nodes-msp-ai</a>
        <a href="https://github.com/viyusmanji/OpenIntuneBaseline" target="_blank" class="tech-tag">OpenIntuneBaseline</a>
        <a href="https://github.com/viyusmanji/ConnectWiseManageAPI" target="_blank" class="tech-tag">ConnectWiseManageAPI</a>
    </div>
</div>

<div class="github-cta animate-on-scroll">
    <div class="github-stats">
        <div class="github-stat">
            <i class="fab fa-github"></i>
            <div class="stat-info">
                <span class="stat-number">75+</span>
                <span class="stat-label">Public Repositories</span>
            </div>
        </div>
        <div class="github-stat">
            <i class="fas fa-robot"></i>
            <div class="stat-info">
                <span class="stat-number">130+</span>
                <span class="stat-label">MCP Tools Built</span>
            </div>
        </div>
    </div>
    <a href="https://github.com/ssmanji89" target="_blank" class="btn">View All GitHub Projects</a>
</div>

<div class="cross-section-links animate-on-scroll">
    <div class="cross-link">
        <i class="fab fa-github"></i>
        <h3>GitHub & Open Source</h3>
        <p>75+ repositories spanning MCP servers, migration tools, and MSP automation across <a href="https://github.com/ssmanji89" target="_blank">ssmanji89</a> and <a href="https://www.npmjs.com/~sullyman" target="_blank">npm</a>.</p>
        <a href="https://github.com/ssmanji89" target="_blank" class="btn btn-sm btn-outline">View GitHub Profile</a>
    </div>

    <div class="cross-link">
        <i class="fas fa-code"></i>
        <h3>Technical Skills</h3>
        <p>Comprehensive breakdown of MCP development, migration, MSP platform, and cloud expertise.</p>
        <a href="/technical-skills" class="btn btn-sm btn-outline">View Technical Skills</a>
    </div>
</div>

<p class="animate-on-scroll" style="text-align: center; margin-top: 2rem; opacity: 0.7; font-size: 0.9rem;">Currently engineering at <a href="https://www.viyu.net" target="_blank">Viyu Network Solutions</a></p>

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
