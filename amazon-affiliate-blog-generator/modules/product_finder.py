"""
Product Finder Module

This module provides functionality to find Amazon products using Google Search
and manage the results for use in blog post generation.
"""

import json
import logging
import os
import random
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional, Union
import hashlib

from .google_search import GoogleProductSearch
from .product_enrichment import ProductEnricher, EnrichedProduct

logger = logging.getLogger(__name__)

class ProductFinder:
    """
    A class for finding Amazon products and managing the search results.
    
    This class uses GoogleProductSearch to find Amazon products and provides additional
    functionality to cache results, get random products, and search by keywords.
    """
    
    # Cache expiration times in hours
    CACHE_EXPIRY = {
        'short': 24,      # 1 day
        'medium': 72,     # 3 days 
        'long': 168,      # 7 days
        'extended': 720   # 30 days
    }
    
    def __init__(self, affiliate_tag="exampletag-20", max_results=5, cache_dir="data/cache", max_retries=3):
        """
        Initialize ProductFinder.
        
        Args:
            affiliate_tag (str): Amazon affiliate tag to use in links
            max_results (int): Maximum number of results to return
            cache_dir (str): Directory to cache search results
            max_retries (int): Maximum number of retry attempts for failed requests
        """
        self.google_search = GoogleProductSearch(
            affiliate_tag=affiliate_tag,
            max_results=max_results,
            max_retries=max_retries,
            cache_dir=os.path.join(cache_dir, "search")
        )
        self.max_results = max_results
        self.cache_dir = cache_dir
        self.product_cache_dir = os.path.join(cache_dir, "products")
        self.search_cache_dir = os.path.join(cache_dir, "search")
        self.metadata_cache_dir = os.path.join(cache_dir, "metadata")
        
        # Create cache directories if they don't exist
        for directory in [self.cache_dir, self.product_cache_dir, self.search_cache_dir, self.metadata_cache_dir]:
            os.makedirs(directory, exist_ok=True)
        
        # Initialize the product enricher
        self.product_enricher = ProductEnricher(cache_dir=self.product_cache_dir)
        
        logger.info(f"Initialized ProductFinder with cache directory: {self.cache_dir}")
    
    def find_products(self, query, use_cache=True, cache_expiry='medium', refresh_data=False):
        """
        Find Amazon products based on a search query.
        
        Args:
            query (str): Search query
            use_cache (bool): Whether to use cached results if available
            cache_expiry (str): Cache expiry level ('short', 'medium', 'long', or 'extended')
            refresh_data (bool): Whether to refresh product data even if using cached results
            
        Returns:
            list: List of product dictionaries with enriched information
        """
        # Validate cache_expiry parameter
        if cache_expiry not in self.CACHE_EXPIRY:
            logger.warning(f"Invalid cache_expiry value: {cache_expiry}, using 'medium' instead")
            cache_expiry = 'medium'
        
        cache_expiry_hours = self.CACHE_EXPIRY[cache_expiry]
        
        # Convert query to cache key
        cache_key = self._get_cache_key(query)
        metadata_file = os.path.join(self.metadata_cache_dir, f"{cache_key}_metadata.json")
        
        # Check if we need to perform the search or can use cached results
        if use_cache:
            metadata = self._load_metadata(metadata_file)
            if metadata and not self._is_cache_expired(metadata, cache_expiry_hours):
                # Get cached product data
                products = self._get_cached_products(metadata['product_ids'], refresh_data)
                if products:
                    logger.info(f"Using cached results for query: {query}")
                    return products
        
        # Search for products
        logger.info(f"Performing new search for query: {query}")
        search_results = self.google_search.search_amazon_products(
            query, 
            use_cache=use_cache, 
            cache_expiry_hours=cache_expiry_hours
        )
        
        # Enrich product data
        enriched_products = []
        product_ids = []
        
        for i, basic_product in enumerate(search_results):
            try:
                # Enrich the product data
                enriched = self.product_enricher.enrich_product(basic_product)
                
                # Save product ID for metadata
                product_id = enriched.asin or self._hash_url(enriched.url)
                product_ids.append(product_id)
                
                # Convert to dictionary for storage
                enriched_products.append(enriched.to_dict())
                
            except Exception as e:
                logger.error(f"Error enriching product {i}: {str(e)}")
                # If enrichment fails, use the basic product
                if basic_product:
                    enriched_products.append(basic_product)
                    product_id = basic_product.get('asin') or self._hash_url(basic_product.get('url', ''))
                    product_ids.append(product_id)
        
        # Create and save metadata
        metadata = {
            'query': query,
            'timestamp': datetime.now().isoformat(),
            'product_count': len(enriched_products),
            'product_ids': product_ids,
            'cache_expiry': cache_expiry
        }
        self._save_metadata(metadata_file, metadata)
        
        return enriched_products
    
    def get_random_products(self, category, count=3, use_cache=True, cache_expiry='medium'):
        """
        Get random products from a category.
        
        Args:
            category (str): Product category
            count (int): Number of products to return
            use_cache (bool): Whether to use cached results if available
            cache_expiry (str): Cache expiry level ('short', 'medium', 'long', or 'extended')
            
        Returns:
            list: List of random product dictionaries
        """
        # Find products in the category
        all_products = self.find_products(category, use_cache, cache_expiry)
        
        # Return random selection
        if all_products:
            # Ensure we don't request more than available
            count = min(count, len(all_products))
            return random.sample(all_products, count)
        
        return []
    
    def search_by_keywords(self, keywords, count=5, use_cache=True, cache_expiry='medium'):
        """
        Search for products by a list of keywords.
        
        Args:
            keywords (list): List of keywords
            count (int): Number of products to return
            use_cache (bool): Whether to use cached results if available
            cache_expiry (str): Cache expiry level ('short', 'medium', 'long', or 'extended')
            
        Returns:
            list: List of product dictionaries
        """
        # Create search query from keywords
        query = " ".join(keywords)
        
        # Find products
        products = self.find_products(query, use_cache, cache_expiry)
        
        # Limit results
        return products[:count]
    
    def refresh_product_data(self, product_id=None):
        """
        Refresh product data in the cache.
        
        Args:
            product_id (str, optional): Specific product ID to refresh, or None to refresh all
            
        Returns:
            int: Number of products refreshed
        """
        refreshed_count = 0
        
        if product_id:
            # Refresh specific product
            product_file = os.path.join(self.product_cache_dir, f"{product_id}.json")
            if os.path.exists(product_file):
                try:
                    with open(product_file, 'r') as f:
                        product_data = json.load(f)
                    
                    if 'url' in product_data:
                        # Re-fetch and enrich the product
                        enriched = self.product_enricher.fetch_and_enrich_product(product_data['url'])
                        if enriched:
                            with open(product_file, 'w') as f:
                                json.dump(enriched.to_dict(), f, indent=2)
                            refreshed_count += 1
                
                except Exception as e:
                    logger.error(f"Error refreshing product {product_id}: {str(e)}")
        
        else:
            # Refresh all products
            product_files = [f for f in os.listdir(self.product_cache_dir) if f.endswith('.json')]
            for product_file in product_files:
                product_id = os.path.splitext(product_file)[0]
                refreshed_count += self.refresh_product_data(product_id)
        
        return refreshed_count
    
    def clear_expired_cache(self, expiry_hours=None):
        """
        Clear expired cache entries.
        
        Args:
            expiry_hours (int, optional): Override default expiry time
            
        Returns:
            int: Number of cache entries cleared
        """
        cleared_count = 0
        
        # Clear expired metadata
        metadata_files = [f for f in os.listdir(self.metadata_cache_dir) if f.endswith('_metadata.json')]
        for metadata_file in metadata_files:
            full_path = os.path.join(self.metadata_cache_dir, metadata_file)
            metadata = self._load_metadata(full_path)
            
            if metadata:
                # Determine expiry time
                if expiry_hours is not None:
                    cache_expiry = expiry_hours
                elif 'cache_expiry' in metadata and metadata['cache_expiry'] in self.CACHE_EXPIRY:
                    cache_expiry = self.CACHE_EXPIRY[metadata['cache_expiry']]
                else:
                    cache_expiry = self.CACHE_EXPIRY['medium']
                
                # Check if expired
                if self._is_cache_expired(metadata, cache_expiry):
                    try:
                        os.remove(full_path)
                        cleared_count += 1
                    except Exception as e:
                        logger.error(f"Error removing metadata file {metadata_file}: {str(e)}")
        
        return cleared_count
    
    def _get_cache_key(self, query):
        """
        Get cache key for a query.
        
        Args:
            query (str): Search query
            
        Returns:
            str: Cache key
        """
        # Sanitize query for filename
        sanitized_query = "".join(c if c.isalnum() else "_" for c in query)
        sanitized_query = sanitized_query.lower()
        
        # Truncate if too long
        if len(sanitized_query) > 50:
            sanitized_query = sanitized_query[:50]
        
        return sanitized_query
    
    def _hash_url(self, url):
        """
        Create a hash of a URL for use as a unique identifier.
        
        Args:
            url (str): URL to hash
            
        Returns:
            str: Hash of the URL
        """
        if not url:
            return "unknown"
        
        # Create MD5 hash of URL
        hash_obj = hashlib.md5(url.encode())
        return hash_obj.hexdigest()
    
    def _load_metadata(self, metadata_file):
        """
        Load metadata from file.
        
        Args:
            metadata_file (str): Path to metadata file
            
        Returns:
            dict: Metadata or None if file doesn't exist or is invalid
        """
        if not os.path.exists(metadata_file):
            return None
        
        try:
            with open(metadata_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Error loading metadata from {metadata_file}: {str(e)}")
            return None
    
    def _save_metadata(self, metadata_file, metadata):
        """
        Save metadata to file.
        
        Args:
            metadata_file (str): Path to metadata file
            metadata (dict): Metadata to save
        """
        try:
            with open(metadata_file, 'w') as f:
                json.dump(metadata, f, indent=2)
        except Exception as e:
            logger.warning(f"Error saving metadata to {metadata_file}: {str(e)}")
    
    def _is_cache_expired(self, metadata, expiry_hours):
        """
        Check if cache is expired.
        
        Args:
            metadata (dict): Metadata containing timestamp
            expiry_hours (int): Hours after which cache expires
            
        Returns:
            bool: True if cache is expired, False otherwise
        """
        if 'timestamp' not in metadata:
            return True
        
        try:
            timestamp = datetime.fromisoformat(metadata['timestamp'])
            expiry_time = timestamp + timedelta(hours=expiry_hours)
            return datetime.now() > expiry_time
        except Exception:
            return True
    
    def _get_cached_products(self, product_ids, refresh_data=False):
        """
        Get products from cache by their IDs.
        
        Args:
            product_ids (list): List of product IDs
            refresh_data (bool): Whether to refresh product data
            
        Returns:
            list: List of product dictionaries or None if any product is missing
        """
        products = []
        
        for product_id in product_ids:
            product_file = os.path.join(self.product_cache_dir, f"{product_id}.json")
            
            if refresh_data:
                # Attempt to refresh the product data
                self.refresh_product_data(product_id)
            
            if not os.path.exists(product_file):
                logger.warning(f"Product file not found: {product_file}")
                continue
            
            try:
                with open(product_file, 'r') as f:
                    product_data = json.load(f)
                products.append(product_data)
            except Exception as e:
                logger.warning(f"Error loading product data from {product_file}: {str(e)}")
        
        return products if len(products) == len(product_ids) else products 