"""
Amazon Utilities
Utilities for working with Amazon products and affiliate links
"""
import urllib.parse
import logging

logger = logging.getLogger(__name__)

def generate_product_link(asin, affiliate_tag):
    """
    Generate an Amazon affiliate link for a product
    
    Args:
        asin (str): Amazon Standard Identification Number
        affiliate_tag (str): Amazon Associates tracking ID
        
    Returns:
        str: Formatted affiliate link
    """
    try:
        base_url = "https://www.amazon.com/dp/"
        return f"{base_url}{asin}?tag={affiliate_tag}"
    except Exception as e:
        logger.error(f"Error generating product link: {str(e)}")
        return ""

def generate_search_link(search_term, affiliate_tag):
    """
    Generate an Amazon affiliate link for a search term
    
    Args:
        search_term (str): Search term
        affiliate_tag (str): Amazon Associates tracking ID
        
    Returns:
        str: Formatted affiliate search link
    """
    try:
        base_url = "https://www.amazon.com/s"
        encoded_search = urllib.parse.quote(search_term)
        return f"{base_url}?k={encoded_search}&tag={affiliate_tag}"
    except Exception as e:
        logger.error(f"Error generating search link: {str(e)}")
        return ""

def get_product_image_url(asin, size="medium"):
    """
    Get the image URL for an Amazon product
    
    Args:
        asin (str): Amazon Standard Identification Number
        size (str): Image size (small, medium, large)
        
    Returns:
        str: Amazon product image URL
    """
    try:
        # Map size to Amazon image size codes
        size_map = {
            "small": "SL75_",
            "medium": "SL150_",
            "large": "SL300_"
        }
        
        size_code = size_map.get(size.lower(), "SL150_")
        
        # Construct Amazon image URL
        return f"https://images-na.ssl-images-amazon.com/images/I/{asin}.jpg._{size_code}_.jpg"
    except Exception as e:
        logger.error(f"Error generating product image URL: {str(e)}")
        return ""

def format_price(price):
    """
    Format a price value to display currency
    
    Args:
        price (float): Price value
        
    Returns:
        str: Formatted price string
    """
    try:
        if price is None:
            return "N/A"
        
        return f"${price:.2f}"
    except Exception as e:
        logger.error(f"Error formatting price: {str(e)}")
        return "N/A" 