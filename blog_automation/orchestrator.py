"""
Main Orchestrator

Coordinates the entire blog content generation and publishing workflow
with comprehensive error handling and logging.
"""

import asyncio
import logging
import time
from typing import Optional, Dict, Any
from .config import config, setup_logging
from .models import ContentGenerationRequest, TrendingTopic
from .modules.trend_discovery import TrendDiscovery
from .modules.content_generator import ContentGenerator
from .modules.product_research import ProductResearcher
from .modules.content_assembler import ContentAssembler
from .modules.publisher import GitHubPublisher
from .modules.houston_events_scraper import HoustonEventsScraper
from .modules.event_content_generator import EventContentGenerator
from .modules.post_analyzer import PostAnalyzer
from datetime import datetime

logger = logging.getLogger(__name__)


class BlogAutomationOrchestrator:
    """Main orchestrator for the automated blog generation system."""
    
    def __init__(self):
        """Initialize the orchestrator with all required components."""
        self.trend_discovery = TrendDiscovery()
        self.content_generator = ContentGenerator()
        self.product_researcher = ProductResearcher()
        self.content_assembler = ContentAssembler()
        self.publisher = GitHubPublisher()
        
        # Houston events components (lazy initialized)
        self._houston_events_scraper = None
        self._event_content_generator = None
        self._post_analyzer = None
    
    async def run_workflow(self, num_topics: int = 5) -> Dict[str, Any]:
        """
        Run the complete blog automation workflow
        
        Args:
            num_topics: Number of trending topics to discover
            
        Returns:
            Dictionary with workflow results
        """
        workflow_id = f"workflow_{int(time.time())}"
        start_time = time.time()
        
        logger.info(f"Starting blog automation workflow: {workflow_id}")
        
        try:
            # Validate configuration
            if not config.validate():
                raise Exception("Configuration validation failed")
            
            # Step 1: Discover trending topics (method name was wrong)
            logger.info(f"Starting trend discovery for {num_topics} topics")
            trending_topics = await self.trend_discovery.discover_trending_topics(num_topics)
            
            if not trending_topics:
                raise Exception("No trending topics discovered")
            
            # Select the top topic - convert from TrendingTopic to dict format
            selected_topic_obj = trending_topics[0]
            selected_topic = {
                'title': selected_topic_obj.keyword,
                'description': f"Trending topic: {selected_topic_obj.keyword}",
                'score': selected_topic_obj.final_score,
                'source': selected_topic_obj.source,
                'url': getattr(selected_topic_obj, 'source_url', None),
                'upvotes': getattr(selected_topic_obj, 'search_volume', 0)
            }
            logger.info(f"Selected trending topic: {selected_topic['title']} (score: {selected_topic['score']})")
            
            # Step 2: Generate content
            logger.info(f"Starting content generation for topic: {selected_topic['title']}")
            blog_content = await self.content_generator.generate_content(selected_topic)
            logger.info(f"Generated blog post: {blog_content['title']} ({len(blog_content['content'].split())} words)")
            
            # Step 3: Research affiliate products (now synchronous)
            logger.info(f"Searching for products related to: {selected_topic['title']}")
            products = self.product_researcher.find_relevant_products(
                selected_topic['title'], 
                max_products=3
            )
            logger.info(f"Found {len(products)} affiliate products")
            
            # Step 4: Assemble final blog post
            logger.info(f"Assembling blog post: {blog_content['title']}")
            final_post = await self.content_assembler.assemble_post(
                blog_content, 
                products, 
                selected_topic
            )
            logger.info("Blog post assembly completed successfully")
            
            # Step 5: Publish
            # Need to generate filename for the publisher
            title_slug = blog_content['title'].lower().replace(' ', '-').replace(':', '').replace(',', '').replace('(', '').replace(')', '')[:50]
            date_str = datetime.now().strftime('%Y-%m-%d')
            filename = f"{date_str}-{title_slug}.md"
            
            publish_result = await self.publisher.publish_post(final_post, filename)
            if not publish_result.success:
                raise Exception(f"Publishing failed: {publish_result.error_message}")
            
            published_file = publish_result.file_path
            logger.info(f"Successfully published post: {published_file}")
            
            # Log GitHub workflow details
            if publish_result.pr_url:
                logger.info(f"Created Pull Request: {publish_result.pr_url}")
                logger.info(f"Branch: {publish_result.branch_name}")
                logger.info(f"Commit SHA: {publish_result.commit_sha}")
                
                # Log merge details if merge occurred
                if publish_result.merge_sha:
                    logger.info(f"Successfully merged PR using {publish_result.merge_method} method")
                    logger.info(f"Merge SHA: {publish_result.merge_sha}")
                    logger.info(f"Merge Status: {publish_result.merge_status}")
                else:
                    logger.info(f"PR Status: {publish_result.merge_status}")
            
            # Calculate workflow duration
            duration = time.time() - start_time
            
            result = {
                'workflow_id': workflow_id,
                'success': True,
                'duration': duration,
                'topic': selected_topic,
                'blog_post': {
                    'title': blog_content['title'],
                    'word_count': len(blog_content['content'].split()),
                    'published_file': published_file,
                    'pr_url': publish_result.pr_url,
                    'pr_number': publish_result.pr_number,
                    'branch_name': publish_result.branch_name,
                    'commit_sha': publish_result.commit_sha,
                    'merge_sha': publish_result.merge_sha,
                    'merge_status': publish_result.merge_status,
                    'merge_method': publish_result.merge_method
                },
                'products_found': len(products),
                'total_topics_discovered': len(trending_topics)
            }
            
            logger.info(f"Workflow completed successfully in {duration:.2f} seconds")
            return result
            
        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"Workflow failed after {duration:.2f} seconds: {e}")
            
            return {
                'workflow_id': workflow_id,
                'success': False,
                'duration': duration,
                'error': str(e)
            }
    
    async def run_test_workflow(self, test_topic: str = None) -> Dict[str, Any]:
        """
        Run a test workflow with a specific topic
        
        Args:
            test_topic: Specific topic to test with
            
        Returns:
            Dictionary with test results
        """
        if test_topic:
            # Create a mock trending topic
            selected_topic = {
                'title': test_topic,
                'description': f"Test topic: {test_topic}",
                'score': 1.0,
                'source': 'test',
                'url': None,
                'upvotes': 0
            }
            
            logger.info(f"Running test workflow with topic: {test_topic}")
            
            try:
                # Generate content
                blog_content = await self.content_generator.generate_content(selected_topic)
                
                # Research products (synchronous)
                products = self.product_researcher.find_relevant_products(test_topic, max_products=3)
                
                # Assemble post
                final_post = await self.content_assembler.assemble_post(
                    blog_content, 
                    products, 
                    selected_topic
                )
                
                # For test, save to a test file instead of publishing
                test_filename = "test_blog_post.md"
                with open(test_filename, 'w', encoding='utf-8') as f:
                    f.write(final_post)
                
                return {
                    'success': True,
                    'topic': test_topic,
                    'blog_post': blog_content,
                    'products_found': len(products),
                    'test_file': test_filename
                }
                
            except Exception as e:
                logger.error(f"Test workflow failed: {e}")
                return {
                    'success': False,
                    'error': str(e)
                }
        else:
            # Run normal workflow
            return await self.run_workflow(num_topics=1)
    
    @property
    def houston_events_scraper(self):
        """Lazy initialize Houston events scraper."""
        if self._houston_events_scraper is None:
            self._houston_events_scraper = HoustonEventsScraper()
        return self._houston_events_scraper
    
    @property
    def event_content_generator(self):
        """Lazy initialize event content generator."""
        if self._event_content_generator is None:
            self._event_content_generator = EventContentGenerator()
        return self._event_content_generator
    
    @property
    def post_analyzer(self):
        """Lazy initialize post analyzer."""
        if self._post_analyzer is None:
            self._post_analyzer = PostAnalyzer()
        return self._post_analyzer
    
    async def run_events_workflow(self, max_events: int = 20) -> Dict[str, Any]:
        """
        Run Houston events-specific blog generation workflow.
        
        Args:
            max_events: Maximum number of events to scrape
            
        Returns:
            Dictionary with workflow results
        """
        workflow_id = f"events_workflow_{int(time.time())}"
        start_time = time.time()
        
        logger.info(f"Starting Houston events workflow: {workflow_id}")
        
        try:
            # Check if Houston events are enabled
            if not config.get('houston_events.enabled', False):
                raise Exception("Houston events feature is not enabled in configuration")
            
            # Validate configuration
            if not config.validate():
                raise Exception("Configuration validation failed")
            
            # Step 1: Scrape Houston events
            logger.info(f"Scraping Houston events from {len(config.get('houston_events.sources', []))} sources")
            events = await self.houston_events_scraper.scrape_houston_events(max_events)
            
            if not events:
                raise Exception("No Houston events found")
            
            logger.info(f"Found {len(events)} Houston events")
            
            # Step 2: Convert events to trending topics format
            event_topics = self.houston_events_scraper.normalize_event_data(events)
            
            # Step 3: Filter out duplicates using post analyzer
            filtered_topics = []
            for topic in event_topics[:5]:  # Check top 5 events
                if topic.event_data:
                    is_duplicate, _, similarity = self.post_analyzer.check_duplicate_event(
                        topic.event_data.title,
                        topic.event_data.date,
                        topic.event_data.venue,
                        topic.event_data.category
                    )
                    
                    if not is_duplicate:
                        filtered_topics.append(topic)
                    else:
                        logger.info(f"Skipping duplicate event: {topic.event_data.title} (similarity: {similarity:.2f})")
            
            if not filtered_topics:
                raise Exception("All events are duplicates of recent posts")
            
            # Select the best event
            selected_topic_obj = filtered_topics[0]
            selected_topic = {
                'title': selected_topic_obj.event_data.title,
                'description': selected_topic_obj.event_data.description,
                'score': selected_topic_obj.final_score,
                'source': selected_topic_obj.source,
                'url': selected_topic_obj.event_data.url,
                'venue': selected_topic_obj.event_data.venue,
                'category': selected_topic_obj.event_data.category,
                'date': selected_topic_obj.event_data.date.isoformat() if selected_topic_obj.event_data.date else None
            }
            
            logger.info(f"Selected event: {selected_topic['title']} (score: {selected_topic['score']})")
            
            # Step 4: Generate event-specific content
            logger.info(f"Generating event content for: {selected_topic['title']}")
            blog_content = await self.event_content_generator.generate_content(selected_topic)
            logger.info(f"Generated event blog post: {blog_content['title']} ({len(blog_content['content'].split())} words)")
            
            # Step 5: Research affiliate products (events may have fewer relevant products)
            logger.info(f"Searching for event-related products: {selected_topic['title']}")
            products = self.product_researcher.find_relevant_products(
                selected_topic['title'], 
                max_products=2  # Fewer products for events
            )
            logger.info(f"Found {len(products)} event-related products")
            
            # Step 6: Assemble final blog post
            logger.info(f"Assembling event blog post: {blog_content['title']}")
            final_post = await self.content_assembler.assemble_post(
                blog_content, 
                products, 
                selected_topic
            )
            logger.info("Event blog post assembly completed successfully")
            
            # Step 7: Publish
            title_slug = blog_content['title'].lower().replace(' ', '-').replace(':', '').replace(',', '').replace('(', '').replace(')', '')[:50]
            date_str = datetime.now().strftime('%Y-%m-%d')
            filename = f"{date_str}-houston-events-{title_slug}.md"
            
            publish_result = await self.publisher.publish_post(final_post, filename)
            if not publish_result.success:
                raise Exception(f"Publishing failed: {publish_result.error_message}")
            
            published_file = publish_result.file_path
            logger.info(f"Successfully published event post: {published_file}")
            
            # Calculate workflow duration
            duration = time.time() - start_time
            
            result = {
                'workflow_id': workflow_id,
                'success': True,
                'duration': duration,
                'content_type': 'events',
                'topic': selected_topic,
                'blog_post': {
                    'title': blog_content['title'],
                    'word_count': len(blog_content['content'].split()),
                    'published_file': published_file,
                    'pr_url': publish_result.pr_url,
                    'pr_number': publish_result.pr_number,
                    'branch_name': publish_result.branch_name,
                    'commit_sha': publish_result.commit_sha
                },
                'products_found': len(products),
                'total_events_discovered': len(events),
                'events_after_duplicate_filter': len(filtered_topics)
            }
            
            logger.info(f"Events workflow completed successfully in {duration:.2f} seconds")
            return result
            
        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"Events workflow failed after {duration:.2f} seconds: {e}")
            
            return {
                'workflow_id': workflow_id,
                'success': False,
                'duration': duration,
                'content_type': 'events',
                'error': str(e)
            }
    
    async def run_mixed_workflow(self, num_topics: int = 3, max_events: int = 10) -> Dict[str, Any]:
        """
        Run mixed content workflow combining tech trends and Houston events.
        
        Args:
            num_topics: Number of tech trending topics to discover
            max_events: Maximum number of events to scrape
            
        Returns:
            Dictionary with workflow results
        """
        workflow_id = f"mixed_workflow_{int(time.time())}"
        start_time = time.time()
        
        logger.info(f"Starting mixed content workflow: {workflow_id}")
        
        try:
            # Validate configuration
            if not config.validate():
                raise Exception("Configuration validation failed")
            
            # Step 1: Discover both tech trends and events
            logger.info("Discovering tech trends and Houston events")
            
            # Get tech trends
            tech_topics = await self.trend_discovery.discover_trending_topics(num_topics)
            logger.info(f"Found {len(tech_topics)} tech trends")
            
            # Get Houston events (if enabled)
            event_topics = []
            if config.get('houston_events.enabled', False):
                events = await self.houston_events_scraper.scrape_houston_events(max_events)
                event_topics = self.houston_events_scraper.normalize_event_data(events)
                logger.info(f"Found {len(event_topics)} Houston events")
            
            # Combine and score all topics
            all_topics = tech_topics + event_topics
            if not all_topics:
                raise Exception("No topics discovered")
            
            # Sort by score and select the best one
            all_topics.sort(key=lambda t: t.final_score, reverse=True)
            selected_topic_obj = all_topics[0]
            
            # Determine content type and route to appropriate workflow
            if hasattr(selected_topic_obj, 'event_data') and selected_topic_obj.event_data:
                logger.info("Selected topic is an event, routing to events workflow")
                return await self.run_events_workflow(max_events)
            else:
                logger.info("Selected topic is tech-related, routing to standard workflow")
                return await self.run_workflow(num_topics)
            
        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"Mixed workflow failed after {duration:.2f} seconds: {e}")
            
            return {
                'workflow_id': workflow_id,
                'success': False,
                'duration': duration,
                'content_type': 'mixed',
                'error': str(e)
            }
    
    def get_status(self) -> Dict[str, Any]:
        """Get current system status"""
        return {
            'config_valid': config.validate(),
            'google_custom_search_enabled': config.get('google_custom_search.enabled', False),
            'amazon_fallback_enabled': config.get('amazon.fallback_to_scraping', True),
            'houston_events_enabled': config.get('houston_events.enabled', False),
            'houston_events_sources': len(config.get('houston_events.sources', [])),
            'components': {
                'trend_discovery': 'initialized',
                'content_generator': 'initialized', 
                'product_researcher': 'initialized',
                'content_assembler': 'initialized',
                'publisher': 'initialized',
                'houston_events_scraper': 'lazy_initialized',
                'event_content_generator': 'lazy_initialized',
                'post_analyzer': 'lazy_initialized'
            }
        }


async def main():
    """Main entry point for the blog automation system."""
    # Setup logging
    setup_logging()
    
    # Create orchestrator
    orchestrator = BlogAutomationOrchestrator()
    
    # Run a single post generation
    result = await orchestrator.run_workflow()
    
    if result["success"]:
        print(f"✅ Successfully generated and published: {result['blog_post']['title']}")
        print(f"📊 Word count: {result['blog_post']['word_count']}")
        print(f"🔗 Products found: {result['products_found']}")
        print(f"⏱️  Total time: {result['duration']:.2f} seconds")
    else:
        print(f"❌ Workflow failed: {result['error']}")


if __name__ == "__main__":
    asyncio.run(main())