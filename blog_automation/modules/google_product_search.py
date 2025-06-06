import requests
import logging
from typing import List, Dict, Optional
from urllib.parse import urlencode, urlparse, parse_qs
import re

logger = logging.getLogger(__name__)

class GoogleCustomSearch:
    """Google Custom Search API for finding Amazon products"""
    
    def __init__(self, api_key: str, search_engine_id: str):
        self.api_key = api_key
        self.cx = search_engine_id
        self.base_url = "https://www.googleapis.com/customsearch/v1"
        
    def search_amazon_products(self, query: str, num_results: int = 5) -> List[Dict]:
        """
        Search for Amazon products using Google Custom Search
        
        Args:
            query: Search query (e.g., "Swift programming books")
            num_results: Number of results to return
            
        Returns:
            List of product dictionaries with title, url, description, price, etc.
        """
        try:
            # Construct search query to find Amazon products
            search_query = f"{query} site:amazon.com"
            
            params = {
                'key': self.api_key,
                'cx': self.cx,
                'q': search_query,
                'num': min(num_results, 10),  # Max 10 per request
                'safe': 'active'
            }
            
            logger.info(f"Searching Google Custom Search for: {search_query}")
            
            response = requests.get(self.base_url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if 'items' not in data:
                logger.warning(f"No search results found for: {query}")
                return []
            
            products = []
            for item in data['items']:
                product = self._extract_product_info(item)
                if product:
                    products.append(product)
            
            logger.info(f"Found {len(products)} products via Google Custom Search")
            return products
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Google Custom Search API error: {e}")
            return []
        except Exception as e:
            logger.error(f"Error parsing Google Custom Search results: {e}")
            return []
    
    def _extract_product_info(self, item: Dict) -> Optional[Dict]:
        """
        Extract product information from Google search result item
        
        Args:
            item: Google Custom Search result item
            
        Returns:
            Product dictionary or None if not a valid product
        """
        try:
            url = item.get('link', '')
            title = item.get('title', '')
            description = item.get('snippet', '')
            
            # Filter out non-product pages
            if not self._is_amazon_product_url(url):
                return None
            
            # Extract ASIN from Amazon URL
            asin = self._extract_asin(url)
            if not asin:
                return None
            
            # Clean up title (remove Amazon-specific suffixes)
            clean_title = self._clean_amazon_title(title)
            
            # Try to extract price from description
            price = self._extract_price_from_description(description)
            
            # Generate affiliate URL
            affiliate_url = self._generate_affiliate_url(url, asin)
            
            product = {
                'title': clean_title,
                'url': affiliate_url,
                'original_url': url,
                'description': description,
                'asin': asin,
                'price': price,
                'source': 'google_custom_search'
            }
            
            return product
            
        except Exception as e:
            logger.warning(f"Error extracting product info: {e}")
            return None
    
    def _is_amazon_product_url(self, url: str) -> bool:
        """Check if URL is an Amazon product page"""
        if 'amazon.com' not in url:
            return False
        
        # Look for product page patterns
        product_patterns = [
            r'/dp/',
            r'/gp/product/',
            r'/product/',
            r'/ASIN/'
        ]
        
        return any(re.search(pattern, url) for pattern in product_patterns)
    
    def _extract_asin(self, url: str) -> Optional[str]:
        """Extract ASIN from Amazon URL"""
        # Common Amazon ASIN patterns
        patterns = [
            r'/dp/([A-Z0-9]{10})',
            r'/gp/product/([A-Z0-9]{10})',
            r'/ASIN/([A-Z0-9]{10})',
            r'product/([A-Z0-9]{10})'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        
        return None
    
    def _clean_amazon_title(self, title: str) -> str:
        """Clean Amazon title by removing common suffixes"""
        # Remove common Amazon suffixes
        suffixes_to_remove = [
            ' - Amazon.com',
            ' : Amazon.com',
            ' | Amazon.com',
            ' on Amazon',
            ' - Amazon',
            ' : Amazon',
            ' | Amazon'
        ]
        
        clean_title = title
        for suffix in suffixes_to_remove:
            if clean_title.endswith(suffix):
                clean_title = clean_title[:-len(suffix)]
        
        return clean_title.strip()
    
    def _extract_price_from_description(self, description: str) -> Optional[str]:
        """Try to extract price from search result description"""
        # Look for price patterns in description
        price_patterns = [
            r'\$[\d,]+\.?\d*',
            r'USD\s*[\d,]+\.?\d*',
            r'Price:\s*\$[\d,]+\.?\d*'
        ]
        
        for pattern in price_patterns:
            match = re.search(pattern, description)
            if match:
                return match.group(0)
        
        return None
    
    def _generate_affiliate_url(self, original_url: str, asin: str) -> str:
        """Generate Amazon affiliate URL with associate tag"""
        # Parse the original URL
        parsed = urlparse(original_url)
        
        # Build clean Amazon URL with affiliate tag
        # This should use your Amazon Associate tag from config
        affiliate_tag = "sulemanjicoc-20"  # This will come from config
        
        # Create clean Amazon URL
        base_url = f"https://amazon.com/dp/{asin}"
        affiliate_url = f"{base_url}?tag={affiliate_tag}"
        
        return affiliate_url

    def get_search_quota_info(self) -> Dict:
        """Get information about API quota usage"""
        # This would require additional API calls to check quota
        # For now, return basic info
        return {
            'daily_limit': 100,  # Free tier limit
            'note': 'Monitor usage to avoid exceeding free tier'
        } 