# Technology Landscape: Amazon Affiliate Blog Generator

## Technology Stack Overview

The Amazon Affiliate Blog Generator is built using a Python-based architecture with a modular design that leverages several external APIs and services. The system is designed to run as either a scheduled job or a CLI tool depending on deployment needs.

### Core Technologies

1. **Programming Language**
   - Python 3.8+ for all system components
   - Jinja2 templating for content rendering

2. **Data Storage**
   - Local JSON files for data persistence
   - Git/GitHub for content version control and hosting

3. **Content Generation**
   - Claude AI (Anthropic) for natural language generation
   - Markdown for content formatting

4. **Content Publication**
   - GitHub Pages for hosting the generated blog
   - Jekyll-compatible formatting for static site integration

## Development Environment

### Required Tools

1. **Python Environment**
   - Python 3.8 or higher
   - Virtual environment management (venv)
   - pip for package management

2. **Version Control**
   - Git for source code management
   - GitHub for repository hosting and Pages deployment

3. **IDE/Editor Recommendations**
   - VSCode with Python extensions
   - Jupyter Notebook for prototyping content generation

### Configuration Management

1. **Environment Variables**
   - `.env` file for local development
   - Required variables:
     - `AMAZON_ASSOCIATES_TAG`: Amazon affiliate ID
     - `GITHUB_TOKEN`: GitHub personal access token
     - `GITHUB_REPO`: Target repository for publishing
     - `GOOGLE_API_KEY`: Google API key for search
     - `GOOGLE_CSE_ID`: Custom Search Engine ID
     - `LLM_API_KEY`: API key for Claude AI
     - `DISCORD_WEBHOOK`: Discord webhook URL for notifications

2. **Configuration Settings**
   - Content templates located in `templates/` directory
   - Product and trend data cached in `data/` directory

## External Dependencies

### APIs and Services

1. **~~Amazon Product Advertising API~~**
   - **Note: No longer used in the current implementation**
   - Replaced with Google Search-based product discovery

2. **Google Custom Search API**
   - Used for discovering trending topics
   - Required for product discovery in the adapted solution
   - Limits: 100 queries per day for free tier, additional queries require payment

3. **Claude API (Anthropic)**
   - Used for natural language content generation
   - Model: `anthropic/claude-3-5-sonnet-20240620` (default)
   - Costs based on token usage

4. **GitHub API**
   - Used for publishing content to GitHub Pages
   - Authentication via personal access token

5. **Discord API (Optional)**
   - Used for monitoring notifications
   - Requires webhook URL configuration

### Python Package Dependencies

```
# Core dependencies
requests>=2.28.0
python-dotenv>=1.0.0
beautifulsoup4>=4.12.0
lxml>=4.9.0
markdown>=3.5.0
PyGithub>=2.1.0
discord-webhook>=1.0.0
jinja2>=3.1.0
weasyprint>=60.0

# Google API dependencies
google-api-python-client>=2.0.0
google-auth>=2.0.0
google-auth-httplib2>=0.1.0
google-auth-oauthlib>=0.5.0

# LLM API dependencies
anthropic>=0.5.0

# Testing
pytest>=7.4.0
pytest-mock>=3.11.0
```

## System Architecture

### Module Overview

1. **`trend_discovery.py`**
   - Discovers trending topics using Google Search API
   - Dependencies: googleapiclient, utils.storage

2. **`product_finder.py`**
   - Finds Amazon products related to specific topics
   - Previously used mock data, now adapted to use Google Search results
   - Dependencies: logging, random, time, datetime

3. **`product_selection.py`**
   - Selects suitable Amazon products based on trending topics
   - Dependencies: utils.amazon_utils, utils.storage

4. **`content_generator.py`**
   - Generates blog post content based on a topic and products
   - Uses templates and structured content components
   - Dependencies: random, datetime, logging

5. **`content_generation.py`**
   - Alternative implementation using Claude API
   - Generates blog posts from product information
   - Dependencies: anthropic, jinja2, utils.storage

6. **`github_integration.py`**
   - Publishes generated content to GitHub Pages
   - Dependencies: git, utils.storage

7. **`monitoring.py`**
   - Handles system monitoring, notifications, and analytics
   - Dependencies: requests, utils.storage

8. **Utilities**
   - `amazon_utils.py`: Functions for generating Amazon affiliate links
   - `storage.py`: Functions for persistent data storage in JSON files

### Application Entry Points

1. **`app.py`**
   - Monolithic scheduled job implementation
   - Executes full pipeline from trend discovery to publishing
   - Best for automated, periodic content generation

2. **`main.py`**
   - CLI-based implementation for on-demand content generation
   - Supports single topic or batch processing from a file
   - Focuses on local content generation rather than direct publishing

## Operating Environment

### Hosting Requirements

1. **Local Execution**
   - System designed to run on local development machines or servers
   - No specific infrastructure requirements beyond Python environment

2. **Scheduled Execution**
   - Recommended setup: Cron job or scheduled task
   - Execution frequency: Daily or weekly depending on content needs
   - Logging to file and stdout for monitoring

3. **Memory and Storage**
   - Minimal requirements (less than 500MB RAM)
   - Storage requirements scale with number of generated posts (approximately 100KB per post)

### Production Considerations

1. **Rate Limits**
   - Google Custom Search API: 100 queries per day (free tier)
   - GitHub API: 5,000 requests per hour
   - Claude API: Varies based on subscription

2. **Cost Optimization**
   - Batch processing of topics to minimize API calls
   - Caching of search results and product data
   - Efficient prompt design for Claude to minimize token usage

3. **Monitoring and Recovery**
   - Logging to track system performance and errors
   - Discord notifications for success and failure events
   - Data backup via persistent storage in JSON files

## Customization Points

### Content Customization

1. **Templates**
   - `templates/prompt_template.txt`: Controls the prompt sent to Claude
   - `templates/blog_post.md`: Template for the final blog post

2. **Product Selection Criteria**
   - Minimum rating and review thresholds in `product_selection.py`
   - Product ranking algorithm can be customized

3. **Content Structure**
   - Blog post sections and formatting in `content_generator.py`
   - SEO parameters and keyword density

### Integration Extensions

1. **Analytics Integration**
   - Extend `monitoring.py` to integrate with Google Analytics or similar
   - Add tracking pixel generation for affiliate link clicks

2. **Additional Publishing Platforms**
   - Structure allows for adding new publishing targets beyond GitHub Pages
   - Consider Medium, WordPress, or custom site integrations

3. **Alternative Product Sources**
   - Current implementation: Google Search-based discovery
   - Potential alternatives: Manual product list import, web scraping (with caution) 