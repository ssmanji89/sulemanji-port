# Amazon Affiliate Blog Generator

A Python application that automatically generates affiliate marketing blog posts for Amazon products based on trending topics.

## Overview

This project implements a monolithic scheduled job architecture that performs the following steps:
1. Discovers trending topics
2. Selects relevant Amazon products
3. Generates blog content
4. Publishes to GitHub Pages
5. Monitors performance and sends notifications

## Architecture: Monolithic Scheduled Job

This implementation follows a monolithic architecture where all processing steps are executed sequentially in a single job. The job is designed to be run on a schedule (e.g., daily) using a task scheduler like cron.

### Advantages
- Simple implementation with minimal operational complexity
- No microservices or distributed systems to manage
- Easier to debug and trace through the entire pipeline
- Lower hosting costs (can run on a single server or serverless function)
- Straightforward deployment process

### Disadvantages
- Limited scalability - processing happens sequentially
- Single point of failure
- Retrying failed steps requires rerunning the entire job
- Cannot independently scale resource-intensive steps
- May encounter timeout issues for long-running jobs

## Project Structure

```
amazon-affiliate-blog-generator/
├── app.py                   # Main application entry point
├── data/                    # Data storage directory
│   └── metrics.json         # Metrics tracking file
├── modules/                 # Core functionality modules
│   ├── trend_discovery.py   # Identifies trending topics
│   ├── product_selection.py # Selects relevant Amazon products
│   ├── content_generation.py # Generates blog content
│   ├── github_integration.py # Publishes to GitHub Pages
│   └── monitoring.py        # Handles monitoring and notifications
├── templates/               # HTML/markdown templates
├── utils/                   # Utility functions
└── tests/                   # Unit and integration tests
```

## Setup and Configuration

### Prerequisites
- Python 3.8+
- Amazon Product Advertising API access
- GitHub account and access token (for publishing)
- Discord webhook URL (for notifications)

### Environment Variables
Set the following environment variables:
```
AMAZON_ACCESS_KEY=your-access-key
AMAZON_SECRET_KEY=your-secret-key
AMAZON_PARTNER_TAG=your-partner-tag
GITHUB_TOKEN=your-github-token
GITHUB_USERNAME=your-username
GITHUB_REPO=your-repo-name
DISCORD_WEBHOOK_URL=your-discord-webhook-url
```

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/amazon-affiliate-blog-generator.git
cd amazon-affiliate-blog-generator

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Usage

### Running Manually
```bash
python app.py
```

### Setting Up as a Scheduled Job
Add to crontab to run daily:
```
0 8 * * * cd /path/to/amazon-affiliate-blog-generator && .venv/bin/python app.py >> cron.log 2>&1
```

## Monitoring and Notifications

The application includes a monitoring module that:
- Sends notifications to a Discord channel when:
  - New blog posts are published
  - Errors occur during execution
- Logs metrics about published posts including:
  - Total post count
  - Products by category
  - Recent posts (last 10)

## License

MIT License 