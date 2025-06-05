"""
Product Research Module

Researches Amazon products for affiliate integration using web scraping
with comprehensive error handling and rate limiting.
"""

import asyncio
import logging
import re
from typing import List, Optional, Dict, Any
import aiohttp
from bs4 import BeautifulSoup
from ..models import Product, TrendingTopic
from ..config import Config

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
            
            # Extract title
            title_elem = container.find('h2', class_='a-size-mini')
            if not title_elem:
                title_elem = container.find('span', class_='a-size-medium')
            
            title = title_elem.get_text(strip=True) if title_elem else "Unknown Product"
            
            # Extract price
            price_elem = container.find('span', class_='a-price-whole')
            price = None
            if price_elem:
                price_text = price_elem.get_text(strip=True)
                price = f"${price_text}"
            
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
            product.affiliate_link = f"https://www.amazon.com/dp/{product.asin}?tag={Config.AMAZON_STORE_ID}&linkCode=ogi&th=1&psc=1"
        
        return products[:max_products]