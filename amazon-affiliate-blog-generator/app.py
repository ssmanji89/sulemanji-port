#!/usr/bin/env python3
"""
Amazon Affiliate Blog Generator - Main Application
Monolithic Scheduled Job Implementation
"""

import os
import sys
import logging
import traceback
from datetime import datetime

# Import modules
from modules.trend_discovery import discover_trends
from modules.product_selection import select_products
from modules.content_generation import generate_content
from modules.github_integration import publish_to_github
from modules.monitoring import send_notification, log_metrics

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)

logger = logging.getLogger(__name__)

def main():
    """
    Main application flow - executes the full pipeline from trend discovery to publishing
    """
    logger.info("Starting Amazon Affiliate Blog Generator")
    
    try:
        # Step 1: Discover trending topics
        logger.info("Step 1: Discovering trending topics")
        trending_topics = discover_trends()
        logger.info(f"Discovered {len(trending_topics)} trending topics")
        
        if not trending_topics:
            error_msg = "No trending topics found. Exiting."
            logger.error(error_msg)
            send_notification(None, None, error=error_msg)
            return 1
        
        # Step 2: Select products based on trending topics
        logger.info("Step 2: Selecting products based on trending topics")
        selected_products = select_products(trending_topics)
        logger.info(f"Selected {len(selected_products)} products")
        
        if not selected_products:
            error_msg = "No suitable products found. Exiting."
            logger.error(error_msg)
            send_notification(None, None, error=error_msg)
            return 1
        
        # Process the top product
        top_product = selected_products[0]
        logger.info(f"Processing top product: {top_product.get('title', 'Unknown')}")
        
        # Step 3: Generate content for the product
        logger.info("Step 3: Generating blog content")
        content = generate_content(top_product)
        
        if not content:
            error_msg = "Failed to generate content. Exiting."
            logger.error(error_msg)
            send_notification(None, top_product, error=error_msg)
            return 1
        
        # Step 4: Publish to GitHub Pages
        logger.info("Step 4: Publishing content to GitHub Pages")
        post_url = publish_to_github(content, top_product)
        
        if not post_url:
            error_msg = "Failed to publish to GitHub. Exiting."
            logger.error(error_msg)
            send_notification(None, top_product, error=error_msg)
            return 1
        
        # Step 5: Log metrics and send notification
        logger.info("Step 5: Logging metrics and sending notification")
        log_metrics(top_product, post_url)
        send_notification(post_url, top_product)
        
        logger.info(f"Successfully published blog post: {post_url}")
        logger.info("Amazon Affiliate Blog Generator completed successfully")
        return 0
        
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}\n{traceback.format_exc()}"
        logger.error(error_msg)
        send_notification(None, None, error=error_msg)
        return 1

if __name__ == "__main__":
    sys.exit(main()) 