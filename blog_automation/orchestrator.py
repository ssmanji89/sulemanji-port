"""
Main Orchestrator

Coordinates the entire blog content generation and publishing workflow
with comprehensive error handling and logging.
"""

import asyncio
import logging
import time
from typing import Optional, Dict, Any
from .config import Config, setup_logging
from .models import ContentGenerationRequest, TrendingTopic
from .modules.trend_discovery import TrendDiscovery
from .modules.content_generator import ContentGenerator
from .modules.product_research import ProductResearcher
from .modules.content_assembler import ContentAssembler
from .modules.publisher import GitHubPublisher

logger = logging.getLogger(__name__)


class BlogAutomationOrchestrator:
    """Main orchestrator for the automated blog generation system."""
    
    def __init__(self):
        """Initialize the orchestrator with all required components."""
        self.trend_discovery = TrendDiscovery()
        self.content_generator = ContentGenerator()
        self.content_assembler = ContentAssembler()
        self.publisher = GitHubPublisher()
    
    async def generate_and_publish_post(self, custom_topic: Optional[TrendingTopic] = None) -> Dict[str, Any]:
        """
        Complete workflow: discover trends, generate content, and publish.
        
        Args:
            custom_topic: Optional custom topic instead of trend discovery
            
        Returns:
            Dictionary with workflow results and metrics
        """
        start_time = time.time()
        workflow_id = f"workflow_{int(start_time)}"
        
        logger.info(f"Starting blog automation workflow: {workflow_id}")
        
        try:
            # Validate configuration
            if not Config.validate():
                raise ValueError("Invalid configuration - missing required environment variables")
            
            # Step 1: Discover trending topic (or use custom topic)
            if custom_topic:
                selected_topic = custom_topic
                logger.info(f"Using custom topic: {selected_topic.keyword}")
            else:
                topics = await self.trend_discovery.discover_trending_topics(max_topics=5)
                if not topics:
                    raise ValueError("No trending topics discovered")
                
                selected_topic = topics[0]  # Use the highest-scoring topic
                logger.info(f"Selected trending topic: {selected_topic.keyword} (score: {selected_topic.final_score:.2f})")
            
            # Step 2: Generate content
            generation_request = ContentGenerationRequest(
                topic=selected_topic,
                target_word_count=Config.TARGET_WORD_COUNT,
                include_products=True,
                max_products=5
            )
            
            generation_result = await self.content_generator.generate_blog_post(generation_request)
            if not generation_result.success:
                raise ValueError(f"Content generation failed: {generation_result.error_message}")
            
            blog_post = generation_result.blog_post
            logger.info(f"Generated blog post: {blog_post.title} ({blog_post.word_count} words)")
            
            # Step 3: Research affiliate products
            products = []
            try:
                async with ProductResearcher() as product_researcher:
                    products = await product_researcher.find_relevant_products(selected_topic, max_products=5)
                    logger.info(f"Found {len(products)} affiliate products")
            except Exception as e:
                logger.warning(f"Product research failed, continuing without products: {e}")
            
            # Step 4: Assemble final content
            final_content = self.content_assembler.assemble_blog_post(blog_post, products, selected_topic)
            filename = self.content_assembler.generate_filename(blog_post)
            
            # Step 5: Publish to GitHub
            publishing_result = await self.publisher.publish_post(final_content, filename)
            if not publishing_result.success:
                raise ValueError(f"Publishing failed: {publishing_result.error_message}")
            
            # Calculate metrics
            total_time = time.time() - start_time
            
            result = {
                "success": True,
                "workflow_id": workflow_id,
                "topic": {
                    "keyword": selected_topic.keyword,
                    "score": selected_topic.final_score,
                    "source": selected_topic.source
                },
                "blog_post": {
                    "title": blog_post.title,
                    "word_count": blog_post.word_count,
                    "category": blog_post.category,
                    "tags": blog_post.tags
                },
                "products_found": len(products),
                "publishing": {
                    "filename": filename,
                    "file_path": publishing_result.file_path,
                    "commit_sha": publishing_result.commit_sha
                },
                "metrics": {
                    "total_time_seconds": total_time,
                    "content_generation_time": generation_result.generation_time_seconds,
                    "api_calls_made": generation_result.api_calls_made
                }
            }
            
            logger.info(f"Workflow completed successfully in {total_time:.2f} seconds")
            return result
            
        except Exception as e:
            logger.error(f"Workflow failed: {e}")
            return {
                "success": False,
                "workflow_id": workflow_id,
                "error": str(e),
                "total_time_seconds": time.time() - start_time
            }    
    async def run_daily_automation(self) -> Dict[str, Any]:
        """Run the daily automation process with rate limiting."""
        logger.info("Starting daily automation process")
        
        try:
            posts_to_generate = Config.POSTS_PER_DAY
            results = []
            
            for i in range(posts_to_generate):
                logger.info(f"Generating post {i + 1} of {posts_to_generate}")
                
                result = await self.generate_and_publish_post()
                results.append(result)
                
                # Rate limiting between posts
                if i < posts_to_generate - 1:
                    delay = Config.CONTENT_GENERATION_DELAY * 60  # Convert to seconds
                    logger.info(f"Waiting {delay} seconds before next post...")
                    await asyncio.sleep(delay)
            
            successful_posts = sum(1 for r in results if r.get("success", False))
            
            return {
                "success": True,
                "posts_generated": successful_posts,
                "total_attempted": posts_to_generate,
                "results": results
            }
            
        except Exception as e:
            logger.error(f"Daily automation failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }


async def main():
    """Main entry point for the blog automation system."""
    # Setup logging
    setup_logging()
    
    # Create orchestrator
    orchestrator = BlogAutomationOrchestrator()
    
    # Run a single post generation
    result = await orchestrator.generate_and_publish_post()
    
    if result["success"]:
        print(f"✅ Successfully generated and published: {result['blog_post']['title']}")
        print(f"📊 Word count: {result['blog_post']['word_count']}")
        print(f"🔗 Products found: {result['products_found']}")
        print(f"⏱️  Total time: {result['metrics']['total_time_seconds']:.2f} seconds")
    else:
        print(f"❌ Workflow failed: {result['error']}")


if __name__ == "__main__":
    asyncio.run(main())