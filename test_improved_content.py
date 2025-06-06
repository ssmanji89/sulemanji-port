#!/usr/bin/env python3

import asyncio
import sys
sys.path.append('.')

from blog_automation.modules.content_generator import ContentGenerator
from blog_automation.models import TrendingTopic, ContentGenerationRequest
from datetime import datetime

async def test_improved_content():
    # Create a test topic
    test_topic = TrendingTopic(
        keyword='AI automation tools revolutionizing workflow optimization',
        trend_score=0.9,
        search_volume=8500,
        related_terms=['machine learning', 'workflow automation', 'productivity tools'],
        timestamp=datetime.now(),
        source='reddit_technology',
        source_url='https://www.reddit.com/r/technology/comments/example/ai_automation_discussion'
    )
    
    # Create content generation request
    request = ContentGenerationRequest(
        topic=test_topic,
        target_word_count=1200
    )
    
    print("🧪 Testing improved content generator...")
    print(f"Topic: {test_topic.keyword}")
    print(f"Source: {test_topic.source}")
    print("=" * 60)
    
    # Generate content
    generator = ContentGenerator()
    result = await generator.generate_blog_post(request)
    
    if result.success:
        print("✅ Content generation successful!")
        print(f"📊 Generation time: {result.generation_time_seconds:.2f}s")
        print(f"🔄 API calls made: {result.api_calls_made}")
        print("\n" + "=" * 60)
        print("📝 GENERATED CONTENT PREVIEW:")
        print("=" * 60)
        
        # Show title and excerpt
        print(f"Title: {result.blog_post.title}")
        print(f"Category: {result.blog_post.category}")
        print(f"Tags: {', '.join(result.blog_post.tags)}")
        print(f"Excerpt: {result.blog_post.excerpt}")
        print("\n" + "-" * 40)
        
        # Show first 800 characters of content
        content_preview = result.blog_post.content[:800]
        print("Content Preview:")
        print(content_preview)
        if len(result.blog_post.content) > 800:
            print("\n[...content continues...]")
        
        # Word count
        word_count = len(result.blog_post.content.split())
        print(f"\n📏 Word count: {word_count} words")
        
    else:
        print("❌ Content generation failed!")
        print(f"Error: {result.error_message}")

if __name__ == "__main__":
    asyncio.run(test_improved_content()) 