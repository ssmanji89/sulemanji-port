"""
Topic Finder Module

Discovers trending topics for the blog generator by using various sources.
"""
import logging
import random
import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

class TopicFinder:
    """
    Finds trending topics for blog generation.
    Uses multiple sources like Google Trends, Twitter trends, and niche keyword sources.
    """
    
    def __init__(self, max_topics=5):
        """
        Initialize the TopicFinder with configuration.
        
        Args:
            max_topics (int): Maximum number of topics to return
        """
        self.max_topics = max_topics
        self.sources = [
            self._get_google_trends,
            self._get_amazon_bestsellers,
            # Add more sources as implemented
        ]
    
    def find_trending_topics(self):
        """
        Find trending topics from multiple sources.
        
        Returns:
            list: List of trending topic strings
        """
        all_topics = []
        
        # Try each source and aggregate results
        for source_method in self.sources:
            try:
                topics = source_method()
                if topics:
                    all_topics.extend(topics)
                    logger.info(f"Found {len(topics)} topics from {source_method.__name__}")
            except Exception as e:
                logger.error(f"Error getting topics from {source_method.__name__}: {str(e)}")
        
        # Deduplicate topics
        unique_topics = list(set(all_topics))
        
        # Limit to max_topics
        selected_topics = unique_topics[:self.max_topics] if len(unique_topics) > self.max_topics else unique_topics
        
        if not selected_topics:
            logger.warning("No trending topics found from any source")
        
        return selected_topics
    
    def _get_google_trends(self):
        """
        Get trending topics from Google Trends.
        
        Returns:
            list: List of trending topics
        """
        try:
            # For demonstration, using a basic approach
            # In production, consider using a more robust API or library
            url = "https://trends.google.com/trends/trendingsearches/daily/rss?geo=US"
            response = requests.get(url, timeout=10)
            
            if response.status_code != 200:
                logger.warning(f"Failed to get Google Trends: {response.status_code}")
                return []
            
            soup = BeautifulSoup(response.content, "xml")
            topics = []
            
            for item in soup.find_all("item")[:10]:  # Get top 10
                title = item.find("title")
                if title and title.text:
                    topics.append(title.text.strip())
            
            return topics
        
        except Exception as e:
            logger.error(f"Error parsing Google Trends: {str(e)}")
            return []
    
    def _get_amazon_bestsellers(self):
        """
        Get topics from Amazon bestseller categories.
        
        Returns:
            list: List of category topics
        """
        try:
            # Amazon bestseller categories
            # This could be enhanced to scrape actual bestseller items
            categories = [
                "Electronics",
                "Books",
                "Home & Kitchen",
                "Fashion",
                "Beauty & Personal Care",
                "Toys & Games",
                "Sports & Outdoors",
                "Health & Household",
                "Pet Supplies",
                "Tools & Home Improvement"
            ]
            
            # For demo purposes, just return a subset of categories
            # In production, could scrape actual bestseller items from these categories
            return random.sample(categories, min(5, len(categories)))
            
        except Exception as e:
            logger.error(f"Error getting Amazon bestsellers: {str(e)}")
            return []
    
    # Additional source methods can be implemented here
    # def _get_twitter_trends(self):
    #     """Get trending topics from Twitter."""
    #     pass
    
    # def _get_reddit_trends(self):
    #     """Get trending topics from Reddit."""
    #     pass 