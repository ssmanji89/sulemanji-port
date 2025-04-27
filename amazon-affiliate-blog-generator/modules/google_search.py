"""
Google Product Search Module

This module provides functionality to search for Amazon products using Google Search.
It extracts product details from Amazon URLs found in Google search results.
"""

import logging
import random
import re
import time
from urllib.parse import urlparse, parse_qs
import json
import os
from typing import List, Dict, Any, Optional, Union

import requests
from bs4 import BeautifulSoup
from requests.exceptions import RequestException

logger = logging.getLogger(__name__)

class GoogleProductSearch:
    """
    A class for searching Amazon products via Google search.
    
    This class searches for Amazon products using Google Search and parses the results
    to extract product information and transform Amazon links to include affiliate tags.
    """
    
    # User agent list for rotation to avoid detection
    USER_AGENTS = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1"
    ]
    
    # Google search URL
    GOOGLE_SEARCH_URL = "https://www.google.com/search"
    
    # Product attributes to extract
    PRODUCT_ATTRIBUTES = [
        'title',
        'description',
        'price',
        'currency',
        'brand',
        'rating',
        'review_count',
        'availability',
        'image_url'
    ]
    
    def __init__(self, affiliate_tag="exampletag-20", max_results=5, delay_range=(1, 3), max_retries=3, cache_dir="data/cache/search"):
        """
        Initialize GoogleProductSearch.
        
        Args:
            affiliate_tag (str): Amazon affiliate tag to use in links
            max_results (int): Maximum number of results to return
            delay_range (tuple): Range of seconds to delay between requests (min, max)
            max_retries (int): Maximum number of retry attempts for failed requests
            cache_dir (str): Directory to cache search results
        """
        self.affiliate_tag = affiliate_tag
        self.max_results = max_results
        self.delay_range = delay_range
        self.max_retries = max_retries
        self.cache_dir = cache_dir
        
        # Create cache directory if it doesn't exist
        os.makedirs(cache_dir, exist_ok=True)
        
        logger.info(f"Initialized GoogleProductSearch with affiliate tag: {affiliate_tag}")
    
    def search_amazon_products(self, query, use_cache=True, cache_expiry_hours=24):
        """
        Search for Amazon products using Google.
        
        Args:
            query (str): Search query
            use_cache (bool): Whether to use cached results if available
            cache_expiry_hours (int): Number of hours after which cache expires
            
        Returns:
            list: List of product dictionaries
        """
        # Format query for cache filename
        cache_key = self._format_cache_key(query)
        cache_file = os.path.join(self.cache_dir, f"{cache_key}.json")
        
        # Check cache first if enabled
        if use_cache:
            cached_results = self._get_from_cache(cache_file, cache_expiry_hours)
            if cached_results:
                logger.info(f"Using cached results for query: {query}")
                return cached_results
        
        # Append "amazon" to query if not already included
        if "amazon" not in query.lower():
            search_query = f"{query} amazon"
        else:
            search_query = query
            
        logger.info(f"Searching for Amazon products with query: {search_query}")
        
        # Perform search and get Amazon URLs
        amazon_urls = self._google_search(search_query)
        
        # Extract product information from URLs
        products = []
        for url in amazon_urls[:self.max_results]:
            try:
                # Add affiliate tag to URL
                affiliate_url = self._add_affiliate_tag(url)
                
                # Extract product information
                product_info = self._extract_product_info(url, affiliate_url)
                
                if product_info:
                    products.append(product_info)
                    
                # Random delay between requests
                delay = random.uniform(*self.delay_range)
                time.sleep(delay)
                
            except Exception as e:
                logger.warning(f"Error processing URL {url}: {str(e)}")
        
        # Cache the results
        if products:
            self._save_to_cache(cache_file, products)
                
        logger.info(f"Found {len(products)} Amazon products")
        return products
    
    def _google_search(self, query):
        """
        Perform a Google search and extract Amazon product URLs.
        
        Args:
            query (str): Search query
            
        Returns:
            list: List of Amazon product URLs
        """
        # Parameters for Google search
        params = {
            "q": query,
            "num": min(30, self.max_results * 3)  # Request more results than needed
        }
        
        # Try multiple times with exponential backoff
        retry_count = 0
        amazon_urls = []
        
        while retry_count < self.max_retries and not amazon_urls:
            try:
                # Random user agent
                headers = {
                    "User-Agent": random.choice(self.USER_AGENTS),
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                    "Referer": "https://www.google.com/",
                    "DNT": "1"
                }
                
                # Make request to Google
                response = requests.get(
                    self.GOOGLE_SEARCH_URL, 
                    params=params, 
                    headers=headers,
                    timeout=10 + (5 * retry_count)  # Increase timeout with each retry
                )
                response.raise_for_status()
                
                # Parse response
                soup = BeautifulSoup(response.text, "html.parser")
                
                # Extract all links
                amazon_urls = self._extract_amazon_urls_from_soup(soup)
                
                if not amazon_urls:
                    logger.warning(f"No Amazon URLs found on retry {retry_count + 1}")
                    
            except RequestException as e:
                logger.warning(f"Request error on retry {retry_count + 1}: {str(e)}")
                
            except Exception as e:
                logger.error(f"Error during Google search on retry {retry_count + 1}: {str(e)}")
            
            # If no results and not final retry, wait before retrying
            if not amazon_urls and retry_count < self.max_retries - 1:
                # Exponential backoff
                wait_time = 2 ** retry_count
                logger.info(f"Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
            
            retry_count += 1
            
        logger.info(f"Found {len(amazon_urls)} Amazon URLs from Google search")
        return amazon_urls
    
    def _extract_amazon_urls_from_soup(self, soup):
        """
        Extract Amazon product URLs from BeautifulSoup object.
        
        Args:
            soup (BeautifulSoup): BeautifulSoup object of Google search results
            
        Returns:
            list: List of Amazon product URLs
        """
        amazon_urls = []
        
        # Method 1: Extract from regular search results
        links = soup.find_all("a")
        for link in links:
            href = link.get("href", "")
            
            # Extract URL from Google redirect
            if href.startswith("/url?") and "amazon" in href:
                # Parse the URL and extract the 'q' parameter which contains the actual URL
                parsed_url = urlparse(href)
                actual_url = parse_qs(parsed_url.query).get('q', [''])[0]
                
                if actual_url and self._is_amazon_product_url(actual_url):
                    amazon_urls.append(actual_url)
        
        # Method 2: Look for specific shopping results
        shopping_elements = soup.select("div.sh-dgr__content a")
        for element in shopping_elements:
            href = element.get("href", "")
            if "amazon" in href:
                if href.startswith("/url?"):
                    parsed_url = urlparse(href)
                    actual_url = parse_qs(parsed_url.query).get('q', [''])[0]
                    if actual_url and self._is_amazon_product_url(actual_url):
                        amazon_urls.append(actual_url)
                elif href.startswith("https://"):
                    if self._is_amazon_product_url(href):
                        amazon_urls.append(href)
        
        # Remove duplicates while preserving order
        seen = set()
        unique_urls = []
        for url in amazon_urls:
            if url not in seen:
                seen.add(url)
                unique_urls.append(url)
        
        return unique_urls
    
    def _extract_product_info(self, url, affiliate_url):
        """
        Extract product information from an Amazon URL.
        
        Args:
            url (str): Original Amazon URL
            affiliate_url (str): URL with affiliate tag
            
        Returns:
            dict: Product information or None if extraction failed
        """
        # Extract ASIN from URL
        asin = self._extract_asin(url)
        if not asin:
            logger.warning(f"Could not extract ASIN from URL: {url}")
            return None
        
        # Parse title from URL
        title = self._parse_title_from_url(url)
        
        # Build basic product info
        product_info = {
            "title": title,
            "url": affiliate_url,
            "asin": asin,
            # Add placeholder values that would normally be scraped from the product page
            "price": None,
            "currency": "USD",
            "rating": None,
            "review_count": None,
            "brand": None,
            "description": f"Amazon product with ASIN {asin}",
            "availability": None,
            "image_url": None,
            "features": []
        }
        
        # Try to extract more information from the URL structure
        self._extract_info_from_url_structure(url, product_info)
        
        return product_info
    
    def _extract_info_from_url_structure(self, url, product_info):
        """
        Extract additional product information from URL structure.
        
        Args:
            url (str): Amazon product URL
            product_info (dict): Product information to update
        """
        # Parse URL
        parsed_url = urlparse(url)
        path = parsed_url.path
        query = parse_qs(parsed_url.query)
        
        # Extract category from URL path
        path_parts = path.strip('/').split('/')
        if len(path_parts) > 1:
            # Amazon URLs often have category information in the path
            if path_parts[0] == 's':
                # Search page - category is the search term
                category = path_parts[1].replace('-', ' ').title()
                product_info['category'] = category
            elif len(path_parts) > 2 and path_parts[0] == 'dp':
                # Detail page - sometimes the category is in the path
                product_info['category'] = path_parts[1].replace('-', ' ').title()
        
        # Extract price from URL query parameters
        if 'price' in query:
            price_str = query['price'][0]
            match = re.search(r'\d+(?:\.\d{2})?', price_str)
            if match:
                product_info['price'] = match.group(0)
        
        # Extract brand from URL
        brand_match = re.search(r'/([A-Za-z0-9-]+)/[A-Z0-9]{10}', url)
        if brand_match:
            brand = brand_match.group(1).replace('-', ' ').title()
            if len(brand) < 30:  # Reasonably sized brand name
                product_info['brand'] = brand
    
    def _add_affiliate_tag(self, url):
        """
        Add affiliate tag to Amazon URL.
        
        Args:
            url (str): Amazon URL
            
        Returns:
            str: URL with affiliate tag
        """
        # Parse URL
        parsed_url = urlparse(url)
        
        # Check if URL is an Amazon URL
        if "amazon" not in parsed_url.netloc:
            return url
        
        # Get the path and query
        path = parsed_url.path
        query_params = parse_qs(parsed_url.query)
        
        # Remove existing tag if present
        if "tag" in query_params:
            del query_params["tag"]
        
        # Add our affiliate tag
        query_params["tag"] = [self.affiliate_tag]
        
        # Rebuild query string
        query_string = "&".join([f"{k}={v[0]}" for k, v in query_params.items()])
        
        # Rebuild URL
        new_url = f"{parsed_url.scheme}://{parsed_url.netloc}{path}"
        if query_string:
            new_url += f"?{query_string}"
        
        return new_url
    
    def _extract_asin(self, url):
        """
        Extract ASIN from Amazon URL.
        
        Args:
            url (str): Amazon URL
            
        Returns:
            str: ASIN or None if not found
        """
        # ASIN pattern in URL
        asin_pattern = r"/([A-Z0-9]{10})(?:/|\?|$)"
        
        # Search for ASIN
        match = re.search(asin_pattern, url)
        if match:
            return match.group(1)
        
        # Try to extract from URL parameters
        parsed_url = urlparse(url)
        query_params = parse_qs(parsed_url.query)
        
        # Check common parameter names that might contain the ASIN
        for param in ['asin', 'ASIN', 'pd_rd_i', 'pf_rd_p']:
            if param in query_params and len(query_params[param][0]) == 10:
                value = query_params[param][0]
                if re.match(r'^[A-Z0-9]{10}$', value):
                    return value
        
        return None
    
    def _is_amazon_product_url(self, url):
        """
        Check if a URL is an Amazon product URL.
        
        Args:
            url (str): URL to check
            
        Returns:
            bool: True if URL is an Amazon product URL, False otherwise
        """
        # Check if URL is from Amazon
        if not re.search(r'amazon\.(com|co\.uk|ca|de|fr|co\.jp|in)', url):
            return False
        
        # Check if URL is a product page
        if not any(pattern in url for pattern in ['/dp/', '/gp/product/', '/exec/obidos/asin/']):
            # Also check for ASIN pattern
            if not re.search(r'/([A-Z0-9]{10})(?:/|\?|$)', url):
                return False
        
        # Exclude certain Amazon URLs that are not product pages
        excluded_patterns = [
            '/s?k=',
            '/slp/',
            '/stores/',
            '/bestsellers/',
            '/customer-reviews/',
            '/account/',
            '/ap/',
            '/hz/',
            '/help/'
        ]
        
        if any(pattern in url for pattern in excluded_patterns):
            return False
        
        return True
    
    def _parse_title_from_url(self, url):
        """
        Parse product title from Amazon URL.
        
        Args:
            url (str): Amazon URL
            
        Returns:
            str: Product title or empty string if parsing failed
        """
        # Extract from URL path
        parsed_url = urlparse(url)
        path = parsed_url.path
        
        # Remove trailing slash
        if path.endswith('/'):
            path = path[:-1]
        
        # Split path and find the part that might contain the title
        parts = path.split('/')
        if len(parts) > 2:
            # Title is often the last part before the ASIN
            for i, part in enumerate(parts):
                if i < len(parts) - 1 and re.match(r'^[A-Z0-9]{10}$', parts[i+1]):
                    title_part = part
                    # Clean up the title
                    title = title_part.replace('-', ' ').strip()
                    if title and not title.isdigit() and len(title) > 3:
                        return title.title()
        
        # If we can't extract a title from the URL, return a placeholder
        return "Amazon Product"
    
    def _format_cache_key(self, query):
        """
        Format a query for use as a cache key.
        
        Args:
            query (str): Search query
            
        Returns:
            str: Formatted cache key
        """
        # Sanitize query for filename
        sanitized_query = "".join(c if c.isalnum() else "_" for c in query.lower())
        
        # Truncate if too long
        if len(sanitized_query) > 50:
            sanitized_query = sanitized_query[:50]
        
        return sanitized_query
    
    def _get_from_cache(self, cache_file, expiry_hours):
        """
        Get search results from cache if not expired.
        
        Args:
            cache_file (str): Path to cache file
            expiry_hours (int): Number of hours after which cache expires
            
        Returns:
            list: Cached search results or None if cache is expired or invalid
        """
        if not os.path.exists(cache_file):
            return None
        
        try:
            # Get file modification time
            mod_time = os.path.getmtime(cache_file)
            current_time = time.time()
            
            # Check if cache is expired
            if (current_time - mod_time) / 3600 > expiry_hours:
                logger.info(f"Cache expired ({expiry_hours} hours): {cache_file}")
                return None
            
            # Read cache file
            with open(cache_file, 'r') as f:
                cache_data = json.load(f)
            
            logger.info(f"Loaded {len(cache_data)} products from cache: {cache_file}")
            return cache_data
            
        except Exception as e:
            logger.warning(f"Error loading from cache: {str(e)}")
            return None
    
    def _save_to_cache(self, cache_file, products):
        """
        Save search results to cache.
        
        Args:
            cache_file (str): Path to cache file
            products (list): List of product dictionaries
        """
        try:
            with open(cache_file, 'w') as f:
                json.dump(products, f, indent=2)
            
            logger.info(f"Saved {len(products)} products to cache: {cache_file}")
            
        except Exception as e:
            logger.warning(f"Error saving to cache: {str(e)}") 