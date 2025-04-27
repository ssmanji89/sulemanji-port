"""
Product Selection Module
Selects suitable Amazon products based on trending topics
"""
import os
import logging
import random
import json
import requests
from datetime import datetime

from utils.amazon_utils import generate_product_link, generate_search_link
from utils.storage import save_data, load_data

logger = logging.getLogger(__name__)

def select_products(trending_topics, max_products=5):
    """
    Select Amazon products based on trending topics
    Returns a list of product dictionaries with details and affiliate links
    """
    try:
        logger.info(f"Selecting products for {len(trending_topics)} trending topics")
        
        # Get affiliate tag from environment
        affiliate_tag = os.environ.get("AMAZON_ASSOCIATES_TAG")
        if not affiliate_tag:
            logger.error("Amazon Associates tag not found in environment variables")
            return []
        
        selected_products = []
        
        # For each trending topic, find relevant Amazon products
        for topic in trending_topics[:10]:  # Limit to 10 topics to avoid API overuse
            # In a production system, you would use Amazon's Product Advertising API
            # For this MVP, we'll simulate product discovery with a simplified approach
            
            products = find_products_for_topic(topic)
            
            # Filter products by criteria (rating, reviews, price, etc.)
            filtered_products = filter_products(products)
            
            # Add affiliate links to products
            for product in filtered_products:
                if "asin" in product:
                    product["affiliate_link"] = generate_product_link(product["asin"], affiliate_tag)
                else:
                    product["affiliate_link"] = generate_search_link(topic, affiliate_tag)
                
                product["search_term"] = topic
                selected_products.append(product)
        
        # Sort products by potential (this would use more sophisticated metrics in production)
        selected_products.sort(key=lambda p: p.get("rating", 0) * p.get("review_count", 0), reverse=True)
        
        # Save selected products to history
        save_selected_products(selected_products[:max_products])
        
        return selected_products[:max_products]
    
    except Exception as e:
        logger.error(f"Error selecting products: {str(e)}")
        return []

def find_products_for_topic(topic):
    """
    Find Amazon products for a given topic
    This is a simplified simulation - in production, you would use Amazon's API
    """
    # Simulate product discovery
    # In a real implementation, this would call Amazon's Product Advertising API
    
    # For now, we'll create mock product data
    mock_products = []
    
    # Generate 1-3 mock products per topic
    for i in range(random.randint(1, 3)):
        mock_products.append({
            "asin": f"B0{random.randint(1000000, 9999999)}X",
            "title": f"{topic} - Premium Version {i+1}",
            "description": f"The best {topic} on the market with advanced features.",
            "price": round(random.uniform(19.99, 199.99), 2),
            "rating": round(random.uniform(3.5, 5.0), 1),
            "review_count": random.randint(10, 5000),
            "image_url": f"https://example.com/images/{topic.replace(' ', '_')}_{i}.jpg",
            "category": random.choice(["Electronics", "Home", "Kitchen", "Fashion", "Books"])
        })
    
    return mock_products

def filter_products(products):
    """
    Filter products based on criteria like minimum rating, review count, etc.
    """
    # Define minimum criteria
    min_rating = 4.0
    min_reviews = 20
    
    # Filter products
    filtered = [
        p for p in products 
        if p.get("rating", 0) >= min_rating and p.get("review_count", 0) >= min_reviews
    ]
    
    return filtered

def save_selected_products(products):
    """Save selected products to persistent storage"""
    current_data = load_data("selected_products.json") or {}
    current_data[datetime.now().isoformat()] = [
        {k: v for k, v in p.items() if k != "description"} for p in products  # Save simplified version
    ]
    
    # Keep only the last 30 selections
    if len(current_data) > 30:
        sorted_keys = sorted(current_data.keys())
        for old_key in sorted_keys[:-30]:
            current_data.pop(old_key)
    
    save_data("selected_products.json", current_data) 