"""
Trend Discovery Module
Discovers trending topics using Google Search API
"""
import os
import json
import logging
from datetime import datetime
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from utils.storage import save_data, load_data

logger = logging.getLogger(__name__)

def discover_trends():
    """
    Discover trending topics using Google Search API
    Returns a list of trending topics relevant to Amazon products
    """
    try:
        # Initialize Google Search API client
        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            logger.error("Google API key not found in environment variables")
            return []
        
        service = build("customsearch", "v1", developerKey=api_key)
        
        # Define search queries to discover trends
        search_queries = [
            "trending products on amazon",
            "best selling amazon products",
            "new amazon products trending",
            "popular amazon products this month"
        ]
        
        trending_topics = []
        
        # Execute searches and collect results
        for query in search_queries:
            logger.info(f"Searching for: {query}")
            
            result = service.cse().list(
                q=query,
                cx=os.environ.get("GOOGLE_CSE_ID", ""),  # Custom Search Engine ID
                num=10
            ).execute()
            
            # Process search results
            if "items" in result:
                for item in result["items"]:
                    # Extract relevant information from search results
                    title = item.get("title", "")
                    snippet = item.get("snippet", "")
                    
                    # Extract potential product names from title and snippet
                    product_candidates = extract_product_names(title, snippet)
                    trending_topics.extend(product_candidates)
        
        # Deduplicate and filter trending topics
        trending_topics = list(set(trending_topics))
        
        # Save trending topics to persistent storage
        save_trending_topics(trending_topics)
        
        return trending_topics
    
    except HttpError as e:
        logger.error(f"Google API error: {str(e)}")
        return []
    except Exception as e:
        logger.error(f"Error discovering trends: {str(e)}")
        return []

def extract_product_names(title, snippet):
    """
    Extract potential product names from search result title and snippet
    This is a simplified version - in production, you might use NLP for better extraction
    """
    # Split text by common separators and filter out short terms
    words = title.split() + snippet.split()
    phrases = []
    
    # Extract phrases that might be product names (this is simplified)
    current_phrase = []
    for word in words:
        if word[0].isupper() or (len(current_phrase) > 0 and len(word) > 2):
            current_phrase.append(word)
        elif len(current_phrase) > 1:
            phrases.append(" ".join(current_phrase))
            current_phrase = []
        else:
            current_phrase = []
    
    # Add the last phrase if it exists
    if len(current_phrase) > 1:
        phrases.append(" ".join(current_phrase))
    
    return [phrase for phrase in phrases if len(phrase.split()) > 1 and len(phrase) < 50]

def save_trending_topics(topics):
    """Save trending topics to persistent storage"""
    current_data = load_data("trends.json") or {}
    current_data[datetime.now().isoformat()] = topics
    
    # Keep only the last 30 days of trend data
    if len(current_data) > 30:
        # Sort keys by date and remove oldest
        sorted_keys = sorted(current_data.keys())
        for old_key in sorted_keys[:-30]:
            current_data.pop(old_key)
    
    save_data("trends.json", current_data) 