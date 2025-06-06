"""
Product Research Module

Researches Amazon products for affiliate integration using web scraping
with comprehensive error handling and rate limiting.
"""

import asyncio
import logging
import re
import time
from typing import List, Optional, Dict, Any
import aiohttp
from bs4 import BeautifulSoup
from ..models import Product, TrendingTopic
from ..config import config
import requests
from urllib.parse import urljoin, urlencode
import random
from .google_product_search import GoogleCustomSearch

logger = logging.getLogger(__name__)


class ProductResearcher:
    """Researches Amazon products for affiliate integration."""
    
    def __init__(self):
        """Initialize the product researcher."""
        self.session = None
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        # Initialize Google Custom Search if enabled
        self.google_search = None
        if config.get('google_custom_search.enabled', False):
            api_key = config.get('google_custom_search.api_key')
            search_engine_id = config.get('google_custom_search.search_engine_id')
            
            if api_key and search_engine_id:
                self.google_search = GoogleCustomSearch(api_key, search_engine_id)
                logger.info("Google Custom Search initialized successfully")
            else:
                logger.warning("Google Custom Search enabled but credentials missing")
    
    async def __aenter__(self):
        """Async context manager entry."""
        timeout = aiohttp.ClientTimeout(total=30)
        self.session = aiohttp.ClientSession(
            timeout=timeout,
            headers=self.headers
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self.session:
            await self.session.close()
    
    async def find_relevant_products(self, topic: TrendingTopic, max_products: int = 5) -> List[Product]:
        """
        Find Amazon products relevant to the blog topic.
        
        Args:
            topic: The trending topic to find products for
            max_products: Maximum number of products to return
            
        Returns:
            List of relevant products with affiliate links
        """
        logger.info(f"Searching for products related to: {topic.keyword}")
        
        try:
            # Generate search queries based on the topic
            search_queries = self._generate_search_queries(topic)
            
            all_products = []
            for query in search_queries[:3]:  # Limit to 3 queries to avoid rate limiting
                try:
                    products = await self._search_amazon_products(query)
                    all_products.extend(products)
                    
                    # Rate limiting between searches
                    await asyncio.sleep(2)
                    
                except Exception as e:
                    logger.warning(f"Error searching for query '{query}': {e}")
                    continue
            
            # Remove duplicates and select best products
            unique_products = self._deduplicate_products(all_products)
            selected_products = self._select_best_products(unique_products, max_products)
            
            # If we don't have enough products, add fallback products
            if len(selected_products) < max_products:
                fallback_products = self._get_fallback_products(topic, max_products - len(selected_products))
                selected_products.extend(fallback_products)
            
            logger.info(f"Found {len(selected_products)} relevant products")
            return selected_products[:max_products]
            
        except Exception as e:
            logger.error(f"Error in product research: {e}")
            # Return fallback products if everything fails
            return self._get_fallback_products(topic, max_products)
    
    def _generate_search_queries(self, topic: TrendingTopic) -> List[str]:
        """Generate Amazon search queries based on the topic."""
        queries = []
        
        # Base query from the main keyword
        base_terms = topic.keyword.lower().split()
        
        # Tech product categories that might be relevant
        tech_categories = [
            'books', 'software', 'electronics', 'computers',
            'programming', 'development', 'tools', 'accessories'
        ]
        
        # Generate queries combining topic terms with categories
        for category in tech_categories:
            if any(term in topic.keyword.lower() for term in ['ai', 'machine learning', 'automation']):
                queries.extend([
                    f"{topic.keyword} {category}",
                    f"{category} {topic.keyword}",
                ])
        
        # Add queries from related terms
        for term in topic.related_terms[:3]:  # Limit to avoid too many queries
            queries.append(f"{term} books")
            queries.append(f"{term} tools")
        
        return queries[:5]  # Limit total queries
    
    async def _search_amazon_products(self, query: str) -> List[Product]:
        """Search Amazon for products matching the query."""
        products = []
        
        try:
            # Construct Amazon search URL
            search_url = f"https://www.amazon.com/s?k={query.replace(' ', '+')}&ref=sr_pg_1"
            
            async with self.session.get(search_url) as response:
                if response.status != 200:
                    logger.warning(f"Amazon search returned status {response.status}")
                    return products
                
                html = await response.text()
                soup = BeautifulSoup(html, 'html.parser')
                
                # Find product containers
                product_containers = soup.find_all('div', {'data-component-type': 's-search-result'})
                
                for container in product_containers[:10]:  # Limit to first 10 results
                    try:
                        product = self._extract_product_info(container)
                        if product:
                            products.append(product)
                    except Exception as e:
                        logger.debug(f"Error extracting product info: {e}")
                        continue
                
                logger.info(f"Found {len(products)} products for query: {query}")
                
        except Exception as e:
            logger.error(f"Error searching Amazon for '{query}': {e}")
        
        return products
    
    def _extract_product_info(self, container) -> Optional[Product]:
        """Extract product information from Amazon search result container."""
        try:
            # Extract ASIN
            asin = container.get('data-asin')
            if not asin:
                return None
            
            # Extract title - Updated selectors for current Amazon structure
            title = "Unknown Product"
            
            # Try multiple selectors to find the product title
            title_selectors = [
                'h2 a span',  # Current most common
                'h2 span',    # Alternative h2 span
                '[data-cy="title-recipe-title"]',  # Data attribute selector
                '.a-size-base-plus',  # Size class
                '.a-size-mini',       # Original mini size
                '.a-size-medium',     # Original medium size
                'h2.a-size-mini span',
                'h2.s-size-mini span',
                '.s-title-instructions-style h2 span',
                'h2 .a-link-normal span',
                '[data-component-type="s-search-result"] h2 span'
            ]
            
            for selector in title_selectors:
                title_elem = container.select_one(selector)
                if title_elem:
                    extracted_title = title_elem.get_text(strip=True)
                    if extracted_title and len(extracted_title) > 5:  # Basic validation
                        title = extracted_title
                        break
            
            # If still no title found, try broader search
            if title == "Unknown Product":
                # Look for any span or link within h2 tags
                h2_tags = container.find_all('h2')
                for h2 in h2_tags:
                    spans = h2.find_all('span')
                    for span in spans:
                        text = span.get_text(strip=True)
                        if text and len(text) > 10:  # Reasonable title length
                            title = text
                            break
                    if title != "Unknown Product":
                        break
            
            # Extract price
            price = None
            price_selectors = [
                'span.a-price-whole',      # Whole part
                '.a-price .a-offscreen',   # Complete price in offscreen element
                '.a-price-range',          # Price range
                '.a-color-price'           # Alternative price class
            ]
            
            for selector in price_selectors:
                price_elem = container.select_one(selector)
                if price_elem:
                    price_text = price_elem.get_text(strip=True)
                    # Clean up price text
                    if price_text and ('$' in price_text or price_text.replace('.', '').replace(',', '').isdigit()):
                        if not price_text.startswith('$'):
                            price = f"${price_text}"
                        else:
                            price = price_text
                        break
            
            # If no price found with above selectors, try whole + fraction
            if not price:
                whole_elem = container.select_one('span.a-price-whole')
                fraction_elem = container.select_one('span.a-price-fraction')
                if whole_elem:
                    whole_text = whole_elem.get_text(strip=True)
                    fraction_text = fraction_elem.get_text(strip=True) if fraction_elem else "00"
                    if whole_text and whole_text.replace(',', '').isdigit():
                        price = f"${whole_text}.{fraction_text}"
            
            # Extract rating
            rating_elem = container.find('span', class_='a-icon-alt')
            rating = None
            if rating_elem:
                rating_text = rating_elem.get_text()
                rating_match = re.search(r'(\d+\.?\d*)', rating_text)
                if rating_match:
                    rating = float(rating_match.group(1))
            
            # Extract image URL
            img_elem = container.find('img', class_='s-image')
            image_url = img_elem.get('src') if img_elem else None
            
            # Create product with affiliate link
            product = Product(
                title=title[:100],  # Truncate long titles
                asin=asin,
                price=price,
                rating=rating,
                image_url=image_url
            )
            
            return product
            
        except Exception as e:
            logger.debug(f"Error extracting product info: {e}")
            return None    
    def _deduplicate_products(self, products: List[Product]) -> List[Product]:
        """Remove duplicate products based on ASIN."""
        seen_asins = set()
        unique_products = []
        
        for product in products:
            if product.asin not in seen_asins:
                seen_asins.add(product.asin)
                unique_products.append(product)
        
        return unique_products
    
    def _select_best_products(self, products: List[Product], max_products: int) -> List[Product]:
        """Select the best products based on rating and relevance."""
        # Score products based on available criteria
        scored_products = []
        
        for product in products:
            score = 0.0
            
            # Rating score (0-5 scale)
            if product.rating:
                score += product.rating * 0.4
            
            # Title relevance (simple keyword matching)
            title_lower = product.title.lower()
            tech_keywords = ['programming', 'development', 'ai', 'automation', 'tech', 'computer', 'software']
            keyword_matches = sum(1 for keyword in tech_keywords if keyword in title_lower)
            score += keyword_matches * 0.3
            
            # Prefer products with prices (indicates availability)
            if product.price:
                score += 0.3
            
            scored_products.append((score, product))
        
        # Sort by score and return top products
        scored_products.sort(key=lambda x: x[0], reverse=True)
        return [product for _, product in scored_products[:max_products]]

    def _get_fallback_products(self, topic: TrendingTopic, max_products: int) -> List[Product]:
        """Get fallback products based on the topic."""
        keyword_lower = topic.keyword.lower()
        
        # Define fallback products by category
        fallback_products = {
            'ai_ml': [
                Product(
                    title="Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow",
                    asin="1492032646",
                    price="$59.99",
                    rating=4.6,
                    description="Comprehensive guide to machine learning with practical examples"
                ),
                Product(
                    title="Python Machine Learning: Machine Learning and Deep Learning with Python",
                    asin="1789955750", 
                    price="$49.99",
                    rating=4.4,
                    description="Complete guide to ML implementation in Python"
                ),
                Product(
                    title="AI and Machine Learning for Coders",
                    asin="1492078190",
                    price="$44.99", 
                    rating=4.3,
                    description="Practical AI development for programmers"
                ),
            ],
            'cybersecurity': [
                Product(
                    title="The Web Application Hacker's Handbook",
                    asin="1118026470",
                    price="$54.99",
                    rating=4.5,
                    description="Comprehensive guide to web application security testing"
                ),
                Product(
                    title="Metasploit: The Penetration Tester's Guide",
                    asin="159327288X",
                    price="$49.99",
                    rating=4.4,
                    description="Professional penetration testing with Metasploit"
                ),
                Product(
                    title="Bug Bounty Bootcamp",
                    asin="1718501544",
                    price="$39.99",
                    rating=4.6,
                    description="Learn to find and exploit web vulnerabilities"
                ),
            ],
            'programming': [
                Product(
                    title="Clean Code: A Handbook of Agile Software Craftsmanship",
                    asin="0132350882",
                    price="$42.99",
                    rating=4.7,
                    description="Essential principles for writing maintainable code"
                ),
                Product(
                    title="Design Patterns: Elements of Reusable Object-Oriented Software",
                    asin="0201633612",
                    price="$54.99",
                    rating=4.5,
                    description="Classic guide to software design patterns"
                ),
                Product(
                    title="System Design Interview – An insider's guide",
                    asin="1736049119",
                    price="$35.99",
                    rating=4.6,
                    description="Master system design for technical interviews"
                ),
            ],
            'cloud_devops': [
                Product(
                    title="AWS Certified Solutions Architect Study Guide",
                    asin="1119713080",
                    price="$50.99",
                    rating=4.5,
                    description="Complete preparation for AWS certification"
                ),
                Product(
                    title="Kubernetes in Action",
                    asin="1617293725",
                    price="$59.99",
                    rating=4.6,
                    description="Comprehensive guide to Kubernetes orchestration"
                ),
                Product(
                    title="The DevOps Handbook",
                    asin="1942788002",
                    price="$44.99",
                    rating=4.4,
                    description="Transform your organization with DevOps practices"
                ),
            ],
            'automation': [
                Product(
                    title="Automate the Boring Stuff with Python",
                    asin="1593279922",
                    price="$34.99",
                    rating=4.6,
                    description="Practical programming for total beginners"
                ),
                Product(
                    title="Learning Python, 5th Edition",
                    asin="1449355730",
                    price="$69.99",
                    rating=4.4,
                    description="Comprehensive introduction to Python programming"
                ),
                Product(
                    title="Python Tricks: The Book",
                    asin="1775093301",
                    price="$29.99",
                    rating=4.5,
                    description="Effective Python features and techniques"
                ),
            ]
        }
        
        # Determine category based on topic
        selected_category = 'programming'  # default
        
        if any(term in keyword_lower for term in ['ai', 'artificial intelligence', 'machine learning', 'neural', 'deep learning']):
            selected_category = 'ai_ml'
        elif any(term in keyword_lower for term in ['security', 'cybersecurity', 'hacking', 'vulnerability', 'bug bounty', 'penetration']):
            selected_category = 'cybersecurity'
        elif any(term in keyword_lower for term in ['cloud', 'aws', 'azure', 'kubernetes', 'docker', 'devops']):
            selected_category = 'cloud_devops'
        elif any(term in keyword_lower for term in ['automation', 'automate', 'script', 'workflow']):
            selected_category = 'automation'
            
        # Get products from selected category
        products = fallback_products.get(selected_category, fallback_products['programming'])
        
        # Add affiliate links to all products
        for product in products:
            product.affiliate_link = f"https://www.amazon.com/dp/{product.asin}?tag={config.get('amazon.affiliate_tag', 'sulemanjicoc-20')}&linkCode=ogi&th=1&psc=1"
        
        return products[:max_products]

    def find_relevant_products(self, topic: str, max_products: int = 3) -> List[Dict]:
        """
        Find affiliate products relevant to the blog topic
        
        Args:
            topic: Blog topic/title
            max_products: Maximum number of products to return
            
        Returns:
            List of product dictionaries
        """
        logger.info(f"Searching for products related to: {topic}")
        
        # Generate search queries from the topic
        search_queries = self._generate_search_queries(topic)
        
        all_products = []
        
        # Try Google Custom Search first (if available)
        if self.google_search:
            try:
                for query in search_queries[:2]:  # Limit queries to avoid quota issues
                    products = self.google_search.search_amazon_products(query, num_results=5)
                    all_products.extend(products)
                    
                    if len(all_products) >= max_products:
                        break
                        
                logger.info(f"Google Custom Search found {len(all_products)} products")
                
            except Exception as e:
                logger.error(f"Google Custom Search failed: {e}")
                all_products = []
        
        # Fallback to scraping if Google Custom Search failed or disabled
        if len(all_products) < max_products and config.get('amazon.fallback_to_scraping', True):
            logger.info("Using fallback Amazon scraping method")
            
            for query in search_queries:
                try:
                    scraped_products = self._search_amazon_scraping(query)
                    all_products.extend(scraped_products)
                    
                    if len(all_products) >= max_products:
                        break
                        
                    # Rate limiting for scraping
                    time.sleep(random.uniform(1, 3))
                    
                except Exception as e:
                    logger.warning(f"Scraping failed for query '{query}': {e}")
                    continue
        
        # Remove duplicates and limit results
        unique_products = self._remove_duplicates(all_products)
        final_products = unique_products[:max_products]
        
        logger.info(f"Found {len(final_products)} relevant products")
        return final_products
    
    def _generate_search_queries(self, topic: str) -> List[str]:
        """Generate relevant search queries from the blog topic"""
        # Clean up the topic
        topic_lower = topic.lower()
        
        # Extract key terms
        tech_keywords = [
            'programming', 'coding', 'software', 'development', 'python', 'javascript',
            'java', 'swift', 'react', 'node', 'web', 'mobile', 'app', 'api',
            'database', 'cloud', 'aws', 'azure', 'docker', 'kubernetes',
            'machine learning', 'ai', 'data science', 'analytics', 'automation',
            'cybersecurity', 'security', 'devops', 'agile', 'blockchain'
        ]
        
        found_keywords = [kw for kw in tech_keywords if kw in topic_lower]
        
        # Generate search queries
        queries = []
        
        if found_keywords:
            # Use specific keywords found in topic
            for keyword in found_keywords[:3]:  # Limit to 3 keywords
                queries.extend([
                    f"{keyword} books",
                    f"{keyword} programming books",
                    f"{keyword} development books"
                ])
        else:
            # Generic tech book searches
            queries = [
                "programming books",
                "software development books", 
                "coding books",
                "computer science books"
            ]
        
        # Add topic-based search if it looks searchable
        if len(topic.split()) <= 6:  # Not too long
            queries.insert(0, f"{topic} books")
        
        return queries[:5]  # Limit total queries
    
    def _search_amazon_scraping(self, query: str) -> List[Dict]:
        """Fallback method: Search Amazon using web scraping"""
        try:
            search_url = f"https://www.amazon.com/s"
            params = {
                'k': query,
                'ref': 'sr_nr_n_1',
                'rh': 'n:283155'  # Books category
            }
            
            headers = {
                'User-Agent': random.choice(self.headers['User-Agent'].split(',')),
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            }
            
            url = f"{search_url}?{urlencode(params)}"
            
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            products = []
            product_containers = soup.find_all('div', {'data-component-type': 's-search-result'})
            
            for container in product_containers[:5]:  # Limit to first 5 results
                product = self._extract_product_from_container(container)
                if product:
                    products.append(product)
            
            return products
            
        except Exception as e:
            logger.error(f"Amazon scraping failed for query '{query}': {e}")
            return []
    
    def _extract_product_from_container(self, container) -> Optional[Dict]:
        """Extract product information from Amazon search result container"""
        try:
            # Try multiple selectors for title
            title_selectors = [
                'h2 a span',
                'h2 span',
                '[data-cy="title-recipe-title"]',
                '.a-size-medium.a-spacing-none.a-color-base.a-text-normal',
                '.a-size-base-plus',
                'h2.a-size-mini span'
            ]
            
            title = None
            title_element = None
            
            for selector in title_selectors:
                title_element = container.select_one(selector)
                if title_element:
                    title = title_element.get_text(strip=True)
                    if title and title != "Unknown Product":
                        break
            
            if not title or title == "Unknown Product":
                return None
            
            # Extract URL
            link_element = container.select_one('h2 a')
            if not link_element:
                return None
            
            relative_url = link_element.get('href')
            if not relative_url:
                return None
            
            full_url = urljoin("https://www.amazon.com", relative_url)
            
            # Extract ASIN
            asin_match = re.search(r'/dp/([A-Z0-9]{10})', full_url)
            asin = asin_match.group(1) if asin_match else None
            
            # Generate affiliate URL
            affiliate_url = self._generate_affiliate_url(full_url, asin)
            
            # Try to extract price
            price = self._extract_price(container)
            
            # Extract rating
            rating = self._extract_rating(container)
            
            return {
                'title': title,
                'url': affiliate_url,
                'original_url': full_url,
                'price': price,
                'rating': rating,
                'asin': asin,
                'source': 'amazon_scraping'
            }
            
        except Exception as e:
            logger.warning(f"Error extracting product info: {e}")
            return None
    
    def _extract_price(self, container) -> Optional[str]:
        """Extract price from product container"""
        price_selectors = [
            '.a-price-whole',
            '.a-price .a-offscreen',
            '.a-price-range .a-price .a-offscreen',
            '.a-price-symbol'
        ]
        
        for selector in price_selectors:
            price_element = container.select_one(selector)
            if price_element:
                price_text = price_element.get_text(strip=True)
                if price_text and '$' in price_text:
                    return price_text
        
        return None
    
    def _extract_rating(self, container) -> Optional[str]:
        """Extract rating from product container"""
        rating_selectors = [
            '.a-icon-alt',
            '.a-icon-row .a-icon-alt'
        ]
        
        for selector in rating_selectors:
            rating_element = container.select_one(selector)
            if rating_element:
                rating_text = rating_element.get_text(strip=True)
                if 'out of' in rating_text:
                    return rating_text
        
        return None
    
    def _generate_affiliate_url(self, original_url: str, asin: str) -> str:
        """Generate Amazon affiliate URL"""
        affiliate_tag = config.get('amazon.affiliate_tag', 'sulemanjicoc-20')
        
        if asin:
            # Create clean Amazon URL with affiliate tag
            return f"https://amazon.com/dp/{asin}?tag={affiliate_tag}"
        else:
            # Fallback: add tag to existing URL
            separator = '&' if '?' in original_url else '?'
            return f"{original_url}{separator}tag={affiliate_tag}"
    
    def _remove_duplicates(self, products: List[Dict]) -> List[Dict]:
        """Remove duplicate products based on title similarity"""
        if not products:
            return []
        
        unique_products = []
        seen_titles = set()
        
        for product in products:
            title = product.get('title', '').lower()
            
            # Simple duplicate detection
            is_duplicate = False
            for seen_title in seen_titles:
                if self._titles_similar(title, seen_title):
                    is_duplicate = True
                    break
            
            if not is_duplicate:
                unique_products.append(product)
                seen_titles.add(title)
        
        return unique_products
    
    def _titles_similar(self, title1: str, title2: str, threshold: float = 0.7) -> bool:
        """Check if two titles are similar (simple word overlap)"""
        words1 = set(title1.lower().split())
        words2 = set(title2.lower().split())
        
        if not words1 or not words2:
            return False
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        similarity = len(intersection) / len(union) if union else 0
        return similarity >= threshold