#!/usr/bin/env python3
"""
Example script demonstrating how to use the ProductFinder

This script shows basic usage of the ProductFinder class to find
Amazon products using Google Search and display the results.
"""

import os
import sys
import json
import logging
from dotenv import load_dotenv

# Add the project directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import ProductFinder
from modules.product_finder import ProductFinder

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("example")

def main():
    """Main function to demonstrate ProductFinder usage"""
    # Load environment variables from .env file (if exists)
    load_dotenv()
    
    # Get Amazon affiliate tag from environment variable or use default
    affiliate_tag = os.getenv("AMAZON_AFFILIATE_TAG", "exampletag-20")
    
    # Create cache directory
    cache_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "cache")
    os.makedirs(cache_dir, exist_ok=True)
    
    # Initialize ProductFinder
    product_finder = ProductFinder(
        affiliate_tag=affiliate_tag,
        max_results=5,
        cache_dir=cache_dir
    )
    
    # Example 1: Basic search
    logger.info("Example 1: Basic search for best gaming headphones")
    products = product_finder.find_products("best gaming headphones", use_cache=True)
    display_products(products, "Gaming Headphones")
    
    # Example 2: Category search with randomization
    logger.info("\nExample 2: Random products from the 'home kitchen appliances' category")
    random_products = product_finder.get_random_products("home kitchen appliances", count=3)
    display_products(random_products, "Random Kitchen Appliances")
    
    # Example 3: Keyword search
    logger.info("\nExample 3: Search by keywords")
    keyword_products = product_finder.search_by_keywords(
        ["wireless", "earbuds", "noise", "cancelling"], 
        count=3
    )
    display_products(keyword_products, "Wireless Earbuds with Noise Cancellation")

def display_products(products, title):
    """Display products in a formatted way"""
    print(f"\n--- {title} ({len(products)} products) ---")
    
    for i, product in enumerate(products, 1):
        print(f"\n{i}. {product.get('title', 'Unknown Product')}")
        print(f"   Brand: {product.get('brand', 'Unknown')}")
        
        if product.get('price'):
            print(f"   Price: ${product.get('price', 0):.2f}")
        
        if product.get('rating'):
            print(f"   Rating: {product.get('rating', 0)} ({product.get('review_count', 0)} reviews)")
        
        print(f"   URL: {product.get('url', 'N/A')}")
        print(f"   ASIN: {product.get('asin', 'N/A')}")
        
        description = product.get('description', '')
        if description:
            # Truncate description if too long
            if len(description) > 100:
                description = description[:97] + "..."
            print(f"   Description: {description}")

if __name__ == "__main__":
    main() 