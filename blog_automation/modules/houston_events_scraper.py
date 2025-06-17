"""
Houston Events Scraper Module

Scrapes Houston events from multiple sources using Selenium WebDriver
to handle JavaScript-heavy sites and dynamic content loading.
"""

import asyncio
import logging
import time
import random
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service
from bs4 import BeautifulSoup
import re
from dateutil import parser as date_parser

from ..models import HoustonEvent, EventTrendingTopic
from ..config import config

logger = logging.getLogger(__name__)


class HoustonEventsScraper:
    """Scrapes Houston events from multiple sources using Selenium."""
    
    def __init__(self):
        """Initialize the Houston events scraper with Selenium configuration."""
        self.driver = None
        self.wait_timeout = 30
        self.sources = config.get('houston_events.sources', [])
        self.headless = config.get('houston_events.selenium_headless', True)
        self.categories = config.get('houston_events.categories', [])
        logger.info("Houston Events Scraper initialized")
    
    def _setup_driver(self) -> webdriver.Chrome:
        """Setup Chrome WebDriver with appropriate options."""
        try:
            chrome_options = Options()
            
            if self.headless:
                chrome_options.add_argument("--headless=new")  # Use new headless mode
            
            # Anti-detection measures
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--window-size=1920,1080")
            chrome_options.add_argument("--disable-blink-features=AutomationControlled")
            chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
            chrome_options.add_experimental_option('useAutomationExtension', False)
            
            # More realistic user agent
            chrome_options.add_argument("--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            
            # Install ChromeDriver automatically
            service = Service(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service, options=chrome_options)
            
            # Execute script to hide automation indicators
            driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            
            logger.info("Chrome WebDriver initialized successfully")
            return driver
            
        except Exception as e:
            logger.error(f"Failed to setup Chrome WebDriver: {e}")
            raise
    
    async def scrape_houston_events(self, max_events: int = 20) -> List[HoustonEvent]:
        """
        Scrape Houston events from all configured sources.
        
        Args:
            max_events: Maximum number of events to return
            
        Returns:
            List of Houston events
        """
        logger.info(f"Starting Houston events scraping for {len(self.sources)} sources")
        
        all_events = []
        
        try:
            self.driver = self._setup_driver()
            
            for source_url in self.sources:
                try:
                    if 'visithoustontexas.com' in source_url:
                        events = await self.scrape_visit_houston()
                    elif 'houcalendar.com' in source_url:
                        events = await self.scrape_hou_calendar()
                    else:
                        logger.warning(f"Unknown source URL: {source_url}")
                        continue
                    
                    all_events.extend(events)
                    logger.info(f"Scraped {len(events)} events from {source_url}")
                    
                    # Rate limiting between sources
                    await asyncio.sleep(2)
                    
                except Exception as e:
                    logger.error(f"Error scraping {source_url}: {e}")
                    continue
            
            # Remove duplicates and score events
            unique_events = self._remove_duplicates(all_events)
            scored_events = [event for event in unique_events if self._calculate_event_score(event) >= config.get('houston_events.min_event_score', 0.4)]
            
            # Sort by score and limit results
            scored_events.sort(key=lambda e: self._calculate_event_score(e), reverse=True)
            final_events = scored_events[:max_events]
            
            logger.info(f"Scraped {len(final_events)} unique Houston events")
            return final_events
            
        except Exception as e:
            logger.error(f"Error in Houston events scraping: {e}")
            return []
        
        finally:
            if self.driver:
                self.driver.quit()
                logger.info("WebDriver closed")
    
    async def scrape_visit_houston(self) -> List[HoustonEvent]:
        """Scrape events from visithoustontexas.com"""
        events = []
        
        try:
            url = "https://www.visithoustontexas.com/events/events-this-weekend/"
            logger.info(f"Scraping Visit Houston: {url}")
            
            self.driver.get(url)
            
            # Add random delay to simulate human behavior
            await asyncio.sleep(random.uniform(2, 5))
            
            # Wait for dynamic content to load
            wait = WebDriverWait(self.driver, self.wait_timeout)
            
            # Look for event containers with multiple fallback selectors
            event_found = False
            selectors_to_try = [
                "[data-testid='event-card']",
                ".event-item",
                ".event-listing", 
                ".event-card",
                ".card",
                "[class*='event']",
                "[class*='Event']",
                ".listing",
                ".item"
            ]
            
            for selector in selectors_to_try:
                try:
                    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, selector)))
                    event_found = True
                    logger.info(f"Found elements with selector: {selector}")
                    break
                except TimeoutException:
                    continue
            
            if not event_found:
                logger.warning("Timeout waiting for event elements on Visit Houston - trying page source parsing")
                # Continue anyway and try to parse what we can from the page source
            
            # Get page source and parse with BeautifulSoup for easier extraction
            soup = BeautifulSoup(self.driver.page_source, 'html.parser')
            
            # Extract events from common selectors with more comprehensive list
            event_selectors = [
                "[data-testid='event-card']",
                ".event-item",
                ".event-listing",
                ".event-card",
                ".card",
                "[class*='event']",
                "[class*='Event']",
                ".listing",
                ".item",
                "article",
                ".post",
                ".entry"
            ]
            
            event_elements = []
            for selector in event_selectors:
                elements = soup.select(selector)
                if elements and len(elements) > 1:  # Need more than 1 to avoid header/footer elements
                    event_elements = elements
                    logger.info(f"Found {len(event_elements)} events using selector: {selector}")
                    break
            
            # If no events found with specific selectors, try to find any content with event-related keywords
            if not event_elements:
                logger.info("No events found with standard selectors, trying keyword-based search")
                all_elements = soup.find_all(['div', 'article', 'section'], string=re.compile(r'event|concert|festival|show', re.I))
                if all_elements:
                    event_elements = all_elements[:10]  # Limit to 10
                    logger.info(f"Found {len(event_elements)} potential events using keyword search")
            
            for element in event_elements[:10]:  # Limit to first 10 events
                try:
                    event = self.parse_event_data(element, 'visit_houston')
                    if event:
                        events.append(event)
                except Exception as e:
                    logger.warning(f"Error parsing event element: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"Error scraping Visit Houston: {e}")
        
        return events
    
    async def scrape_hou_calendar(self) -> List[HoustonEvent]:
        """Scrape events from houcalendar.com"""
        events = []
        
        try:
            url = "https://www.houcalendar.com/"
            logger.info(f"Scraping HouCalendar: {url}")
            
            self.driver.get(url)
            
            # Add random delay to simulate human behavior
            await asyncio.sleep(random.uniform(1, 3))
            
            # Wait for dynamic content to load
            wait = WebDriverWait(self.driver, self.wait_timeout)
            
            try:
                wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".event, .event-item, [class*='event']")))
            except TimeoutException:
                logger.warning("Timeout waiting for event elements on HouCalendar")
                return events
            
            soup = BeautifulSoup(self.driver.page_source, 'html.parser')
            
            # Extract events
            event_selectors = [
                ".event",
                ".event-item",
                "[class*='event']",
                ".listing"
            ]
            
            for selector in event_selectors:
                event_elements = soup.select(selector)
                if event_elements:
                    logger.info(f"Found {len(event_elements)} events using selector: {selector}")
                    break
            
            for element in event_elements[:10]:  # Limit to first 10 events
                try:
                    event = self.parse_event_data(element, 'hou_calendar')
                    if event:
                        events.append(event)
                except Exception as e:
                    logger.warning(f"Error parsing event element: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"Error scraping HouCalendar: {e}")
        
        return events
    
    def parse_event_data(self, element, source: str) -> Optional[HoustonEvent]:
        """Extract structured event information from HTML element."""
        try:
            # Extract title
            title_selectors = ['h1', 'h2', 'h3', '.title', '.event-title', '.name', '[class*="title"]', '[class*="name"]']
            title = None
            for selector in title_selectors:
                title_element = element.select_one(selector)
                if title_element:
                    title = title_element.get_text().strip()
                    break
            
            if not title:
                return None
            
            # Extract description
            desc_selectors = ['.description', '.summary', '.excerpt', 'p', '.content', '[class*="desc"]']
            description = ""
            for selector in desc_selectors:
                desc_element = element.select_one(selector)
                if desc_element:
                    description = desc_element.get_text().strip()
                    break
            
            # Extract date/time information
            date_selectors = ['.date', '.datetime', '.when', '[class*="date"]', '[class*="time"]', 'time']
            date_str = None
            for selector in date_selectors:
                date_element = element.select_one(selector)
                if date_element:
                    date_str = date_element.get_text().strip()
                    break
            
            # Parse date
            event_date = self._parse_date(date_str) if date_str else datetime.now() + timedelta(days=1)
            
            # Extract venue
            venue_selectors = ['.venue', '.location', '.where', '[class*="venue"]', '[class*="location"]']
            venue = None
            for selector in venue_selectors:
                venue_element = element.select_one(selector)
                if venue_element:
                    venue = venue_element.get_text().strip()
                    break
            
            # Extract URL
            url = None
            link_element = element.select_one('a')
            if link_element and link_element.get('href'):
                url = link_element['href']
                if url.startswith('/'):
                    base_url = "https://www.visithoustontexas.com" if source == 'visit_houston' else "https://www.houcalendar.com"
                    url = base_url + url
            
            # Extract image
            image_url = None
            img_element = element.select_one('img')
            if img_element and img_element.get('src'):
                image_url = img_element['src']
                if image_url.startswith('/'):
                    base_url = "https://www.visithoustontexas.com" if source == 'visit_houston' else "https://www.houcalendar.com"
                    image_url = base_url + image_url
            
            # Determine category
            category = self._determine_category(title, description)
            
            event = HoustonEvent(
                title=title,
                description=description[:500],  # Limit description length
                date=event_date,
                venue=venue,
                category=category,
                url=url,
                image_url=image_url
            )
            
            return event
            
        except Exception as e:
            logger.error(f"Error parsing event data: {e}")
            return None
    
    def _parse_date(self, date_str: str) -> datetime:
        """Parse date string into datetime object."""
        try:
            # Clean up the date string
            date_str = re.sub(r'\s+', ' ', date_str.strip())
            
            # Try to parse with dateutil
            parsed_date = date_parser.parse(date_str, fuzzy=True)
            
            # If parsed date is in the past, assume it's for next occurrence
            if parsed_date < datetime.now():
                if parsed_date.year == datetime.now().year:
                    parsed_date = parsed_date.replace(year=datetime.now().year + 1)
            
            return parsed_date
            
        except Exception as e:
            logger.warning(f"Error parsing date '{date_str}': {e}")
            return datetime.now() + timedelta(days=1)
    
    def _determine_category(self, title: str, description: str) -> str:
        """Determine event category based on title and description."""
        text = (title + " " + description).lower()
        
        category_keywords = {
            'concerts': ['concert', 'music', 'band', 'singer', 'performance', 'live music'],
            'festivals': ['festival', 'fest', 'celebration', 'fair'],
            'theatre': ['theatre', 'theater', 'play', 'musical', 'drama', 'show'],
            'family': ['family', 'kids', 'children', 'child-friendly'],
            'food': ['food', 'restaurant', 'dining', 'culinary', 'chef', 'cooking'],
            'sports': ['sports', 'game', 'match', 'tournament', 'race', 'athletic']
        }
        
        for category, keywords in category_keywords.items():
            if any(keyword in text for keyword in keywords):
                return category
        
        return 'general'
    
    def _calculate_event_score(self, event: HoustonEvent) -> float:
        """Calculate a score for the event based on various factors."""
        score = 0.5  # Base score
        
        # Date proximity (events happening sooner get higher scores)
        days_until_event = (event.date - datetime.now()).days
        if days_until_event <= 7:
            score += 0.3
        elif days_until_event <= 14:
            score += 0.2
        elif days_until_event <= 30:
            score += 0.1
        
        # Category preference
        preferred_categories = ['concerts', 'festivals', 'theatre']
        if event.category in preferred_categories:
            score += 0.2
        
        # Has venue information
        if event.venue:
            score += 0.1
        
        # Has URL for more information
        if event.url:
            score += 0.1
        
        # Title quality (longer, more descriptive titles get slight boost)
        if len(event.title) > 30:
            score += 0.05
        
        return min(score, 1.0)  # Cap at 1.0
    
    def _remove_duplicates(self, events: List[HoustonEvent]) -> List[HoustonEvent]:
        """Remove duplicate events based on title and date similarity."""
        unique_events = []
        
        for event in events:
            is_duplicate = False
            
            for existing_event in unique_events:
                # Check if title is very similar and date is within 1 day
                title_similarity = self._calculate_similarity(event.title, existing_event.title)
                date_diff = abs((event.date - existing_event.date).days)
                
                if title_similarity > 0.8 and date_diff <= 1:
                    is_duplicate = True
                    break
            
            if not is_duplicate:
                unique_events.append(event)
        
        return unique_events
    
    def _calculate_similarity(self, str1: str, str2: str) -> float:
        """Calculate similarity between two strings using simple approach."""
        str1 = str1.lower().strip()
        str2 = str2.lower().strip()
        
        if str1 == str2:
            return 1.0
        
        # Simple similarity based on common words
        words1 = set(str1.split())
        words2 = set(str2.split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union)
    
    def normalize_event_data(self, events: List[HoustonEvent]) -> List[EventTrendingTopic]:
        """Convert Houston events to EventTrendingTopic format."""
        trending_topics = []
        
        for event in events:
            # Create trending topic from event
            topic = EventTrendingTopic(
                keyword=event.title,
                trend_score=self._calculate_event_score(event),
                search_volume=100,  # Placeholder value
                related_terms=[event.category] if event.category else [],
                timestamp=datetime.now(),
                source="houston_events",
                source_url=event.url,
                event_data=event
            )
            
            trending_topics.append(topic)
        
        return trending_topics 