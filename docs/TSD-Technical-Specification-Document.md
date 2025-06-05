# Technical Specification Document (TSD)
## Automated Content Generation System

**Document Version:** 1.0  
**Date:** January 2025  
**Author:** Development Team  
**Project:** Suleman Anji Portfolio Content Automation  

---

## 1. Technical Overview

### 1.1 System Requirements
- **Python Version:** 3.11+
- **Platform:** DigitalOcean App Platform
- **Memory Limit:** 512MB
- **CPU:** 1 vCPU
- **Storage:** Stateless (no persistent storage required)
- **Network:** HTTPS outbound for API calls

### 1.2 Dependencies and Versions

```python
# requirements.txt
openai==1.3.0
requests==2.31.0
aiohttp==3.9.0
beautifulsoup4==4.12.0
pydantic==2.5.0
python-dotenv==1.0.0
APScheduler==3.10.0
Flask==3.0.0
feedparser==6.0.10
pytrends==4.9.2
praw==7.7.1
GitPython==3.1.40
cachetools==5.3.0
```

---

## 2. API Specifications

### 2.1 OpenAI Integration

**Configuration:**
```python
class OpenAIConfig:
    api_key: str
    model: str = "gpt-4"
    max_tokens: int = 2000
    temperature: float = 0.7
    timeout: int = 30
```

**Content Generation API:**
```python
async def generate_content(prompt: ContentPrompt) -> BlogPost:
    """
    Generate blog post content using OpenAI GPT-4
    
    Args:
        prompt: Structured prompt with topic and requirements
        
    Returns:
        BlogPost: Generated content with metadata
        
    Raises:
        OpenAIError: API-related errors
        RateLimitError: Rate limiting issues
        ValidationError: Invalid response format
    """
    pass
```

**Prompt Template:**
```python
CONTENT_PROMPT_TEMPLATE = """
Create a professional blog post for a technology portfolio website.

CONTEXT:
- Author: Suleman Anji, an AI/Automation specialist
- Audience: Tech professionals, engineers, decision-makers
- Website: www.sulemanji.com (Jekyll-based portfolio)
- Focus areas: AI, automation, optimization, emerging technologies

REQUIREMENTS:
- Topic: {topic}
- Word count: {word_count_min}-{word_count_max} words
- Include 2-3 practical insights or actionable advice points
- Add 1-2 code examples if relevant
- Professional, informative tone
- Include product integration opportunities for: {product_categories}

STRUCTURE:
1. Engaging title (SEO-optimized)
2. Brief excerpt/summary (1-2 sentences)
3. Introduction (hook + value proposition)
4. Main content with subsections
5. Practical applications/examples
6. Conclusion with key takeaways
7. Natural product recommendation sections

OUTPUT FORMAT:
Return JSON with:
{{
    "title": "string",
    "excerpt": "string", 
    "content": "markdown formatted string",
    "category": "string",
    "tags": ["array", "of", "strings"],
    "product_integration_points": ["array", "of", "section", "titles"]
}}
"""
```

### 2.2 GitHub Integration

**GitHub API Configuration:**
```python
class GitHubConfig:
    token: str
    repository: str = "sulemanji/sulemanji"
    branch: str = "main"
    base_url: str = "https://api.github.com"
    posts_directory: str = "_posts"
```

**Repository Operations:**
```python
class GitHubPublisher:
    async def get_repository_contents(self, path: str) -> List[GitHubFile]:
        """Get contents of repository directory"""
        url = f"{self.base_url}/repos/{self.repository}/contents/{path}"
        headers = {
            "Authorization": f"token {self.token}",
            "Accept": "application/vnd.github.v3+json"
        }
        # Implementation details...
    
    async def create_file(self, path: str, content: str, message: str) -> bool:
        """Create new file in repository"""
        url = f"{self.base_url}/repos/{self.repository}/contents/{path}"
        data = {
            "message": message,
            "content": base64.b64encode(content.encode()).decode(),
            "branch": self.branch
        }
        # Implementation details...
```

### 2.3 Trend Analysis APIs

**Google Trends Integration:**
```python
from pytrends.request import TrendReq

class GoogleTrendsAnalyzer:
    def __init__(self):
        self.pytrends = TrendReq(hl='en-US', tz=360)
    
    async def get_trending_topics(self, keywords: List[str]) -> List[TrendingTopic]:
        """Fetch trending data for specified keywords"""
        self.pytrends.build_payload(keywords, timeframe='today 7-d')
        interest_over_time = self.pytrends.interest_over_time()
        related_topics = self.pytrends.related_topics()
        # Processing logic...
```

**Reddit API Integration:**
```python
import praw

class RedditAnalyzer:
    def __init__(self, client_id: str, client_secret: str, user_agent: str):
        self.reddit = praw.Reddit(
            client_id=client_id,
            client_secret=client_secret,
            user_agent=user_agent
        )
    
    async def get_hot_posts(self, subreddit: str = "technology") -> List[RedditPost]:
        """Fetch hot posts from technology subreddit"""
        subreddit_obj = self.reddit.subreddit(subreddit)
        hot_posts = subreddit_obj.hot(limit=25)
        # Processing logic...
```

**RSS Feed Parser:**
```python
import feedparser

class RSSAnalyzer:
    RSS_FEEDS = [
        "https://techcrunch.com/feed/",
        "https://www.theverge.com/rss/index.xml",
        "https://arstechnica.com/feed/",
        "https://feeds.wired.com/wired/index"
    ]
    
    async def parse_feeds(self) -> List[NewsItem]:
        """Parse RSS feeds for latest tech news"""
        all_items = []
        for feed_url in self.RSS_FEEDS:
            feed = feedparser.parse(feed_url)
            # Processing logic...
```

---

## 3. Data Models and Schemas

### 3.1 Core Data Models

```python
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional
from enum import Enum

class ContentCategory(Enum):
    AI_MACHINE_LEARNING = "AI & Machine Learning"
    AUTOMATION = "Automation"
    CLOUD_COMPUTING = "Cloud Computing" 
    DEVELOPMENT_TOOLS = "Development Tools"
    EMERGING_TECH = "Emerging Technology"
    PRODUCTIVITY = "Productivity"

@dataclass
class TrendingTopic:
    keyword: str
    trend_score: float
    search_volume: int
    related_terms: List[str]
    timestamp: datetime
    source: str
    relevance_score: float = 0.0
    freshness_score: float = 0.0
    competition_score: float = 0.0
    final_score: float = 0.0

@dataclass
class BlogPost:
    title: str
    content: str
    excerpt: str
    category: ContentCategory
    tags: List[str]
    author: str = "Suleman Anji"
    date: datetime = None
    affiliate_products: List['Product'] = None
    slug: str = ""
    
    def __post_init__(self):
        if self.date is None:
            self.date = datetime.now()
        if self.slug == "":
            self.slug = self._generate_slug()
    
    def _generate_slug(self) -> str:
        """Generate URL-friendly slug from title"""
        import re
        slug = re.sub(r'[^\w\s-]', '', self.title.lower())
        slug = re.sub(r'[-\s]+', '-', slug)
        return slug.strip('-')

@dataclass
class Product:
    title: str
    asin: str
    price: Optional[str]
    rating: Optional[float]
    category: str
    image_url: Optional[str]
    description: str
    affiliate_link: str = ""
    
@dataclass
class ProductRecommendation:
    product: Product
    recommendation_text: str
    placement_context: str
    integration_type: str  # "inline", "sidebar", "conclusion"
```

### 3.2 Configuration Models

```python
@dataclass
class SystemConfig:
    # API Configuration
    openai_api_key: str
    github_token: str
    reddit_client_id: str
    reddit_client_secret: str
    
    # System Settings
    github_repo: str = "sulemanji/sulemanji"
    store_id: str = "sghpgs-20"
    content_frequency: str = "daily"
    posts_per_cycle: int = 1
    min_word_count: int = 1200
    max_word_count: int = 1500
    
    # Operational Settings
    max_retries: int = 3
    rate_limit_window: int = 3600  # 1 hour
    cache_ttl: int = 1800  # 30 minutes
    log_level: str = "INFO"
    
    @classmethod
    def from_env(cls) -> 'SystemConfig':
        """Load configuration from environment variables"""
        import os
        return cls(
            openai_api_key=os.getenv('OPENAI_API_KEY'),
            github_token=os.getenv('GITHUB_TOKEN'),
            reddit_client_id=os.getenv('REDDIT_CLIENT_ID'),
            reddit_client_secret=os.getenv('REDDIT_CLIENT_SECRET'),
            # ... other fields with defaults
        )
```

### 3.3 Jekyll Front Matter Schema

```python
def generate_jekyll_frontmatter(post: BlogPost) -> str:
    """Generate Jekyll front matter for blog post"""
    frontmatter = f"""---
layout: post
title: "{post.title}"
excerpt: "{post.excerpt}"
categories: [{post.category.value}]
tags: {post.tags}
author: {post.author}
date: {post.date.strftime('%Y-%m-%d %H:%M:%S')} +0000
slug: {post.slug}
image: /assets/images/posts/{post.slug}-hero.jpg
---

{post.content}
"""
    return frontmatter
```

---

## 4. Implementation Specifications

### 4.1 Main Orchestrator Implementation

```python
import asyncio
import logging
from typing import Dict, Any
from datetime import datetime, timedelta

class ContentOrchestrator:
    def __init__(self, config: SystemConfig):
        self.config = config
        self.trend_engine = TrendAnalysisEngine(config)
        self.content_generator = ContentGenerator(config)
        self.affiliate_manager = AffiliateManager(config.store_id)
        self.github_publisher = GitHubPublisher(config)
        self.cache_manager = CacheManager()
        self.logger = self._setup_logging()
    
    async def run_generation_cycle(self) -> bool:
        """Execute complete content generation cycle"""
        try:
            self.logger.info("Starting content generation cycle")
            
            # Step 1: Analyze trends
            topics = await self.trend_engine.analyze_trends()
            if not topics:
                self.logger.warning("No topics found, using fallback")
                topics = await self._get_fallback_topics()
            
            # Step 2: Select best topic
            selected_topic = self.trend_engine.select_best_topic(topics)
            self.logger.info(f"Selected topic: {selected_topic.keyword}")
            
            # Step 3: Generate content
            post = await self.content_generator.generate_post(selected_topic)
            
            # Step 4: Add affiliate products
            products = await self.affiliate_manager.find_relevant_products(
                selected_topic.keyword, post.content
            )
            post.affiliate_products = products
            
            # Step 5: Integrate products into content
            final_content = await self.affiliate_manager.integrate_products(
                post.content, products
            )
            post.content = final_content
            
            # Step 6: Publish to GitHub
            success = await self.github_publisher.publish_post(post)
            
            if success:
                self.logger.info(f"Successfully published: {post.title}")
                await self._update_metrics(post, selected_topic)
                return True
            else:
                self.logger.error("Failed to publish post")
                return False
                
        except Exception as e:
            self.logger.error(f"Generation cycle failed: {str(e)}")
            await self._handle_failure(e)
            return False
    
    async def _get_fallback_topics(self) -> List[TrendingTopic]:
        """Generate fallback topics when trend analysis fails"""
        fallback_keywords = [
            "artificial intelligence productivity",
            "automation tools 2025",
            "developer productivity software",
            "machine learning applications",
            "cloud computing optimization"
        ]
        
        topics = []
        for keyword in fallback_keywords:
            topic = TrendingTopic(
                keyword=keyword,
                trend_score=0.5,
                search_volume=1000,
                related_terms=[],
                timestamp=datetime.now(),
                source="fallback",
                final_score=0.5
            )
            topics.append(topic)
        
        return topics
```

### 4.2 Trend Analysis Engine Implementation

```python
class TrendAnalysisEngine:
    def __init__(self, config: SystemConfig):
        self.config = config
        self.google_analyzer = GoogleTrendsAnalyzer()
        self.reddit_analyzer = RedditAnalyzer(
            config.reddit_client_id, 
            config.reddit_client_secret
        )
        self.rss_analyzer = RSSAnalyzer()
        self.cache = CacheManager()
    
    async def analyze_trends(self) -> List[TrendingTopic]:
        """Analyze trends from all sources"""
        # Check cache first
        cached_topics = self.cache.get_trending_topics()
        if cached_topics:
            return cached_topics
        
        # Gather data from all sources concurrently
        tasks = [
            self.google_analyzer.get_trending_topics(self._get_tech_keywords()),
            self.reddit_analyzer.get_hot_topics(),
            self.rss_analyzer.get_trending_topics()
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Merge and score topics
        all_topics = []
        for result in results:
            if isinstance(result, list):
                all_topics.extend(result)
        
        scored_topics = self._score_topics(all_topics)
        
        # Cache results
        self.cache.cache_trending_topics(scored_topics)
        
        return scored_topics
    
    def _get_tech_keywords(self) -> List[str]:
        """Get relevant technology keywords for trend analysis"""
        return [
            "artificial intelligence", "machine learning", "automation",
            "cloud computing", "devops", "productivity tools",
            "programming", "software development", "data science",
            "cybersecurity", "blockchain", "iot", "edge computing"
        ]
    
    def _score_topics(self, topics: List[TrendingTopic]) -> List[TrendingTopic]:
        """Score and rank topics based on multiple criteria"""
        for topic in topics:
            # Relevance score (0-1)
            topic.relevance_score = self._calculate_relevance(topic)
            
            # Freshness score (0-1)
            topic.freshness_score = self._calculate_freshness(topic)
            
            # Competition score (0-1, lower is better)
            topic.competition_score = self._calculate_competition(topic)
            
            # Final weighted score
            topic.final_score = (
                topic.relevance_score * 0.4 +
                topic.freshness_score * 0.3 +
                (1 - topic.competition_score) * 0.3
            )
        
        return sorted(topics, key=lambda t: t.final_score, reverse=True)
```

### 4.3 Content Generator Implementation

```python
class ContentGenerator:
    def __init__(self, config: SystemConfig):
        self.config = config
        self.openai_client = OpenAI(api_key=config.openai_api_key)
        self.rate_limiter = RateLimiter(max_requests=50, time_window=3600)
        self.validator = ContentValidator()
    
    async def generate_post(self, topic: TrendingTopic) -> BlogPost:
        """Generate complete blog post for given topic"""
        
        # Create content prompt
        prompt = self._create_content_prompt(topic)
        
        # Generate content with OpenAI
        response = await self._call_openai_api(prompt)
        
        # Parse and validate response
        post_data = self._parse_openai_response(response)
        
        # Create BlogPost object
        post = BlogPost(
            title=post_data['title'],
            content=post_data['content'],
            excerpt=post_data['excerpt'],
            category=self._determine_category(topic, post_data['category']),
            tags=post_data['tags']
        )
        
        # Validate content quality
        if not self.validator.validate_post(post):
            raise ValueError("Generated content did not meet quality standards")
        
        return post
    
    def _create_content_prompt(self, topic: TrendingTopic) -> str:
        """Create structured prompt for OpenAI"""
        return CONTENT_PROMPT_TEMPLATE.format(
            topic=topic.keyword,
            word_count_min=self.config.min_word_count,
            word_count_max=self.config.max_word_count,
            product_categories=", ".join([
                "productivity software", "development tools", 
                "hardware", "books", "online courses"
            ])
        )
    
    async def _call_openai_api(self, prompt: str) -> str:
        """Make rate-limited call to OpenAI API"""
        if not self.rate_limiter.can_make_request():
            await asyncio.sleep(self.rate_limiter.time_until_reset())
        
        try:
            response = await self.openai_client.chat.completions.create(
                model=self.config.openai_model,
                messages=[
                    {"role": "system", "content": "You are an expert technology writer specializing in AI, automation, and productivity."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=self.config.max_tokens,
                temperature=self.config.temperature
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            self.logger.error(f"OpenAI API call failed: {str(e)}")
            raise
```

### 4.4 Affiliate Manager Implementation

```python
class AffiliateManager:
    def __init__(self, store_id: str):
        self.store_id = store_id
        self.product_cache = TTLCache(maxsize=1000, ttl=86400)  # 24 hours
        self.scraper = AmazonScraper()
        
    async def find_relevant_products(self, topic: str, content: str) -> List[Product]:
        """Find products relevant to content topic"""
        
        # Extract keywords from topic and content
        keywords = self._extract_keywords(topic, content)
        
        # Search for products
        products = []
        for keyword in keywords[:3]:  # Limit to top 3 keywords
            search_results = await self.scraper.search_products(keyword)
            products.extend(search_results[:2])  # Top 2 per keyword
        
        # Filter and rank products
        relevant_products = self._filter_relevant_products(products, topic)
        
        # Generate affiliate links
        for product in relevant_products:
            product.affiliate_link = self._generate_affiliate_link(product)
        
        return relevant_products[:3]  # Return top 3 products
    
    def _generate_affiliate_link(self, product: Product) -> str:
        """Generate Amazon affiliate link with store ID"""
        base_url = f"https://www.amazon.com/dp/{product.asin}"
        affiliate_params = f"?tag={self.store_id}&linkCode=as2&camp=1789&creative=9325"
        return base_url + affiliate_params
    
    async def integrate_products(self, content: str, products: List[Product]) -> str:
        """Integrate product recommendations into content"""
        if not products:
            return content + "\n\n" + self._get_affiliate_disclosure()
        
        # Find suitable integration points
        integration_points = self._find_integration_points(content)
        
        # Insert product recommendations
        integrated_content = content
        for i, product in enumerate(products):
            if i < len(integration_points):
                recommendation = self._create_product_recommendation(product)
                # Insert at appropriate position
                integrated_content = self._insert_recommendation(
                    integrated_content, recommendation, integration_points[i]
                )
        
        # Add affiliate disclosure
        integrated_content += "\n\n" + self._get_affiliate_disclosure()
        
        return integrated_content
    
    def _create_product_recommendation(self, product: Product) -> str:
        """Create natural product recommendation text"""
        templates = [
            f"For those looking to implement these concepts, I recommend checking out [{product.title}]({product.affiliate_link}). It's a highly-rated solution that can help streamline your workflow.",
            f"A tool that complements this approach perfectly is [{product.title}]({product.affiliate_link}), which offers {product.description}",
            f"If you're interested in exploring this further, [{product.title}]({product.affiliate_link}) provides excellent functionality for this use case."
        ]
        
        import random
        return random.choice(templates)
    
    def _get_affiliate_disclosure(self) -> str:
        """Get required affiliate disclosure text"""
        return """
---

**Affiliate Disclosure:** This post contains affiliate links. If you purchase through these links, I may earn a small commission at no additional cost to you. This helps support the creation of helpful content like this post.
"""
```

---

## 5. Error Handling and Recovery

### 5.1 Exception Hierarchy

```python
class ContentGenerationError(Exception):
    """Base exception for content generation system"""
    pass

class TrendAnalysisError(ContentGenerationError):
    """Error in trend analysis phase"""
    pass

class ContentGenerationError(ContentGenerationError):
    """Error in content generation phase"""
    pass

class AffiliateIntegrationError(ContentGenerationError):
    """Error in affiliate product integration"""
    pass

class PublishingError(ContentGenerationError):
    """Error in GitHub publishing phase"""
    pass

class RateLimitError(ContentGenerationError):
    """API rate limit exceeded"""
    pass
```

### 5.2 Retry Logic Implementation

```python
import asyncio
import random
from typing import Callable, Any

class RetryManager:
    def __init__(self, max_retries: int = 3, base_delay: float = 1.0):
        self.max_retries = max_retries
        self.base_delay = base_delay
    
    async def retry_async(self, func: Callable, *args, **kwargs) -> Any:
        """Retry async function with exponential backoff"""
        last_exception = None
        
        for attempt in range(self.max_retries + 1):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                last_exception = e
                
                if attempt == self.max_retries:
                    break
                
                # Exponential backoff with jitter
                delay = self.base_delay * (2 ** attempt) + random.uniform(0, 1)
                await asyncio.sleep(delay)
        
        raise last_exception
```

### 5.3 Circuit Breaker Implementation

```python
from enum import Enum
import time

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = CircuitState.CLOSED
    
    async def call(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with circuit breaker protection"""
        
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time < self.timeout:
                raise CircuitBreakerOpenError("Circuit breaker is OPEN")
            else:
                self.state = CircuitState.HALF_OPEN
        
        try:
            result = await func(*args, **kwargs)
            
            if self.state == CircuitState.HALF_OPEN:
                self.state = CircuitState.CLOSED
                self.failure_count = 0
            
            return result
            
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = time.time()
            
            if self.failure_count >= self.failure_threshold:
                self.state = CircuitState.OPEN
            
            raise e
```

---

## 6. Testing Specifications

### 6.1 Unit Test Structure

```python
import pytest
import asyncio
from unittest.mock import Mock, AsyncMock

class TestContentGenerator:
    @pytest.fixture
    def mock_config(self):
        return SystemConfig(
            openai_api_key="test-key",
            github_token="test-token",
            reddit_client_id="test-id",
            reddit_client_secret="test-secret"
        )
    
    @pytest.fixture
    def content_generator(self, mock_config):
        return ContentGenerator(mock_config)
    
    @pytest.mark.asyncio
    async def test_generate_post_success(self, content_generator):
        # Mock OpenAI response
        mock_response = {
            "title": "Test AI Article",
            "excerpt": "A test excerpt",
            "content": "Test content with 1200+ words...",
            "category": "AI & Machine Learning",
            "tags": ["ai", "testing"]
        }
        
        # Mock the OpenAI API call
        content_generator._call_openai_api = AsyncMock(
            return_value=json.dumps(mock_response)
        )
        
        topic = TrendingTopic(
            keyword="artificial intelligence testing",
            trend_score=0.8,
            search_volume=5000,
            related_terms=["ai", "testing"],
            timestamp=datetime.now(),
            source="test"
        )
        
        result = await content_generator.generate_post(topic)
        
        assert result.title == "Test AI Article"
        assert len(result.content.split()) >= 200  # Rough word count check
        assert result.category == ContentCategory.AI_MACHINE_LEARNING
```

### 6.2 Integration Tests

```python
class TestSystemIntegration:
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_full_generation_cycle(self):
        """Test complete content generation workflow"""
        
        # Setup test configuration
        config = SystemConfig.from_env()
        orchestrator = ContentOrchestrator(config)
        
        # Mock external APIs for predictable testing
        with patch.multiple(
            orchestrator.trend_engine,
            analyze_trends=AsyncMock(return_value=[mock_trending_topic]),
            select_best_topic=Mock(return_value=mock_trending_topic)
        ):
            with patch.object(
                orchestrator.github_publisher,
                'publish_post',
                AsyncMock(return_value=True)
            ):
                result = await orchestrator.run_generation_cycle()
                assert result is True
```

### 6.3 Performance Tests

```python
class TestPerformance:
    @pytest.mark.performance
    @pytest.mark.asyncio
    async def test_content_generation_time(self):
        """Verify content generation completes within 5 minutes"""
        start_time = time.time()
        
        # Run content generation
        result = await run_content_generation()
        
        end_time = time.time()
        duration = end_time - start_time
        
        assert duration < 300  # 5 minutes
        assert result is not None
```

---

## 7. Monitoring and Logging

### 7.1 Structured Logging

```python
import logging
import json
from datetime import datetime

class StructuredLogger:
    def __init__(self, name: str, level: str = "INFO"):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(getattr(logging, level))
        
        handler = logging.StreamHandler()
        formatter = JsonFormatter()
        handler.setFormatter(formatter)
        self.logger.addHandler(handler)
    
    def log_event(self, level: str, message: str, **kwargs):
        """Log structured event with metadata"""
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": level,
            "message": message,
            "metadata": kwargs
        }
        
        getattr(self.logger, level.lower())(json.dumps(log_data))

class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        return json.dumps(log_entry)
```

### 7.2 Metrics Collection

```python
class MetricsCollector:
    def __init__(self):
        self.metrics = {
            "content_generation": {
                "total_attempts": 0,
                "successful_generations": 0,
                "failed_generations": 0,
                "average_generation_time": 0.0
            },
            "publishing": {
                "total_publications": 0,
                "successful_publications": 0,
                "failed_publications": 0
            },
            "api_usage": {
                "openai_calls": 0,
                "github_calls": 0,
                "rate_limit_hits": 0
            }
        }
    
    def record_generation_attempt(self, success: bool, duration: float):
        """Record content generation metrics"""
        self.metrics["content_generation"]["total_attempts"] += 1
        
        if success:
            self.metrics["content_generation"]["successful_generations"] += 1
        else:
            self.metrics["content_generation"]["failed_generations"] += 1
        
        # Update average duration
        current_avg = self.metrics["content_generation"]["average_generation_time"]
        total_attempts = self.metrics["content_generation"]["total_attempts"]
        new_avg = ((current_avg * (total_attempts - 1)) + duration) / total_attempts
        self.metrics["content_generation"]["average_generation_time"] = new_avg
```

---

## 8. Deployment Configuration

### 8.1 DigitalOcean App Specification

```yaml
# .do/app.yaml
name: content-generation-system
region: nyc

services:
- name: content-generator
  source_dir: /
  github:
    repo: sulemanji/content-automation
    branch: main
    deploy_on_push: true
  
  run_command: python main.py
  environment_slug: python
  instance_count: 1
  instance_size_slug: basic-xxs
  
  health_check:
    http_path: /health
    initial_delay_seconds: 30
    period_seconds: 60
    timeout_seconds: 10
    failure_threshold: 3
    success_threshold: 2
  
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
  - key: STORE_ID
    value: sghpgs-20
    scope: RUN_TIME
  - key: GENERATION_SCHEDULE
    value: "0 9 * * *"  # Daily at 9 AM UTC
    scope: RUN_TIME
  - key: LOG_LEVEL
    value: INFO
    scope: RUN_TIME
  
  alerts:
  - rule: CPU_UTILIZATION
    disabled: false
    operator: GREATER_THAN
    value: 80
    window: FIVE_MINUTES
  - rule: MEM_UTILIZATION
    disabled: false
    operator: GREATER_THAN
    value: 80
    window: FIVE_MINUTES
```

### 8.2 Docker Configuration

```dockerfile
# Dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash appuser
RUN chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Expose port
EXPOSE 8080

# Run application
CMD ["python", "main.py"]
```

This technical specification provides comprehensive implementation details for all system components, ensuring consistent development and deployment practices. 