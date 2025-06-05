#!/usr/bin/env python3
"""
Setup script for the Blog Automation System

This script helps you set up the blog automation system by:
1. Checking dependencies
2. Validating configuration
3. Running initial tests
4. Providing setup guidance
"""

import os
import sys
import subprocess
from pathlib import Path


def check_python_version():
    """Check if Python version is compatible."""
    if sys.version_info < (3.8, 0):
        print("❌ Python 3.8 or higher is required")
        return False
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")
    return True


def check_virtual_environment():
    """Check if virtual environment is active."""
    if hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
        print("✅ Virtual environment is active")
        return True
    else:
        print("⚠️  Virtual environment not detected")
        print("   Recommendation: Activate your virtual environment first")
        return False


def check_dependencies():
    """Check if required packages are installed."""
    required_packages = [
        'openai', 'aiohttp', 'praw', 'pytrends', 'beautifulsoup4',
        'requests', 'python-dotenv', 'PyGithub', 'pytest'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
            print(f"✅ {package}")
        except ImportError:
            print(f"❌ {package}")
            missing_packages.append(package)
    
    if missing_packages:
        print(f"\n📦 Missing packages: {', '.join(missing_packages)}")
        print("   Run: pip install -r requirements.txt")
        return False
    
    return True


def check_environment_file():
    """Check if .env file exists and guide setup."""
    env_file = Path(".env")
    env_example = Path(".env.example")
    
    if not env_file.exists():
        if env_example.exists():
            print("⚠️  .env file not found")
            print("   Copy .env.example to .env and configure your API keys:")
            print("   cp .env.example .env")
        else:
            print("❌ Neither .env nor .env.example found")
        return False
    
    print("✅ .env file found")
    return True


def check_configuration():
    """Check if configuration is valid."""
    try:
        from blog_automation.config import Config
        
        if Config.validate():
            print("✅ Configuration is valid")
            return True
        else:
            print("❌ Configuration is invalid")
            print("   Check your .env file and ensure all required variables are set:")
            print("   - OPENAI_API_KEY")
            print("   - REDDIT_CLIENT_ID")
            print("   - REDDIT_CLIENT_SECRET") 
            print("   - GITHUB_TOKEN")
            print("   - GITHUB_REPO")
            return False
            
    except ImportError as e:
        print(f"❌ Cannot import configuration: {e}")
        return False


def run_tests():
    """Run the test suite."""
    try:
        print("🧪 Running tests...")
        result = subprocess.run([sys.executable, "test_system.py"], 
                              capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ All tests passed")
            return True
        else:
            print("❌ Some tests failed")
            print(result.stdout)
            print(result.stderr)
            return False
            
    except Exception as e:
        print(f"❌ Error running tests: {e}")
        return False


def print_usage_guide():
    """Print usage guide."""
    print("\n" + "="*60)
    print("🚀 BLOG AUTOMATION SYSTEM READY!")
    print("="*60)
    
    print("\n📋 Quick Start Commands:")
    print("  • Generate a single post:")
    print("    python -m blog_automation.cli generate")
    print()
    print("  • Generate with custom topic:")
    print("    python -m blog_automation.cli generate --topic 'AI automation'")
    print()
    print("  • Run daily automation:")
    print("    python -m blog_automation.cli daily")
    print()
    print("  • Check configuration:")
    print("    python -m blog_automation.cli config")
    
    print("\n📚 Documentation:")
    print("  • Full documentation: README_BLOG_AUTOMATION.md")
    print("  • Test output example: test_blog_post.md")
    
    print("\n🔧 Configuration Files:")
    print("  • Environment variables: .env")
    print("  • Dependencies: requirements.txt")
    print("  • System configuration: blog_automation/config.py")


def main():
    """Main setup function."""
    print("🔧 Blog Automation System Setup")
    print("="*40)
    
    checks = [
        ("Python Version", check_python_version),
        ("Virtual Environment", check_virtual_environment),
        ("Dependencies", check_dependencies),
        ("Environment File", check_environment_file),
        ("Configuration", check_configuration),
        ("System Tests", run_tests),
    ]
    
    all_passed = True
    
    for check_name, check_func in checks:
        print(f"\n🔍 Checking {check_name}...")
        if not check_func():
            all_passed = False
    
    print("\n" + "="*40)
    print("SETUP SUMMARY")
    print("="*40)
    
    if all_passed:
        print("✅ All checks passed!")
        print_usage_guide()
    else:
        print("❌ Some checks failed. Please address the issues above.")
        print("\n💡 Common solutions:")
        print("  1. Activate virtual environment: source .venv/bin/activate")
        print("  2. Install dependencies: pip install -r requirements.txt")
        print("  3. Copy environment file: cp .env.example .env")
        print("  4. Configure API keys in .env file")
        
        sys.exit(1)


if __name__ == "__main__":
    main()