"""
Product Enrichment Module

This module provides functions to extract and enrich product data from Google search results.
It enhances the basic product information with additional details using various extraction techniques.
"""

import logging
import re
import json
import os
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, parse_qs
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional, Union

logger = logging.getLogger(__name__)

@dataclass
class ProductAttribute:
    """Represents a product attribute with name, value, and confidence score."""
    name: str
    value: Any
    confidence: float = 1.0  # confidence score between 0 and 1

@dataclass
class EnrichedProduct:
    """Represents an enriched product with extended attributes."""
    asin: str = ""
    title: str = ""
    url: str = ""
    price: Optional[str] = None
    currency: str = "USD"
    rating: Optional[float] = None
    review_count: Optional[int] = None
    description: str = ""
    brand: str = ""
    features: List[str] = field(default_factory=list)
    images: List[str] = field(default_factory=list)
    availability: str = "Unknown"
    category: str = ""
    attributes: Dict[str, ProductAttribute] = field(default_factory=dict)
    source: str = "google_search"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary, excluding the attributes field."""
        result = asdict(self)
        # Convert attributes dict to a simpler format
        result["attributes"] = {k: v.value for k, v in self.attributes.items()}
        return result
    
    def from_basic_product(self, product: Dict[str, Any]) -> 'EnrichedProduct':
        """Initialize from a basic product dictionary."""
        for key, value in product.items():
            if hasattr(self, key) and value is not None:
                setattr(self, key, value)
        return self

class ProductEnricher:
    """Class for enriching product data from various sources."""
    
    def __init__(self, cache_dir: str = "data/cache/products"):
        """Initialize with cache directory."""
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)
    
    def enrich_product(self, product: Dict[str, Any]) -> EnrichedProduct:
        """
        Enrich a basic product with additional information.
        
        Args:
            product: Basic product dictionary with at least url and title
            
        Returns:
            EnrichedProduct: Product with enriched information
        """
        # Create enriched product from basic product
        enriched = EnrichedProduct().from_basic_product(product)
        
        # Check cache first
        cached_data = self._get_from_cache(enriched.asin or enriched.url)
        if cached_data:
            logger.info(f"Using cached data for product: {enriched.title}")
            return cached_data
        
        # Extract ASIN if not already present
        if not enriched.asin:
            enriched.asin = self._extract_asin_from_url(enriched.url)
        
        # Try to enrich from product URL if it's an Amazon URL
        if "amazon" in enriched.url:
            try:
                self._enrich_from_url_structure(enriched)
            except Exception as e:
                logger.warning(f"Error enriching from URL structure: {str(e)}")
        
        # Extract price if not present
        if not enriched.price:
            enriched.price = self._extract_price_from_title(enriched.title)
        
        # Extract brand if not present
        if not enriched.brand:
            enriched.brand = self._extract_brand(enriched.title, enriched.description)
        
        # Extract features from description
        if enriched.description and not enriched.features:
            enriched.features = self._extract_features(enriched.description)
        
        # Save to cache
        self._save_to_cache(enriched)
        
        return enriched
    
    def _extract_asin_from_url(self, url: str) -> str:
        """Extract ASIN from Amazon URL."""
        # ASIN pattern in URL
        asin_pattern = r"/([A-Z0-9]{10})(?:/|\?|$)"
        
        # Search for ASIN
        match = re.search(asin_pattern, url)
        if match:
            return match.group(1)
        
        # Try to extract from URL parameters
        parsed_url = urlparse(url)
        query_params = parse_qs(parsed_url.query)
        
        # Check common parameter names for ASIN
        for param in ['asin', 'ASIN', 'productId', 'product_id']:
            if param in query_params and len(query_params[param][0]) == 10:
                return query_params[param][0]
        
        return ""
    
    def _enrich_from_url_structure(self, product: EnrichedProduct) -> None:
        """Extract additional information from Amazon URL structure."""
        url = product.url
        parsed_url = urlparse(url)
        
        # Extract category from URL path
        path_parts = parsed_url.path.strip('/').split('/')
        if len(path_parts) > 1 and path_parts[0] in ['s', 'dp']:
            if path_parts[0] == 's':
                product.category = path_parts[1].replace('-', ' ').title()
    
    def _extract_price_from_title(self, title: str) -> Optional[str]:
        """Extract price from product title."""
        # Common price patterns
        price_patterns = [
            r'\$\d+(?:\.\d{2})?',  # $XX.XX
            r'\d+\.\d{2} dollars',  # XX.XX dollars
            r'\d+\.\d{2} USD',      # XX.XX USD
        ]
        
        for pattern in price_patterns:
            match = re.search(pattern, title)
            if match:
                return match.group(0)
        
        return None
    
    def _extract_brand(self, title: str, description: str) -> str:
        """Extract brand from title or description."""
        # Common brand introduction patterns
        brand_patterns = [
            r'by ([A-Za-z0-9 ]+)',
            r'from ([A-Za-z0-9 ]+)',
            r'([A-Za-z0-9 ]+) brand',
        ]
        
        # Try to find in title first
        for pattern in brand_patterns:
            match = re.search(pattern, title)
            if match:
                return match.group(1).strip()
        
        # Then try in description
        if description:
            for pattern in brand_patterns:
                match = re.search(pattern, description)
                if match:
                    return match.group(1).strip()
        
        # If nothing found, try to extract the first word of the title as it's often the brand
        title_words = title.split()
        if title_words and len(title_words[0]) > 1 and title_words[0].isalpha():
            return title_words[0]
        
        return ""
    
    def _extract_features(self, description: str) -> List[str]:
        """Extract features from product description."""
        features = []
        
        # Split by common feature markers
        markers = ['\n•', '\n-', '\n*', '\n·']
        for marker in markers:
            if marker in description:
                parts = description.split(marker)
                # Skip the first part (usually not a feature)
                for part in parts[1:]:
                    feature = part.strip().split('\n')[0].strip()
                    if feature and len(feature) > 3:
                        features.append(feature)
                
                if features:
                    break
        
        # If no features found with markers, try to extract sentences that might be features
        if not features and len(description) > 10:
            sentences = re.split(r'[.!?]', description)
            for sentence in sentences:
                sentence = sentence.strip()
                # Look for sentences that might describe features
                if (sentence and len(sentence) > 10 and len(sentence) < 100 and
                    any(keyword in sentence.lower() for keyword in 
                       ['feature', 'include', 'with', 'has', 'contain', 'provide'])):
                    features.append(sentence)
        
        return features[:5]  # Limit to 5 features
    
    def _get_from_cache(self, identifier: str) -> Optional[EnrichedProduct]:
        """Get product from cache if available."""
        if not identifier:
            return None
        
        # Sanitize identifier for use as filename
        cache_key = "".join(c if c.isalnum() else "_" for c in identifier)
        cache_file = os.path.join(self.cache_dir, f"{cache_key}.json")
        
        if os.path.exists(cache_file):
            try:
                with open(cache_file, 'r') as f:
                    data = json.load(f)
                
                enriched = EnrichedProduct()
                for key, value in data.items():
                    if hasattr(enriched, key):
                        setattr(enriched, key, value)
                
                return enriched
            except Exception as e:
                logger.warning(f"Error loading cache: {str(e)}")
        
        return None
    
    def _save_to_cache(self, product: EnrichedProduct) -> None:
        """Save enriched product to cache."""
        if not product.asin and not product.url:
            return
        
        # Use ASIN if available, otherwise URL
        identifier = product.asin or product.url
        
        # Sanitize identifier for use as filename
        cache_key = "".join(c if c.isalnum() else "_" for c in identifier)
        cache_file = os.path.join(self.cache_dir, f"{cache_key}.json")
        
        try:
            with open(cache_file, 'w') as f:
                json.dump(product.to_dict(), f, indent=2)
        except Exception as e:
            logger.warning(f"Error saving to cache: {str(e)}")


def extract_product_details_from_html(html_content: str) -> Dict[str, Any]:
    """
    Extract product details from HTML content using BeautifulSoup.
    
    Args:
        html_content: HTML content of a product page
        
    Returns:
        dict: Extracted product details
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    product_details = {}
    
    # Try to extract title
    title_tag = soup.find('h1') or soup.find('h2') or soup.find('title')
    if title_tag:
        product_details['title'] = title_tag.text.strip()
    
    # Try to extract price
    price_patterns = [
        {'tag': 'span', 'attrs': {'class': ['price', 'a-price', 'product-price']}},
        {'tag': 'div', 'attrs': {'class': ['price', 'a-price', 'product-price']}},
        {'tag': 'p', 'attrs': {'class': ['price', 'a-price', 'product-price']}}
    ]
    
    for pattern in price_patterns:
        price_tag = soup.find(pattern['tag'], pattern['attrs'])
        if price_tag:
            price_text = price_tag.text.strip()
            # Clean up the price text
            price_text = re.sub(r'[^\d.,]', '', price_text)
            if price_text:
                product_details['price'] = price_text
                break
    
    # Try to extract description
    description_patterns = [
        {'tag': 'div', 'attrs': {'id': ['description', 'product-description']}},
        {'tag': 'div', 'attrs': {'class': ['description', 'product-description']}},
        {'tag': 'p', 'attrs': {'class': ['description']}}
    ]
    
    for pattern in description_patterns:
        desc_tag = soup.find(pattern['tag'], pattern['attrs'])
        if desc_tag:
            product_details['description'] = desc_tag.text.strip()
            break
    
    # Try to extract brand
    brand_patterns = [
        {'tag': 'a', 'attrs': {'id': ['brand']}},
        {'tag': 'a', 'attrs': {'class': ['brand']}},
        {'tag': 'span', 'attrs': {'class': ['brand']}}
    ]
    
    for pattern in brand_patterns:
        brand_tag = soup.find(pattern['tag'], pattern['attrs'])
        if brand_tag:
            product_details['brand'] = brand_tag.text.strip()
            break
    
    # Try to extract availability
    availability_patterns = [
        {'tag': 'span', 'attrs': {'id': ['availability']}},
        {'tag': 'div', 'attrs': {'id': ['availability']}},
        {'tag': 'span', 'attrs': {'class': ['availability']}}
    ]
    
    for pattern in availability_patterns:
        avail_tag = soup.find(pattern['tag'], pattern['attrs'])
        if avail_tag:
            product_details['availability'] = avail_tag.text.strip()
            break
    
    return product_details


def fetch_and_enrich_product(url: str) -> EnrichedProduct:
    """
    Fetch a product page and extract details to enrich the product data.
    
    Args:
        url: URL of the product page
        
    Returns:
        EnrichedProduct: Enriched product data
    """
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': 'https://www.google.com/',
            'DNT': '1'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Extract product details from HTML
        product_details = extract_product_details_from_html(response.text)
        
        # Add URL to product details
        product_details['url'] = url
        
        # Create enriched product
        enricher = ProductEnricher()
        enriched_product = enricher.enrich_product(product_details)
        
        return enriched_product
    
    except Exception as e:
        logger.error(f"Error fetching and enriching product from {url}: {str(e)}")
        
        # Return a basic product with just the URL
        enriched = EnrichedProduct(url=url)
        if "amazon" in url:
            enriched.asin = ProductEnricher()._extract_asin_from_url(url)
        
        return enriched 