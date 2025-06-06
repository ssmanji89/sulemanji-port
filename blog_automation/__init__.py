"""
Blog Automation System

An automated blog content generation system that creates engaging technical blog posts
from trending topics discovered on Reddit and other sources. Features include:

- Dynamic content generation with multiple writing styles
- Affiliate product integration 
- Reddit thread attribution
- SEO optimization
- Professional blog post formatting

Author: Suleman Manji
"""

__version__ = "1.0.0"
__author__ = "Suleman Manji"

from .config import Config
from .models import TrendingTopic, BlogPost, Product
from .orchestrator import BlogAutomationOrchestrator

__all__ = [
    "Config",
    "TrendingTopic", 
    "BlogPost",
    "Product",
    "BlogAutomationOrchestrator"
] 