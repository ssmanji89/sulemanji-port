#!/usr/bin/env python3
"""
Example Usage of Houston Events Blog Generator

This script demonstrates how to use the Houston events functionality
programmatically for custom integrations or advanced use cases.
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add the blog_automation directory to the path
sys.path.insert(0, str(Path(__file__).parent))

from blog_automation.orchestrator import BlogAutomationOrchestrator
from blog_automation.modules.houston_events_scraper import HoustonEventsScraper
from blog_automation.modules.event_content_generator import EventContentGenerator
from blog_automation.config import config, setup_logging

# Setup logging
setup_logging("example_usage.log", logging.INFO)
logger = logging.getLogger(__name__)


async def example_1_basic_events_workflow():
    """Example 1: Basic Houston events blog generation workflow."""
    print("🎯 Example 1: Basic Houston Events Workflow")
    print("-" * 50)
    
    try:
        # Initialize the orchestrator
        orchestrator = BlogAutomationOrchestrator()
        
        # Run the Houston events workflow
        result = await orchestrator.run_events_workflow(max_events=10)
        
        if result['success']:
            print("✅ Events workflow completed successfully!")
            print(f"   Generated post: {result['blog_post']['title']}")
            print(f"   Word count: {result['blog_post']['word_count']}")
            print(f"   Published to: {result['blog_post']['published_file']}")
            print(f"   Events discovered: {result['total_events_discovered']}")
            print(f"   After filtering: {result['events_after_duplicate_filter']}")
        else:
            print(f"❌ Events workflow failed: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"❌ Example 1 failed: {e}")
        logger.error(f"Example 1 error: {e}")


async def example_2_mixed_content_workflow():
    """Example 2: Mixed content workflow (tech + events)."""
    print("\n🎯 Example 2: Mixed Content Workflow")
    print("-" * 50)
    
    try:
        # Initialize the orchestrator
        orchestrator = BlogAutomationOrchestrator()
        
        # Run the mixed workflow
        result = await orchestrator.run_mixed_workflow(num_topics=3, max_events=5)
        
        if result['success']:
            print("✅ Mixed workflow completed successfully!")
            print(f"   Content type selected: {result.get('content_type', 'unknown')}")
            print(f"   Generated post: {result['blog_post']['title']}")
            print(f"   Word count: {result['blog_post']['word_count']}")
            print(f"   Published to: {result['blog_post']['published_file']}")
        else:
            print(f"❌ Mixed workflow failed: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"❌ Example 2 failed: {e}")
        logger.error(f"Example 2 error: {e}")


async def example_3_custom_event_scraping():
    """Example 3: Custom event scraping and processing."""
    print("\n🎯 Example 3: Custom Event Scraping")
    print("-" * 50)
    
    try:
        # Initialize the scraper
        scraper = HoustonEventsScraper()
        
        # Scrape events
        print("🔍 Scraping Houston events...")
        events = await scraper.scrape_houston_events(max_events=5)
        
        if events:
            print(f"✅ Found {len(events)} events")
            
            # Process each event
            for i, event in enumerate(events, 1):
                print(f"\n📅 Event {i}: {event.title}")
                print(f"   Date: {event.date}")
                print(f"   Venue: {event.venue or 'TBD'}")
                print(f"   Category: {event.category or 'General'}")
                print(f"   Score: {scraper._calculate_event_score(event):.2f}")
                
                # Show first 100 characters of description
                desc = event.description or "No description"
                print(f"   Description: {desc[:100]}{'...' if len(desc) > 100 else ''}")
        else:
            print("❌ No events found")
            
    except Exception as e:
        print(f"❌ Example 3 failed: {e}")
        logger.error(f"Example 3 error: {e}")


async def example_4_custom_content_generation():
    """Example 4: Custom event content generation with specific event."""
    print("\n🎯 Example 4: Custom Content Generation")
    print("-" * 50)
    
    try:
        # Create a custom event for testing
        custom_topic = {
            'title': 'Houston Food & Wine Festival 2024',
            'description': 'Annual celebration of Houston\'s diverse culinary scene featuring local restaurants, wineries, and chefs.',
            'score': 0.9,
            'source': 'houston_events',
            'url': 'https://example.com/houston-food-wine-festival',
            'venue': 'Hermann Park',
            'category': 'food',
            'date': '2024-04-15T18:00:00'
        }
        
        # Initialize content generator
        generator = EventContentGenerator()
        
        # Generate content
        print("📝 Generating event content...")
        content = await generator.generate_content(custom_topic)
        
        print("✅ Content generated successfully!")
        print(f"   Title: {content['title']}")
        print(f"   Category: {content['category']}")
        print(f"   Word count: {len(content['content'].split())} words")
        print(f"   Tags: {', '.join(content['tags'][:5])}")
        
        # Save to demo file
        demo_file = Path("demo_event_post.md")
        with open(demo_file, 'w', encoding='utf-8') as f:
            f.write(f"---\n")
            f.write(f"title: {content['title']}\n")
            f.write(f"category: {content['category']}\n")
            f.write(f"tags: {content['tags']}\n")
            f.write(f"excerpt: {content['excerpt']}\n")
            f.write(f"---\n\n")
            f.write(content['content'])
        
        print(f"   Demo file saved: {demo_file}")
        
    except Exception as e:
        print(f"❌ Example 4 failed: {e}")
        logger.error(f"Example 4 error: {e}")


def example_5_configuration_check():
    """Example 5: Configuration validation and status check."""
    print("\n🎯 Example 5: Configuration Check")
    print("-" * 50)
    
    try:
        # Check Houston events configuration
        houston_enabled = config.get('houston_events.enabled', False)
        houston_sources = config.get('houston_events.sources', [])
        min_score = config.get('houston_events.min_event_score', 0.4)
        duplicate_days = config.get('houston_events.duplicate_check_days', 30)
        
        print(f"Houston Events Enabled: {houston_enabled}")
        print(f"Configured Sources: {len(houston_sources)}")
        
        for i, source in enumerate(houston_sources, 1):
            print(f"  {i}. {source}")
        
        print(f"Minimum Event Score: {min_score}")
        print(f"Duplicate Check Days: {duplicate_days}")
        
        # Check orchestrator status
        orchestrator = BlogAutomationOrchestrator()
        status = orchestrator.get_status()
        
        print(f"\nSystem Status:")
        print(f"  Config Valid: {status['config_valid']}")
        print(f"  Houston Events: {status['houston_events_enabled']}")
        print(f"  Event Sources: {status['houston_events_sources']}")
        
        print("\nComponents:")
        for component, status_val in status['components'].items():
            print(f"  {component}: {status_val}")
        
        print("✅ Configuration check completed")
        
    except Exception as e:
        print(f"❌ Example 5 failed: {e}")
        logger.error(f"Example 5 error: {e}")


async def main():
    """Run all examples in sequence."""
    print("🚀 Houston Events Blog Generator - Example Usage")
    print("=" * 60)
    
    # Example 5: Configuration check (runs first, non-async)
    example_5_configuration_check()
    
    # Check if Houston events are enabled before running other examples
    if not config.get('houston_events.enabled', False):
        print("\n⚠️  Houston events are not enabled in configuration")
        print("   Set HOUSTON_EVENTS_ENABLED=true in your .env file to run examples 1-4")
        return
    
    # Example 3: Custom event scraping (lightweight, good for testing)
    await example_3_custom_event_scraping()
    
    # Example 4: Custom content generation (moderate resource usage)
    await example_4_custom_content_generation()
    
    # Ask user before running full workflows (these publish content)
    print("\n" + "=" * 60)
    print("⚠️  The following examples will generate and publish blog posts:")
    print("   - Example 1: Houston Events Workflow")
    print("   - Example 2: Mixed Content Workflow")
    
    try:
        response = input("\nDo you want to run these examples? (y/N): ").strip().lower()
        if response in ['y', 'yes']:
            # Example 1: Basic events workflow
            await example_1_basic_events_workflow()
            
            # Example 2: Mixed content workflow
            await example_2_mixed_content_workflow()
        else:
            print("Skipping publishing examples.")
    except KeyboardInterrupt:
        print("\nSkipping publishing examples.")
    
    print("\n" + "=" * 60)
    print("🎉 Example usage demonstration complete!")
    print("\nNext steps:")
    print("1. Review generated files: demo_event_post.md")
    print("2. Check logs: example_usage.log")
    print("3. Run: python -m blog_automation.cli generate --content-type events")


if __name__ == "__main__":
    asyncio.run(main()) 