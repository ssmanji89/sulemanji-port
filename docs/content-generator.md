# Content Generation Module

## Phase 4: OpenAI Content Generator (Week 4-5)

### 4.1 Content Generator Class
```python
# content_generator.py
import openai
import os
from datetime import datetime
import re

class ContentGenerator:
    def __init__(self):
        openai.api_key = os.getenv('OPENAI_API_KEY')
        self.model = "gpt-4"
        
    def generate_blog_post(self, topic_data, products_data):
        """Generate a complete blog post with affiliate products"""
        
        # Create content prompt
        prompt = self._create_content_prompt(topic_data, products_data)
        
        try:
            response = openai.ChatCompletion.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self._get_system_prompt()},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=2000,
                temperature=0.7
            )
            
            content = response.choices[0].message.content
            
            # Process and format content
            formatted_post = self._format_blog_post(content, topic_data, products_data)
            
            return formatted_post
            
        except Exception as e:
            print(f"Error generating content: {e}")
            return None
    
    def _get_system_prompt(self):
        return """You are a technical content writer specializing in AI, automation, and optimization. 
        Create engaging, informative blog posts that provide real value to readers while naturally 
        incorporating product recommendations. Your writing should be:
        
        - Professional yet accessible
        - Technically accurate
        - SEO-optimized
        - Naturally incorporating affiliate products
        - Including proper disclosure statements
        - 1200-1500 words in length
        
        Always include affiliate disclosure: "This post contains affiliate links. As an Amazon Associate, 
        I earn from qualifying purchases. #amazonaffiliate #ad"
        """
    
    def _create_content_prompt(self, topic_data, products_data):
        products_text = "\n".join([
            f"- {p['title']} (${p['price']}) - {p['affiliate_url']}"
            for p in products_data[:5]
        ])
        
        return f"""
        Write a comprehensive blog post about: {topic_data['main_topic']}
        
        Trending aspects to cover:
        {topic_data.get('trending_aspects', '')}
        
        Relevant products to naturally incorporate:
        {products_text}
        
        The post should:
        1. Start with an engaging introduction
        2. Provide valuable, actionable information
        3. Naturally mention relevant products where they add value
        4. Include proper affiliate disclosure
        5. End with a compelling conclusion
        6. Be optimized for SEO
        
        Target audience: Technical professionals interested in AI, automation, and optimization.
        """
    
    def _format_blog_post(self, content, topic_data, products_data):
        """Format content into Jekyll-compatible markdown"""
        
        # Generate filename
        date_str = datetime.now().strftime("%Y-%m-%d")
        title_slug = re.sub(r'[^a-zA-Z0-9\s]', '', topic_data['main_topic'])
        title_slug = re.sub(r'\s+', '-', title_slug.strip()).lower()
        filename = f"{date_str}-{title_slug}.md"
        
        # Create Jekyll front matter
        front_matter = f"""---
layout: post
title: "{topic_data['main_topic']}"
date: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")} +0000
categories: [AI, Automation, Optimization]
tags: {topic_data.get('tags', ['technology', 'productivity'])}
description: "{topic_data.get('description', 'Exploring the latest in AI, automation, and optimization')}"
author: "Suleman Manji"
---

"""
        
        # Add affiliate disclosure at the top
        disclosure = """
*This post contains affiliate links. As an Amazon Associate, I earn from qualifying purchases. #amazonaffiliate #ad*

"""
        
        # Combine all content
        full_content = front_matter + disclosure + content
        
        return {
            'filename': filename,
            'content': full_content,
            'title': topic_data['main_topic'],
            'products_count': len(products_data)
        }
```

## Phase 5: GitHub Publisher (Week 5-6)

### 5.1 GitHub Integration
```python
# github_publisher.py
from github import Github
import os
from datetime import datetime
import base64

class GitHubPublisher:
    def __init__(self):
        self.github = Github(os.getenv('GITHUB_TOKEN'))
        self.repo_name = os.getenv('GITHUB_REPO', 'sulemanji/sulemanji')
        self.repo = self.github.get_repo(self.repo_name)
        
    def publish_post(self, post_data):
        """Publish blog post to GitHub repository"""
        
        try:
            # Check if file already exists
            file_path = f"_posts/{post_data['filename']}"
            
            if self._file_exists(file_path):
                print(f"File {file_path} already exists, skipping...")
                return False
            
            # Create the file
            self.repo.create_file(
                path=file_path,
                message=f"Add new blog post: {post_data['title']}",
                content=post_data['content'],
                branch="main"
            )
            
            print(f"Successfully published: {post_data['title']}")
            return True
            
        except Exception as e:
            print(f"Error publishing to GitHub: {e}")
            return False
    
    def _file_exists(self, file_path):
        """Check if file already exists in repository"""
        try:
            self.repo.get_contents(file_path)
            return True
        except:
            return False
    
    def get_recent_posts(self, limit=10):
        """Get list of recent posts to avoid duplicates"""
        try:
            contents = self.repo.get_contents("_posts")
            posts = []
            
            for content in contents:
                if content.name.endswith('.md'):
                    posts.append({
                        'filename': content.name,
                        'path': content.path,
                        'last_modified': content.last_modified
                    })
            
            # Sort by filename (which includes date)
            posts.sort(key=lambda x: x['filename'], reverse=True)
            return posts[:limit]
            
        except Exception as e:
            print(f"Error getting recent posts: {e}")
            return []
```

## Phase 6: Main Orchestrator (Week 6-7)

### 6.1 Main Application Logic
```python
# main_orchestrator.py
from trend_analyzer import TrendAnalyzer
from reddit_analyzer import RedditAnalyzer
from amazon_scraper import AmazonScraper
from content_generator import ContentGenerator
from github_publisher import GitHubPublisher
import schedule
import time
import logging
from datetime import datetime

class ContentOrchestrator:
    def __init__(self):
        self.trend_analyzer = TrendAnalyzer()
        self.reddit_analyzer = RedditAnalyzer()
        self.amazon_scraper = AmazonScraper(os.getenv('AMAZON_AFFILIATE_ID'))
        self.content_generator = ContentGenerator()
        self.github_publisher = GitHubPublisher()
        
        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    def generate_daily_content(self):
        """Main content generation workflow"""
        
        self.logger.info("Starting daily content generation...")
        
        try:
            # 1. Analyze trends
            trends = self.trend_analyzer.get_trending_topics()
            reddit_topics = self.reddit_analyzer.get_hot_topics()
            
            # 2. Select best topic
            selected_topic = self._select_best_topic(trends, reddit_topics)
            
            if not selected_topic:
                self.logger.warning("No suitable topic found")
                return False
            
            # 3. Research products
            products = self.amazon_scraper.search_products(
                selected_topic['search_query'], 
                max_results=8
            )
            
            if len(products) < 3:
                self.logger.warning("Insufficient products found")
                return False
            
            # 4. Generate content
            blog_post = self.content_generator.generate_blog_post(
                selected_topic, 
                products
            )
            
            if not blog_post:
                self.logger.error("Failed to generate blog post")
                return False
            
            # 5. Publish to GitHub
            success = self.github_publisher.publish_post(blog_post)
            
            if success:
                self.logger.info(f"Successfully published: {blog_post['title']}")
                return True
            else:
                self.logger.error("Failed to publish blog post")
                return False
                
        except Exception as e:
            self.logger.error(f"Error in content generation: {e}")
            return False
    
    def _select_best_topic(self, trends, reddit_topics):
        """Select the best topic based on multiple factors"""
        
        # Combine and score topics
        all_topics = []
        
        # Process Google Trends
        for trend in trends[:5]:
            all_topics.append({
                'main_topic': trend['keyword'],
                'search_query': trend['keyword'],
                'score': trend['interest_score'],
                'source': 'google_trends',
                'trending_aspects': f"Currently trending with {trend['interest_score']} interest score"
            })
        
        # Process Reddit topics
        for topic in reddit_topics[:5]:
            all_topics.append({
                'main_topic': topic['title'],
                'search_query': self._extract_keywords(topic['title']),
                'score': topic['score'] / 100,  # Normalize Reddit scores
                'source': 'reddit',
                'trending_aspects': f"Popular on r/{topic['subreddit']} with {topic['score']} upvotes"
            })
        
        # Sort by score and return best topic
        all_topics.sort(key=lambda x: x['score'], reverse=True)
        
        return all_topics[0] if all_topics else None
    
    def _extract_keywords(self, title):
        """Extract searchable keywords from title"""
        # Simple keyword extraction - can be enhanced with NLP
        tech_keywords = ['AI', 'automation', 'machine learning', 'productivity', 'optimization']
        title_lower = title.lower()
        
        for keyword in tech_keywords:
            if keyword.lower() in title_lower:
                return keyword
        
        # Fallback to first few words
        words = title.split()[:3]
        return ' '.join(words)
    
    def start_scheduler(self):
        """Start the content generation scheduler"""
        
        # Schedule content generation
        schedule.every().day.at("09:00").do(self.generate_daily_content)
        schedule.every().monday.at("14:00").do(self.generate_daily_content)
        schedule.every().friday.at("16:00").do(self.generate_daily_content)
        
        self.logger.info("Content generation scheduler started")
        
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute

if __name__ == "__main__":
    orchestrator = ContentOrchestrator()
    
    # Run once immediately for testing
    orchestrator.generate_daily_content()
    
    # Start scheduler for production
    # orchestrator.start_scheduler()
```