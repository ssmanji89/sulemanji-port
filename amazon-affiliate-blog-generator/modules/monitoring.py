"""
Monitoring Module
Handles monitoring, notifications, and analytics
"""
import os
import logging
import json
import requests
from datetime import datetime

from utils.storage import save_data, load_data

logger = logging.getLogger(__name__)

def send_notification(post_url, product, error=None):
    """
    Send notification via Discord webhook
    """
    try:
        # Get Discord webhook URL from environment
        webhook_url = os.environ.get("DISCORD_WEBHOOK")
        
        if not webhook_url:
            logger.error("Discord webhook URL not found in environment variables")
            return False
        
        # Prepare notification message
        if error:
            # Error notification
            message = {
                "content": "❌ Error in Amazon Affiliate Blog Generator",
                "embeds": [
                    {
                        "title": "Error Occurred",
                        "description": error,
                        "color": 15158332,  # Red color
                        "timestamp": datetime.now().isoformat()
                    }
                ]
            }
        else:
            # Success notification
            message = {
                "content": "✅ New Amazon Affiliate Blog Post Published",
                "embeds": [
                    {
                        "title": product.get("title", "New Product Review"),
                        "description": f"A new blog post has been published for {product.get('title', 'a product')}",
                        "url": post_url,
                        "color": 3066993,  # Green color
                        "fields": [
                            {
                                "name": "Product",
                                "value": product.get("title", "N/A"),
                                "inline": True
                            },
                            {
                                "name": "Price",
                                "value": f"${product.get('price', 0):.2f}",
                                "inline": True
                            },
                            {
                                "name": "Affiliate Link",
                                "value": f"[Click Here]({product.get('affiliate_link', '#')})",
                                "inline": False
                            }
                        ],
                        "timestamp": datetime.now().isoformat()
                    }
                ]
            }
        
        # Send notification to Discord
        logger.info("Sending notification to Discord")
        response = requests.post(
            webhook_url,
            json=message,
            headers={"Content-Type": "application/json"}
        )
        
        response.raise_for_status()
        return True
    
    except Exception as e:
        logger.error(f"Error sending notification: {str(e)}")
        return False

def log_metrics(product, post_url):
    """
    Log metrics about the published post
    This would be expanded in a production system to track actual performance
    """
    try:
        logger.info(f"Logging metrics for post: {post_url}")
        
        # Get current metrics
        metrics = load_data("metrics.json") or {
            "total_posts": 0,
            "products_by_category": {},
            "recent_posts": []
        }
        
        # Update metrics
        metrics["total_posts"] += 1
        
        # Update categories
        category = product.get("category", "Uncategorized")
        if category in metrics["products_by_category"]:
            metrics["products_by_category"][category] += 1
        else:
            metrics["products_by_category"][category] = 1
        
        # Add to recent posts
        metrics["recent_posts"].append({
            "title": product.get("title", ""),
            "url": post_url,
            "timestamp": datetime.now().isoformat()
        })
        
        # Keep only the last 10 recent posts
        if len(metrics["recent_posts"]) > 10:
            metrics["recent_posts"] = metrics["recent_posts"][-10:]
        
        # Save updated metrics
        save_data("metrics.json", metrics)
        
        return True
    
    except Exception as e:
        logger.error(f"Error logging metrics: {str(e)}")
        return False 