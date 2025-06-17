#!/usr/bin/env python3
"""
Quick test script for Visit Houston website scraping
This runs with a visible browser to help debug anti-bot issues
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the blog_automation directory to the path
sys.path.insert(0, str(Path(__file__).parent))

# Set environment variable to force non-headless mode
os.environ['SELENIUM_HEADLESS'] = 'false'

from blog_automation.modules.houston_events_scraper import HoustonEventsScraper
from blog_automation.config import config

async def test_visit_houston():
    """Test Visit Houston scraping with visible browser."""
    print("🔍 Testing Visit Houston with Visible Browser")
    print("=" * 50)
    
    # Force non-headless mode for this test
    print("🔧 Setting browser to visible mode for debugging...")
    
    try:
        # Create scraper (will use non-headless mode from env var)
        scraper = HoustonEventsScraper()
        
        print("🌐 Opening Visit Houston website...")
        print("   URL: https://www.visithoustontexas.com/events/events-this-weekend/")
        print("   Browser will open - you can see what's happening!")
        print("   Press Ctrl+C to stop if needed")
        
        # Test Houston events scraping (includes Visit Houston)
        events = await scraper.scrape_houston_events(max_events=10)
        
        print(f"\n✅ Scraping completed!")
        print(f"   Events found: {len(events)}")
        
        if events:
            print("\n📅 Sample Events:")
            for i, event in enumerate(events[:3], 1):
                print(f"   {i}. {event.title}")
                print(f"      Date: {event.date}")
                print(f"      Venue: {event.venue or 'TBD'}")
                print(f"      Category: {event.category or 'General'}")
                print()
        else:
            print("\n⚠️  No events found. Possible issues:")
            print("   - Website structure changed")
            print("   - Anti-bot detection active")
            print("   - Network connectivity issues")
            print("   - Page loading timeout")
        
    except Exception as e:
        print(f"\n❌ Error during test: {e}")
    
    finally:
        print("\n🔧 Browser will close automatically")

if __name__ == "__main__":
    print("🚀 Visit Houston Debug Test")
    print("This will open a visible Chrome browser to debug scraping issues")
    print()
    
    try:
        asyncio.run(test_visit_houston())
    except KeyboardInterrupt:
        print("\n⏹️  Test interrupted by user")
    except Exception as e:
        print(f"\n💥 Test failed: {e}")
    
    print("\n✨ Test complete!") 