#!/usr/bin/env python3
"""
Command Line Interface for the Blog Automation System

Provides easy-to-use commands for running the blog generation workflow.
"""

import asyncio
import argparse
import sys
from datetime import datetime
from .config import setup_logging, Config
from .orchestrator import BlogAutomationOrchestrator
from .models import TrendingTopic


async def run_single_post(custom_keyword: str = None):
    """Generate and publish a single blog post."""
    orchestrator = BlogAutomationOrchestrator()
    
    custom_topic = None
    if custom_keyword:
        custom_topic = TrendingTopic(
            keyword=custom_keyword,
            trend_score=1.0,
            search_volume=1000,
            related_terms=[],
            timestamp=datetime.now(),
            source="manual"
        )
    
    result = await orchestrator.generate_and_publish_post(custom_topic)
    
    if result["success"]:
        print("✅ Blog post generated and published successfully!")
        print(f"📝 Title: {result['blog_post']['title']}")
        print(f"📊 Word count: {result['blog_post']['word_count']}")
        print(f"🏷️  Category: {result['blog_post']['category']}")
        print(f"🔗 Products found: {result['products_found']}")
        print(f"📁 File: {result['publishing']['filename']}")
        print(f"⏱️  Total time: {result['metrics']['total_time_seconds']:.2f} seconds")
    else:
        print(f"❌ Failed to generate blog post: {result['error']}")
        sys.exit(1)


async def run_daily_automation():
    """Run the daily automation process."""
    orchestrator = BlogAutomationOrchestrator()
    result = await orchestrator.run_daily_automation()
    
    if result["success"]:
        print(f"✅ Daily automation completed!")
        print(f"📝 Posts generated: {result['posts_generated']}/{result['total_attempted']}")
    else:
        print(f"❌ Daily automation failed: {result['error']}")
        sys.exit(1)


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(description="Automated Blog Content Generation System")
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Single post command
    single_parser = subparsers.add_parser("generate", help="Generate a single blog post")
    single_parser.add_argument("--topic", type=str, help="Custom topic keyword (optional)")
    
    # Daily automation command
    subparsers.add_parser("daily", help="Run daily automation process")
    
    # Configuration check command
    subparsers.add_parser("config", help="Check configuration")
    
    args = parser.parse_args()
    
    # Setup logging
    setup_logging()
    
    if args.command == "generate":
        asyncio.run(run_single_post(args.topic))
    elif args.command == "daily":
        asyncio.run(run_daily_automation())
    elif args.command == "config":
        if Config.validate():
            print("✅ Configuration is valid")
            config_info = Config.get_safe_config()
            for key, value in config_info.items():
                print(f"  {key}: {value}")
        else:
            print("❌ Configuration is invalid - check environment variables")
            sys.exit(1)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()