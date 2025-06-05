# Deployment Guide: DigitalOcean App Platform

## Phase 7: DigitalOcean Deployment (Week 7-8)

### 7.1 Project Structure
```
automated-content-generator/
├── app.py                 # Flask application entry point
├── main_orchestrator.py   # Main content generation logic
├── trend_analyzer.py      # Google Trends analysis
├── reddit_analyzer.py     # Reddit API integration
├── amazon_scraper.py      # Amazon product scraping
├── content_generator.py   # OpenAI content generation
├── github_publisher.py    # GitHub integration
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variables template
├── Procfile              # DigitalOcean process definition
└── app.yaml              # DigitalOcean app specification
```

### 7.2 Requirements File
```txt
# requirements.txt
Flask==2.3.3
openai==0.28.1
requests==2.31.0
beautifulsoup4==4.12.2
lxml==4.9.3
PyGithub==1.59.1
praw==7.7.1
pytrends==4.9.2
feedparser==6.0.10
python-dotenv==1.0.0
schedule==1.2.0
gunicorn==21.2.0
```

### 7.3 DigitalOcean App Specification
```yaml
# app.yaml
name: automated-content-generator
services:
- name: web
  source_dir: /
  github:
    repo: your-username/automated-content-generator
    branch: main
  run_command: gunicorn --worker-tmp-dir /dev/shm --config gunicorn_config.py app:app
  environment_slug: python
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: OPENAI_API_KEY
    scope: RUN_TIME
    type: SECRET
  - key: GITHUB_TOKEN
    scope: RUN_TIME
    type: SECRET
  - key: REDDIT_CLIENT_ID
    scope: RUN_TIME
    type: SECRET
  - key: REDDIT_CLIENT_SECRET
    scope: RUN_TIME
    type: SECRET
  - key: AMAZON_AFFILIATE_ID
    value: sghpgs-20
    scope: RUN_TIME
  - key: GITHUB_REPO
    value: sulemanji/sulemanji
    scope: RUN_TIME
  http_port: 8080
  routes:
  - path: /
```

### 7.4 Gunicorn Configuration
```python
# gunicorn_config.py
bind = "0.0.0.0:8080"
workers = 1
worker_class = "sync"
worker_connections = 1000
timeout = 120
keepalive = 2
max_requests = 1000
max_requests_jitter = 100
preload_app = True
```

### 7.5 Flask Application Entry Point
```python
# app.py
from flask import Flask, jsonify, request, render_template_string
from main_orchestrator import ContentOrchestrator
import threading
import schedule
import time
import os

app = Flask(__name__)
orchestrator = ContentOrchestrator()

# Simple dashboard template
DASHBOARD_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Content Generator Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .status { padding: 20px; border-radius: 5px; margin: 10px 0; }
        .success { background-color: #d4edda; color: #155724; }
        .error { background-color: #f8d7da; color: #721c24; }
        .info { background-color: #d1ecf1; color: #0c5460; }
        button { padding: 10px 20px; margin: 10px 0; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; }
        button:hover { background: #0056b3; }
    </style>
</head>
<body>
    <h1>Automated Content Generator</h1>
    <div class="status info">
        <h3>System Status</h3>
        <p>Service: Running</p>
        <p>Last Generation: {{ last_run }}</p>
        <p>Total Posts Generated: {{ total_posts }}</p>
    </div>
    
    <form method="post" action="/generate">
        <button type="submit">Generate Content Now</button>
    </form>
    
    <div class="status info">
        <h3>Recent Activity</h3>
        <ul>
            {% for activity in recent_activity %}
            <li>{{ activity }}</li>
            {% endfor %}
        </ul>
    </div>
</body>
</html>
"""

@app.route('/')
def dashboard():
    """Simple dashboard for monitoring"""
    return render_template_string(DASHBOARD_TEMPLATE, 
        last_run="Not available",
        total_posts="Not available", 
        recent_activity=["System initialized", "Waiting for first run"]
    )

@app.route('/health')
def health_check():
    """Health check endpoint for DigitalOcean"""
    return jsonify({
        "status": "healthy",
        "service": "automated-content-generator",
        "timestamp": time.time()
    })

@app.route('/generate', methods=['POST'])
def manual_generate():
    """Manual content generation trigger"""
    try:
        success = orchestrator.generate_daily_content()
        if success:
            return jsonify({"status": "success", "message": "Content generated successfully"})
        else:
            return jsonify({"status": "error", "message": "Content generation failed"}), 500
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/status')
def status():
    """API endpoint for status information"""
    return jsonify({
        "service": "automated-content-generator",
        "status": "running",
        "features": {
            "trend_analysis": True,
            "content_generation": True,
            "amazon_scraping": True,
            "github_publishing": True
        }
    })

def run_scheduler():
    """Run the content generation scheduler in background"""
    schedule.every().day.at("09:00").do(orchestrator.generate_daily_content)
    schedule.every().monday.at("14:00").do(orchestrator.generate_daily_content)
    schedule.every().friday.at("16:00").do(orchestrator.generate_daily_content)
    
    while True:
        schedule.run_pending()
        time.sleep(60)

# Start scheduler in background thread
if os.getenv('FLASK_ENV') != 'development':
    scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
    scheduler_thread.start()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
```

## Deployment Steps

### Step 1: Prepare Repository
```bash
# Create new repository
git init
git add .
git commit -m "Initial commit: Automated content generator"
git remote add origin https://github.com/your-username/automated-content-generator.git
git push -u origin main
```

### Step 2: DigitalOcean Setup
1. **Create DigitalOcean Account** and navigate to App Platform
2. **Connect GitHub Repository** with your content generator code
3. **Configure Environment Variables**:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `GITHUB_TOKEN`: GitHub personal access token with repo permissions
   - `REDDIT_CLIENT_ID`: Reddit API client ID
   - `REDDIT_CLIENT_SECRET`: Reddit API client secret
   - `AMAZON_AFFILIATE_ID`: sghpgs-20
   - `GITHUB_REPO`: sulemanji/sulemanji

### Step 3: Domain Configuration
```yaml
# Add to app.yaml for custom domain
domains:
- domain: content-generator.sulemanji.com
  type: PRIMARY
```

### Step 4: Monitoring Setup
```python
# monitoring.py
import logging
import os
from datetime import datetime

class ContentMonitor:
    def __init__(self):
        self.setup_logging()
    
    def setup_logging(self):
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('content_generator.log'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
    
    def log_generation_attempt(self, topic, success, error=None):
        if success:
            self.logger.info(f"Successfully generated content for: {topic}")
        else:
            self.logger.error(f"Failed to generate content for: {topic}. Error: {error}")
    
    def log_publishing_attempt(self, filename, success, error=None):
        if success:
            self.logger.info(f"Successfully published: {filename}")
        else:
            self.logger.error(f"Failed to publish: {filename}. Error: {error}")
```

## Production Considerations

### Security
- Store all API keys as environment variables
- Use HTTPS for all external API calls
- Implement rate limiting to avoid API abuse
- Regular security updates for dependencies

### Performance
- Implement caching for trend data
- Use connection pooling for HTTP requests
- Monitor memory usage and optimize as needed
- Set appropriate timeouts for all external calls

### Reliability
- Implement retry logic for failed operations
- Add comprehensive error handling
- Set up health checks and monitoring
- Create backup strategies for generated content

### Scaling
- Monitor API usage and costs
- Implement queue system for high-volume generation
- Consider using DigitalOcean Spaces for file storage
- Plan for horizontal scaling if needed

## Cost Estimation

### DigitalOcean App Platform
- **Basic Plan**: $5/month (sufficient for this use case)
- **Professional Plan**: $12/month (if scaling needed)

### API Costs (Monthly)
- **OpenAI API**: ~$30-50 (for 15-20 posts)
- **Proxy Services**: ~$10-20 (if needed)
- **Total Estimated**: $45-85/month

### ROI Potential
- **Amazon Affiliate Commission**: 1-10% depending on product category
- **Target**: $500+ monthly through strategic product recommendations
- **Break-even**: ~10-20 affiliate sales per month