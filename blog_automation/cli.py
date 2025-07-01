"""
Command Line Interface for Blog Automation System

Provides commands to generate blog posts, manage content, and configure the system.
"""

import asyncio
import argparse
import logging
import sys
from datetime import datetime
from pathlib import Path

from .orchestrator import BlogAutomationOrchestrator
from .config import config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('blog_automation.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)


async def generate_blog_post(save_test: bool = False, content_type: str = "tech"):
    """Generate a new blog post."""
    try:
        logger.info(f"Starting blog post generation (content type: {content_type})...")
        
        # Validate configuration
        if not config.validate():
            logger.error("Configuration validation failed. Please check your .env file.")
            return False
        
        # Initialize orchestrator
        orchestrator = BlogAutomationOrchestrator()
        
        # Generate content based on type
        if content_type == "events":
            result = await orchestrator.run_events_workflow()
        elif content_type == "mixed":
            result = await orchestrator.run_mixed_workflow()
        else:
            result = await orchestrator.run_workflow()
        
        if result.get("success"):
            file_path = result["blog_post"]["published_file"]
            logger.info(f"✅ Blog post generated successfully!")
            logger.info(f"📁 Output file: {file_path}")
            
            if save_test:
                # Also save as test file for inspection
                test_path = Path("test_blog_post.md")
                import shutil
                shutil.copy2(file_path, test_path)
                logger.info(f"📋 Test copy saved to: {test_path}")
            
            return True
        else:
            logger.error("❌ Blog post generation failed")
            if "error" in result:
                logger.error(f"Error: {result['error']}")
            return False
            
    except Exception as e:
        logger.error(f"Error generating blog post: {e}")
        return False


def show_config():
    """Display current configuration."""
    print("\n🔧 Blog Automation Configuration")
    print("=" * 50)
    
    config_data = config.get_all()
    
    # Display key configuration values (without sensitive data)
    display_config = {
        'openai_model': config_data.get('openai', {}).get('model', 'N/A'),
        'openai_max_tokens': config_data.get('openai', {}).get('max_tokens', 'N/A'),
        'google_custom_search_enabled': config_data.get('google_custom_search', {}).get('enabled', False),
        'amazon_affiliate_tag': config_data.get('amazon', {}).get('affiliate_tag', 'N/A'),
        'blog_output_dir': config_data.get('blog', {}).get('output_dir', 'N/A'),
        'blog_author': config_data.get('blog', {}).get('author', 'N/A'),
        'reddit_user_agent': config_data.get('reddit', {}).get('user_agent', 'N/A'),
        'houston_events_enabled': config_data.get('houston_events', {}).get('enabled', False),
        'houston_events_sources': len(config_data.get('houston_events', {}).get('sources', [])),
        'api_keys_configured': bool(config.get('openai.api_key') and config.get('reddit.client_id')),
    }
    
    for key, value in display_config.items():
        print(f"{key:25}: {value}")
    
    print("\n" + "=" * 50)
    
    # Validation status
    if config.validate():
        print("✅ Configuration is valid")
    else:
        print("❌ Configuration has issues - check your .env file")


def show_status():
    """Show system status and recent activity."""
    print("\n📊 Blog Automation Status")
    print("=" * 50)
    
    # Check log file for recent activity
    log_file = Path("blog_automation.log")
    if log_file.exists():
        print(f"📜 Log file: {log_file} ({log_file.stat().st_size} bytes)")
        
        # Show last few log entries
        try:
            with open(log_file, 'r') as f:
                lines = f.readlines()
                recent_lines = lines[-10:] if len(lines) > 10 else lines
                
            print("\n🕐 Recent Activity:")
            print("-" * 30)
            for line in recent_lines:
                print(line.strip())
                
        except Exception as e:
            print(f"Error reading log file: {e}")
    else:
        print("📜 No log file found")
    
    # Check output directory
    output_dir = Path(config.get('blog.output_dir', '_posts'))
    if output_dir.exists():
        posts = list(output_dir.glob("*.md"))
        print(f"\n📝 Posts in {output_dir}: {len(posts)}")
        
        # Show recent posts
        if posts:
            recent_posts = sorted(posts, key=lambda p: p.stat().st_mtime, reverse=True)[:5]
            print("\n📰 Recent Posts:")
            print("-" * 30)
            for post in recent_posts:
                mtime = datetime.fromtimestamp(post.stat().st_mtime)
                print(f"  {post.name} ({mtime.strftime('%Y-%m-%d %H:%M')})")
    
    print("\n" + "=" * 50)


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Blog Automation System - Generate engaging technical blog posts automatically",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python -m blog_automation.cli generate                           # Generate a new tech blog post
  python -m blog_automation.cli generate --content-type events     # Generate Houston events post
  python -m blog_automation.cli generate --content-type mixed      # Generate mixed content post
  python -m blog_automation.cli generate --test                    # Generate and save test copy
  python -m blog_automation.cli config                             # Show configuration
  python -m blog_automation.cli status                             # Show system status
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Generate command
    generate_parser = subparsers.add_parser('generate', help='Generate a new blog post')
    generate_parser.add_argument(
        '--test', 
        action='store_true', 
        help='Save a test copy of the generated post'
    )
    generate_parser.add_argument(
        '--content-type',
        choices=['tech', 'events', 'mixed'],
        default='tech',
        help='Type of content to generate (default: tech)'
    )
    
    # Config command
    config_parser = subparsers.add_parser('config', help='Show configuration')
    
    # Status command
    status_parser = subparsers.add_parser('status', help='Show system status')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    try:
        if args.command == 'generate':
            success = asyncio.run(generate_blog_post(save_test=args.test, content_type=args.content_type))
            sys.exit(0 if success else 1)
            
        elif args.command == 'config':
            show_config()
            
        elif args.command == 'status':
            show_status()
            
    except KeyboardInterrupt:
        print("\n\n⏹️  Operation cancelled by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main() 