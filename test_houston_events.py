#!/usr/bin/env python3
"""
Test script for Houston Events functionality

This script tests the Houston events scraping and content generation system
without requiring a full blog post generation workflow.
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add the blog_automation directory to the path
sys.path.insert(0, str(Path(__file__).parent))

from blog_automation.modules.houston_events_scraper import HoustonEventsScraper
from blog_automation.modules.event_content_generator import EventContentGenerator
from blog_automation.modules.post_analyzer import PostAnalyzer
from blog_automation.config import config, setup_logging

# Setup logging for testing
setup_logging("test_houston_events.log", logging.INFO)
logger = logging.getLogger(__name__)


async def test_events_scraping():
    """Test Houston events scraping functionality."""
    print("🔍 Testing Houston Events Scraping...")
    
    try:
        scraper = HoustonEventsScraper()
        events = await scraper.scrape_houston_events(max_events=5)
        
        if events:
            print(f"✅ Successfully scraped {len(events)} events")
            
            for i, event in enumerate(events[:3], 1):
                print(f"\n📅 Event {i}:")
                print(f"   Title: {event.title}")
                print(f"   Date: {event.date}")
                print(f"   Venue: {event.venue or 'TBD'}")
                print(f"   Category: {event.category or 'General'}")
                print(f"   Description: {event.description[:100]}...")
            
            return events
        else:
            print("❌ No events found")
            return []
            
    except Exception as e:
        print(f"❌ Error during scraping: {e}")
        logger.error(f"Scraping test failed: {e}")
        return []


async def test_event_content_generation(events):
    """Test event content generation."""
    if not events:
        print("⚠️  Skipping content generation test - no events available")
        return
    
    print("\n📝 Testing Event Content Generation...")
    
    try:
        generator = EventContentGenerator()
        
        # Use the first event for testing
        event = events[0]
        
        # Create a test topic dictionary
        test_topic = {
            'title': event.title,
            'description': event.description or 'Test Houston event',
            'score': 0.8,
            'source': 'houston_events',
            'url': event.url,
            'venue': event.venue,
            'category': event.category,
            'date': event.date.isoformat() if event.date else None
        }
        
        # Generate content
        content = await generator.generate_content(test_topic)
        
        print("✅ Successfully generated event content")
        print(f"   Title: {content['title']}")
        print(f"   Word Count: {len(content['content'].split())} words")
        print(f"   Category: {content['category']}")
        print(f"   Tags: {', '.join(content['tags'][:3])}...")
        
        # Save test content to file
        test_file = Path("test_event_post.md")
        with open(test_file, 'w', encoding='utf-8') as f:
            f.write(f"---\n")
            f.write(f"title: {content['title']}\n")
            f.write(f"category: {content['category']}\n")
            f.write(f"tags: {content['tags']}\n")
            f.write(f"---\n\n")
            f.write(content['content'])
        
        print(f"   Test file saved: {test_file}")
        
    except Exception as e:
        print(f"❌ Error during content generation: {e}")
        logger.error(f"Content generation test failed: {e}")


async def test_duplicate_detection(events):
    """Test duplicate detection functionality."""
    if not events:
        print("⚠️  Skipping duplicate detection test - no events available")
        return
    
    print("\n🔍 Testing Duplicate Detection...")
    
    try:
        analyzer = PostAnalyzer()
        
        # Test with the first event
        event = events[0]
        
        is_duplicate, matching_post, similarity = analyzer.check_duplicate_event(
            event.title,
            event.date,
            event.venue,
            event.category
        )
        
        print(f"✅ Duplicate check completed")
        print(f"   Event: {event.title}")
        print(f"   Is Duplicate: {is_duplicate}")
        print(f"   Similarity Score: {similarity:.2f}")
        
        if matching_post:
            print(f"   Matching Post: {matching_post.get('title', 'Unknown')}")
        
        # Test content freshness
        freshness = analyzer.calculate_content_freshness(
            venue=event.venue,
            category=event.category
        )
        
        print(f"   Content Freshness: {freshness:.2f}")
        
    except Exception as e:
        print(f"❌ Error during duplicate detection: {e}")
        logger.error(f"Duplicate detection test failed: {e}")


def test_configuration():
    """Test Houston events configuration."""
    print("⚙️  Testing Configuration...")
    
    try:
        # Check if Houston events are enabled
        enabled = config.get('houston_events.enabled', False)
        sources = config.get('houston_events.sources', [])
        
        print(f"   Houston Events Enabled: {enabled}")
        print(f"   Configured Sources: {len(sources)}")
        
        for i, source in enumerate(sources, 1):
            print(f"   Source {i}: {source}")
        
        if enabled and sources:
            print("✅ Configuration looks good")
        else:
            print("⚠️  Houston events not fully configured")
            
        return enabled and sources
        
    except Exception as e:
        print(f"❌ Error checking configuration: {e}")
        return False


async def main():
    """Main test function."""
    print("🚀 Houston Events System Test")
    print("=" * 50)
    
    # Test configuration first
    config_ok = test_configuration()
    
    if not config_ok:
        print("\n❌ Configuration test failed - check your .env file")
        print("   Make sure HOUSTON_EVENTS_ENABLED=true")
        print("   And HOUSTON_EVENTS_SOURCES contains valid URLs")
        return
    
    # Test scraping
    events = await test_events_scraping()
    
    # Test content generation
    await test_event_content_generation(events)
    
    # Test duplicate detection
    await test_duplicate_detection(events)
    
    print("\n" + "=" * 50)
    print("🎉 Houston Events System Test Complete")
    
    if events:
        print("✅ All systems operational")
    else:
        print("⚠️  Some issues detected - check logs for details")


if __name__ == "__main__":
    asyncio.run(main()) 