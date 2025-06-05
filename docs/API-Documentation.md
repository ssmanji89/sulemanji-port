# API Documentation
## Automated Content Generation System

**Document Version:** 1.0  
**Date:** January 2025  
**Author:** Development Team  

---

## 1. External API Integrations

### 1.1 OpenAI GPT-4 API

**Base URL:** `https://api.openai.com/v1/`  
**Authentication:** Bearer Token  
**Rate Limits:** 3 requests/minute (Tier 1), 50 requests/minute (Tier 2+)

#### Content Generation Endpoint

```http
POST /chat/completions
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
```

**Request Body:**
```json
{
  "model": "gpt-4",
  "messages": [
    {
      "role": "system",
      "content": "You are an expert technology writer specializing in AI, automation, and productivity."
    },
    {
      "role": "user", 
      "content": "Create a professional blog post about {topic}..."
    }
  ],
  "max_tokens": 2000,
  "temperature": 0.7
}
```

**Response Format:**
```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "{\n  \"title\": \"Revolutionary AI Tools...\",\n  \"excerpt\": \"...\",\n  \"content\": \"...\",\n  \"category\": \"AI & Machine Learning\",\n  \"tags\": [\"ai\", \"automation\"]\n}"
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 1200,
    "total_tokens": 1350
  }
}
```

**Error Handling:**
```python
class OpenAIAPIClient:
    async def generate_content(self, prompt: str) -> str:
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=2000,
                temperature=0.7
            )
            return response.choices[0].message.content
        except RateLimitError as e:
            await asyncio.sleep(60)  # Wait 1 minute
            raise RateLimitError("OpenAI rate limit exceeded")
        except AuthenticationError as e:
            raise AuthenticationError("Invalid OpenAI API key")
        except APIError as e:
            raise APIError(f"OpenAI API error: {e}")
```

### 1.2 GitHub Repository API

**Base URL:** `https://api.github.com/`  
**Authentication:** Personal Access Token  
**Rate Limits:** 5,000 requests/hour (authenticated)

#### Repository Contents

```http
GET /repos/{owner}/{repo}/contents/{path}
Authorization: token YOUR_GITHUB_TOKEN
Accept: application/vnd.github.v3+json
```

**Response:**
```json
[
  {
    "name": "2025-01-15-ai-automation-trends.md",
    "path": "_posts/2025-01-15-ai-automation-trends.md",
    "sha": "3d21ec53a331a6f037a91c368710b99387d012c1",
    "size": 2048,
    "type": "file",
    "download_url": "https://raw.githubusercontent.com/..."
  }
]
```

#### Create File

```http
PUT /repos/{owner}/{repo}/contents/{path}
Authorization: token YOUR_GITHUB_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "Auto-generated post: Revolutionary AI Tools",
  "content": "LS0tCmxheW91dDogcG9zdAp0aXRsZTogIlJldm9sdXRpb25hcnkgQUkgVG9vbHMiCi4uLgo=",
  "branch": "main"
}
```

**Response:**
```json
{
  "content": {
    "name": "2025-01-15-revolutionary-ai-tools.md",
    "path": "_posts/2025-01-15-revolutionary-ai-tools.md",
    "sha": "95b966ae1c166bd92f8ae7d1c313e738c731dfc3",
    "size": 2048
  },
  "commit": {
    "sha": "95b966ae1c166bd92f8ae7d1c313e738c731dfc3",
    "message": "Auto-generated post: Revolutionary AI Tools"
  }
}
```

#### Implementation:
```python
class GitHubAPIClient:
    def __init__(self, token: str, repo: str):
        self.token = token
        self.repo = repo
        self.base_url = "https://api.github.com"
        self.headers = {
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github.v3+json"
        }
    
    async def get_repository_contents(self, path: str) -> List[Dict]:
        url = f"{self.base_url}/repos/{self.repo}/contents/{path}"
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=self.headers) as response:
                if response.status == 200:
                    return await response.json()
                elif response.status == 404:
                    return []  # Directory doesn't exist
                else:
                    raise GitHubAPIError(f"Failed to get contents: {response.status}")
    
    async def create_file(self, path: str, content: str, message: str) -> bool:
        url = f"{self.base_url}/repos/{self.repo}/contents/{path}"
        
        # Check if file already exists
        try:
            existing = await self.get_file(path)
            if existing:
                return False  # File already exists
        except GitHubAPIError:
            pass  # File doesn't exist, continue
        
        # Encode content as base64
        encoded_content = base64.b64encode(content.encode()).decode()
        
        data = {
            "message": message,
            "content": encoded_content,
            "branch": "main"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.put(url, headers=self.headers, json=data) as response:
                return response.status == 201
```

### 1.3 Google Trends API (pytrends)

**Library:** `pytrends` (Unofficial Google Trends API)  
**Rate Limits:** ~100 requests/hour (unofficial limit)

#### Trending Topics Analysis

```python
from pytrends.request import TrendReq

class GoogleTrendsAPI:
    def __init__(self):
        self.pytrends = TrendReq(hl='en-US', tz=360)
    
    async def get_trending_data(self, keywords: List[str]) -> Dict:
        """Get trending data for specified keywords"""
        try:
            # Build payload for keywords
            self.pytrends.build_payload(
                keywords, 
                cat=0,  # All categories
                timeframe='today 7-d',  # Past 7 days
                geo='US',  # United States
                gprop=''  # Web search
            )
            
            # Get interest over time
            interest_over_time = self.pytrends.interest_over_time()
            
            # Get related topics
            related_topics = self.pytrends.related_topics()
            
            # Get related queries
            related_queries = self.pytrends.related_queries()
            
            return {
                "interest_over_time": interest_over_time.to_dict(),
                "related_topics": {k: v.to_dict() if v is not None else None 
                                 for k, v in related_topics.items()},
                "related_queries": {k: v.to_dict() if v is not None else None 
                                  for k, v in related_queries.items()}
            }
            
        except Exception as e:
            raise TrendAnalysisError(f"Google Trends API error: {e}")
```

### 1.4 Reddit API (PRAW)

**Base URL:** `https://oauth.reddit.com/`  
**Authentication:** OAuth2 (Client Credentials)  
**Rate Limits:** 60 requests/minute

#### Configuration:
```python
import praw

class RedditAPI:
    def __init__(self, client_id: str, client_secret: str):
        self.reddit = praw.Reddit(
            client_id=client_id,
            client_secret=client_secret,
            user_agent="ContentGenerator/1.0 by /u/yourusername"
        )
    
    async def get_hot_posts(self, subreddit: str = "technology", limit: int = 25) -> List[Dict]:
        """Get hot posts from specified subreddit"""
        try:
            subreddit_obj = self.reddit.subreddit(subreddit)
            hot_posts = []
            
            for post in subreddit_obj.hot(limit=limit):
                hot_posts.append({
                    "title": post.title,
                    "score": post.score,
                    "num_comments": post.num_comments,
                    "created_utc": post.created_utc,
                    "url": post.url,
                    "selftext": post.selftext,
                    "upvote_ratio": post.upvote_ratio,
                    "flair_text": post.link_flair_text
                })
            
            return hot_posts
            
        except Exception as e:
            raise RedditAPIError(f"Reddit API error: {e}")
```

### 1.5 RSS Feed Integration

**Libraries:** `feedparser`, `aiohttp`  
**Target Feeds:**
- TechCrunch: `https://techcrunch.com/feed/`
- The Verge: `https://www.theverge.com/rss/index.xml`
- Ars Technica: `https://arstechnica.com/feed/`
- Wired: `https://feeds.wired.com/wired/index`

```python
import feedparser
import aiohttp

class RSSFeedAPI:
    RSS_FEEDS = {
        "techcrunch": "https://techcrunch.com/feed/",
        "theverge": "https://www.theverge.com/rss/index.xml",
        "arstechnica": "https://arstechnica.com/feed/",
        "wired": "https://feeds.wired.com/wired/index"
    }
    
    async def parse_all_feeds(self) -> List[Dict]:
        """Parse all RSS feeds and return normalized articles"""
        all_articles = []
        
        async with aiohttp.ClientSession() as session:
            for source, url in self.RSS_FEEDS.items():
                try:
                    articles = await self._parse_feed(session, source, url)
                    all_articles.extend(articles)
                except Exception as e:
                    logger.warning(f"Failed to parse {source}: {e}")
                    continue
        
        return all_articles
    
    async def _parse_feed(self, session: aiohttp.ClientSession, source: str, url: str) -> List[Dict]:
        """Parse individual RSS feed"""
        async with session.get(url) as response:
            if response.status != 200:
                raise RSSFeedError(f"Failed to fetch {source}: {response.status}")
            
            content = await response.text()
            feed = feedparser.parse(content)
            
            articles = []
            for entry in feed.entries[:10]:  # Latest 10 articles
                articles.append({
                    "title": entry.title,
                    "link": entry.link,
                    "published": entry.published,
                    "summary": getattr(entry, 'summary', ''),
                    "source": source,
                    "tags": [tag.term for tag in getattr(entry, 'tags', [])]
                })
            
            return articles
```

---

## 2. Internal API Interfaces

### 2.1 Content Orchestrator Interface

```python
class ContentOrchestrator:
    """Main orchestrator for content generation workflow"""
    
    async def run_generation_cycle(self) -> GenerationResult:
        """
        Execute complete content generation cycle
        
        Returns:
            GenerationResult: Outcome of generation attempt
            
        Raises:
            ContentGenerationError: If generation fails
        """
        pass
    
    async def health_check(self) -> HealthStatus:
        """
        Check system health and component status
        
        Returns:
            HealthStatus: Current system health
        """
        pass
    
    async def get_metrics(self) -> SystemMetrics:
        """
        Get current system performance metrics
        
        Returns:
            SystemMetrics: Performance and usage data
        """
        pass
```

**Data Models:**
```python
@dataclass
class GenerationResult:
    success: bool
    post_title: Optional[str]
    topic_used: Optional[str]
    generation_time: float
    error_message: Optional[str]
    commit_sha: Optional[str]

@dataclass
class HealthStatus:
    overall_status: str  # "healthy", "degraded", "unhealthy"
    components: Dict[str, ComponentHealth]
    timestamp: datetime

@dataclass
class ComponentHealth:
    status: str
    last_check: datetime
    error_count: int
    response_time: Optional[float]

@dataclass
class SystemMetrics:
    content_generation: GenerationMetrics
    api_usage: APIUsageMetrics
    performance: PerformanceMetrics
    errors: ErrorMetrics
```

### 2.2 Trend Analysis Interface

```python
class TrendAnalysisEngine:
    """Interface for trend analysis and topic selection"""
    
    async def analyze_trends(self) -> List[TrendingTopic]:
        """
        Analyze current trends from multiple sources
        
        Returns:
            List[TrendingTopic]: Scored and ranked topics
            
        Raises:
            TrendAnalysisError: If trend analysis fails
        """
        pass
    
    async def select_best_topic(self, topics: List[TrendingTopic]) -> TrendingTopic:
        """
        Select the best topic for content generation
        
        Args:
            topics: List of analyzed topics
            
        Returns:
            TrendingTopic: Selected topic for content generation
        """
        pass
    
    def score_topic_relevance(self, topic: TrendingTopic) -> float:
        """
        Score topic relevance to portfolio focus areas
        
        Args:
            topic: Topic to score
            
        Returns:
            float: Relevance score (0.0 - 1.0)
        """
        pass
```

### 2.3 Content Generator Interface

```python
class ContentGenerator:
    """Interface for AI-powered content generation"""
    
    async def generate_post(self, topic: TrendingTopic) -> BlogPost:
        """
        Generate complete blog post for given topic
        
        Args:
            topic: Selected trending topic
            
        Returns:
            BlogPost: Generated blog post with metadata
            
        Raises:
            ContentGenerationError: If generation fails
            RateLimitError: If API rate limits are exceeded
        """
        pass
    
    async def validate_content_quality(self, post: BlogPost) -> ValidationResult:
        """
        Validate generated content against quality standards
        
        Args:
            post: Generated blog post
            
        Returns:
            ValidationResult: Quality validation results
        """
        pass
    
    def create_jekyll_frontmatter(self, post: BlogPost) -> str:
        """
        Generate Jekyll front matter for blog post
        
        Args:
            post: Blog post object
            
        Returns:
            str: Complete Jekyll front matter
        """
        pass
```

### 2.4 Affiliate Manager Interface

```python
class AffiliateManager:
    """Interface for Amazon affiliate integration"""
    
    async def find_relevant_products(self, topic: str, content: str) -> List[Product]:
        """
        Find Amazon products relevant to content topic
        
        Args:
            topic: Content topic/keyword
            content: Generated content text
            
        Returns:
            List[Product]: Relevant products with affiliate links
            
        Raises:
            AffiliateIntegrationError: If product search fails
        """
        pass
    
    async def integrate_products(self, content: str, products: List[Product]) -> str:
        """
        Integrate product recommendations into content
        
        Args:
            content: Original blog post content
            products: Selected products to integrate
            
        Returns:
            str: Content with integrated product recommendations
        """
        pass
    
    def generate_affiliate_link(self, product: Product) -> str:
        """
        Generate Amazon affiliate link with store ID
        
        Args:
            product: Product to create link for
            
        Returns:
            str: Complete affiliate link
        """
        pass
```

### 2.5 GitHub Publisher Interface

```python
class GitHubPublisher:
    """Interface for GitHub repository publishing"""
    
    async def publish_post(self, post: BlogPost) -> PublishResult:
        """
        Publish blog post to GitHub repository
        
        Args:
            post: Complete blog post to publish
            
        Returns:
            PublishResult: Publication result with commit details
            
        Raises:
            PublishingError: If publication fails
        """
        pass
    
    async def check_existing_posts(self, title: str) -> bool:
        """
        Check if post with similar title already exists
        
        Args:
            title: Post title to check
            
        Returns:
            bool: True if similar post exists
        """
        pass
    
    def generate_filename(self, post: BlogPost) -> str:
        """
        Generate SEO-friendly filename for Jekyll post
        
        Args:
            post: Blog post object
            
        Returns:
            str: Jekyll-compatible filename
        """
        pass
```

---

## 3. Webhook and Event Interfaces

### 3.1 Health Check Endpoint

```http
GET /health
Content-Type: application/json
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T12:00:00Z",
  "services": {
    "openai": {
      "status": "healthy",
      "response_time": 0.5,
      "last_check": "2025-01-15T11:59:30Z"
    },
    "github": {
      "status": "healthy", 
      "response_time": 0.3,
      "last_check": "2025-01-15T11:59:45Z"
    },
    "trend_analysis": {
      "status": "healthy",
      "response_time": 1.2,
      "last_check": "2025-01-15T11:58:00Z"
    }
  },
  "metrics": {
    "total_posts_generated": 42,
    "success_rate": 0.95,
    "average_generation_time": 180.5
  }
}
```

### 3.2 Manual Trigger Endpoint

```http
POST /generate
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
```

**Request Body:**
```json
{
  "topic": "artificial intelligence automation",
  "force_generation": true,
  "skip_duplicate_check": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Content generation initiated",
  "job_id": "gen_20250115_120000",
  "estimated_completion": "2025-01-15T12:05:00Z"
}
```

### 3.3 Status Monitoring Endpoint

```http
GET /status/{job_id}
Content-Type: application/json
```

**Response:**
```json
{
  "job_id": "gen_20250115_120000",
  "status": "completed",
  "progress": 100,
  "current_step": "publishing",
  "result": {
    "post_title": "Revolutionary AI Automation Tools for 2025",
    "commit_sha": "abc123def456",
    "published_url": "https://www.sulemanji.com/2025/01/15/revolutionary-ai-automation-tools-for-2025/"
  },
  "timeline": {
    "started": "2025-01-15T12:00:00Z",
    "trend_analysis_completed": "2025-01-15T12:01:00Z",
    "content_generated": "2025-01-15T12:03:30Z",
    "products_integrated": "2025-01-15T12:04:00Z",
    "published": "2025-01-15T12:04:30Z"
  }
}
```

---

## 4. Rate Limiting and Error Handling

### 4.1 Rate Limiting Strategy

```python
class RateLimiter:
    """Manage API rate limits across services"""
    
    def __init__(self):
        self.limits = {
            "openai": {"requests": 50, "window": 3600},  # 50/hour
            "github": {"requests": 100, "window": 3600},  # 100/hour
            "reddit": {"requests": 60, "window": 60},     # 60/minute
        }
        self.usage = {}
    
    async def check_rate_limit(self, service: str) -> bool:
        """Check if service is within rate limits"""
        current_time = time.time()
        service_usage = self.usage.get(service, [])
        
        # Remove old requests outside window
        window = self.limits[service]["window"]
        cutoff_time = current_time - window
        service_usage = [req_time for req_time in service_usage if req_time > cutoff_time]
        
        # Check if under limit
        max_requests = self.limits[service]["requests"]
        if len(service_usage) < max_requests:
            service_usage.append(current_time)
            self.usage[service] = service_usage
            return True
        
        return False
    
    async def wait_for_rate_limit_reset(self, service: str) -> None:
        """Wait until rate limit resets"""
        if service not in self.usage:
            return
        
        current_time = time.time()
        service_usage = self.usage[service]
        
        if service_usage:
            oldest_request = min(service_usage)
            window = self.limits[service]["window"]
            wait_time = oldest_request + window - current_time
            
            if wait_time > 0:
                await asyncio.sleep(wait_time)
```

### 4.2 Error Response Format

```json
{
  "error": {
    "code": "CONTENT_GENERATION_FAILED",
    "message": "Failed to generate content for topic 'AI automation'",
    "details": {
      "component": "content_generator",
      "original_error": "OpenAI API rate limit exceeded",
      "retry_after": 3600,
      "correlation_id": "req_20250115_120000"
    },
    "timestamp": "2025-01-15T12:00:00Z"
  }
}
```

### 4.3 Error Code Reference

| Code | Description | Recovery Action |
|------|-------------|----------------|
| `OPENAI_RATE_LIMIT` | OpenAI API rate limit exceeded | Wait and retry |
| `GITHUB_AUTH_FAILED` | GitHub authentication failed | Check token |
| `CONTENT_QUALITY_FAILED` | Generated content below standards | Retry with different prompt |
| `DUPLICATE_POST_DETECTED` | Similar post already exists | Skip or modify topic |
| `TREND_ANALYSIS_FAILED` | Unable to analyze trends | Use fallback topics |
| `AFFILIATE_INTEGRATION_FAILED` | Product integration failed | Publish without products |
| `PUBLISH_FAILED` | GitHub publish operation failed | Queue for retry |

This comprehensive API documentation provides complete reference for all external integrations and internal interfaces, enabling consistent development and troubleshooting. 