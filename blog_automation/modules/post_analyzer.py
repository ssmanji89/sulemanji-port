"""
Post Analyzer Module

Analyzes existing blog posts to detect duplicates and suggest content freshness
strategies for the Houston events blog automation system.
"""

import os
import logging
import re
from datetime import datetime, timedelta, date
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from fuzzywuzzy import fuzz
import frontmatter

from ..config import config

logger = logging.getLogger(__name__)


class PostAnalyzer:
    """Analyzes existing posts for duplicate detection and content freshness."""
    
    def __init__(self):
        """Initialize the post analyzer."""
        self.posts_dir = Path(config.get('blog.output_dir', '_posts'))
        self.duplicate_check_days = config.get('houston_events.duplicate_check_days', 30)
        logger.info(f"Post analyzer initialized for directory: {self.posts_dir}")
    
    def scan_existing_posts(self) -> List[Dict]:
        """
        Read all existing blog posts and extract metadata.
        
        Returns:
            List of post metadata dictionaries
        """
        posts = []
        
        if not self.posts_dir.exists():
            logger.warning(f"Posts directory does not exist: {self.posts_dir}")
            return posts
        
        for post_file in self.posts_dir.glob("*.md"):
            try:
                post_data = self._extract_post_metadata(post_file)
                if post_data:
                    posts.append(post_data)
            except Exception as e:
                logger.warning(f"Error reading post {post_file}: {e}")
                continue
        
        logger.info(f"Scanned {len(posts)} existing posts")
        return posts
    
    def _extract_post_metadata(self, post_file: Path) -> Optional[Dict]:
        """Extract metadata from a blog post file."""
        try:
            with open(post_file, 'r', encoding='utf-8') as f:
                post = frontmatter.load(f)
            
            # Extract date from filename if not in frontmatter
            filename_date = self._extract_date_from_filename(post_file.name)
            
            metadata = {
                'file_path': str(post_file),
                'title': post.metadata.get('title', ''),
                'content': post.content,
                'category': post.metadata.get('category', ''),
                'tags': post.metadata.get('tags', []),
                'date': post.metadata.get('date', filename_date),
                'excerpt': post.metadata.get('excerpt', ''),
                'keywords': self.extract_event_keywords(post.content, post.metadata.get('title', ''))
            }
            
            return metadata
            
        except Exception as e:
            logger.error(f"Error extracting metadata from {post_file}: {e}")
            return None
    
    def _extract_date_from_filename(self, filename: str) -> Optional[datetime]:
        """Extract date from Jekyll-style filename."""
        try:
            # Pattern: YYYY-MM-DD-title.md
            date_match = re.match(r'(\d{4})-(\d{2})-(\d{2})-', filename)
            if date_match:
                year, month, day = map(int, date_match.groups())
                return datetime(year, month, day)
        except Exception:
            pass
        
        return None
    
    def extract_event_keywords(self, content: str, title: str) -> List[str]:
        """Extract venue names, dates, event types from posts."""
        keywords = []
        text = f"{title} {content}".lower()
        
        # Extract venue patterns
        venue_patterns = [
            r'\b(.*?)\s+(?:venue|theater|theatre|hall|center|arena|stadium|park)\b',
            r'\bat\s+([^.,]+)',
            r'\bdowntown\s+([^.,]+)',
            r'\bmuseum\s+district\s+([^.,]+)'
        ]
        
        for pattern in venue_patterns:
            matches = re.findall(pattern, text)
            keywords.extend([match.strip() for match in matches if len(match.strip()) > 2])
        
        # Extract event type keywords
        event_types = [
            'concert', 'festival', 'show', 'performance', 'theater', 'theatre',
            'music', 'art', 'food', 'family', 'kids', 'sports', 'game'
        ]
        
        for event_type in event_types:
            if event_type in text:
                keywords.append(event_type)
        
        # Extract Houston neighborhoods
        houston_areas = [
            'downtown', 'heights', 'montrose', 'midtown', 'museum district',
            'river oaks', 'galleria', 'memorial', 'sugar land', 'woodlands',
            'katy', 'pearland'
        ]
        
        for area in houston_areas:
            if area in text:
                keywords.append(area)
        
        return list(set(keywords))  # Remove duplicates
    
    def check_duplicate_event(self, event_title: str, event_date: datetime, 
                             venue: str = None, category: str = None) -> Tuple[bool, Optional[Dict], float]:
        """
        Check if an event is a duplicate of existing posts.
        
        Args:
            event_title: Title of the event
            event_date: Date of the event
            venue: Event venue (optional)
            category: Event category (optional)
            
        Returns:
            Tuple of (is_duplicate, matching_post, similarity_score)
        """
        existing_posts = self.scan_existing_posts()
        
        # Filter posts from recent timeframe
        cutoff_date = datetime.now() - timedelta(days=self.duplicate_check_days)
        recent_posts = []
        
        for post in existing_posts:
            post_date = post.get('date')
            if post_date:
                # Convert date to datetime if needed for comparison
                if isinstance(post_date, date) and not isinstance(post_date, datetime):
                    post_date = datetime.combine(post_date, datetime.min.time())
                if post_date > cutoff_date:
                    recent_posts.append(post)
        
        best_match = None
        highest_similarity = 0.0
        
        for post in recent_posts:
            similarity = self._calculate_event_similarity(
                event_title, event_date, venue, category, post
            )
            
            if similarity > highest_similarity:
                highest_similarity = similarity
                best_match = post
        
        # Consider it a duplicate if similarity is above threshold
        is_duplicate = highest_similarity > 0.75
        
        logger.info(f"Duplicate check for '{event_title}': {is_duplicate} (similarity: {highest_similarity:.2f})")
        return is_duplicate, best_match, highest_similarity
    
    def _calculate_event_similarity(self, event_title: str, event_date: datetime,
                                  venue: str, category: str, existing_post: Dict) -> float:
        """Calculate similarity between event and existing post."""
        
        similarity_score = 0.0
        
        # Title similarity (40% weight)
        title_similarity = fuzz.partial_ratio(
            event_title.lower(), 
            existing_post.get('title', '').lower()
        ) / 100.0
        similarity_score += title_similarity * 0.4
        
        # Date proximity (30% weight)
        post_date = existing_post.get('date')
        if post_date and event_date:
            date_diff = abs((event_date - post_date).days)
            if date_diff <= 7:
                date_similarity = 1.0 - (date_diff / 7.0)
            else:
                date_similarity = 0.0
            similarity_score += date_similarity * 0.3
        
        # Venue similarity (20% weight)
        if venue and existing_post.get('keywords'):
            venue_similarity = max([
                fuzz.partial_ratio(venue.lower(), keyword.lower()) / 100.0
                for keyword in existing_post['keywords']
            ], default=0.0)
            similarity_score += venue_similarity * 0.2
        
        # Category similarity (10% weight)
        if category:
            post_category = existing_post.get('category', '').lower()
            post_tags = [tag.lower() for tag in existing_post.get('tags', [])]
            
            category_match = category.lower() in post_category or category.lower() in post_tags
            similarity_score += (1.0 if category_match else 0.0) * 0.1
        
        return min(similarity_score, 1.0)
    
    def calculate_content_freshness(self, venue: str = None, category: str = None) -> float:
        """
        Calculate content freshness score based on recent coverage.
        
        Args:
            venue: Event venue
            category: Event category
            
        Returns:
            Freshness score (0.0 = recently covered, 1.0 = fresh content)
        """
        existing_posts = self.scan_existing_posts()
        
        # Look at posts from last 60 days
        cutoff_date = datetime.now() - timedelta(days=60)
        recent_posts = []
        
        for post in existing_posts:
            post_date = post.get('date')
            if post_date:
                # Convert date to datetime if needed for comparison
                if isinstance(post_date, date) and not isinstance(post_date, datetime):
                    post_date = datetime.combine(post_date, datetime.min.time())
                if post_date > cutoff_date:
                    recent_posts.append(post)
        
        if not recent_posts:
            return 1.0  # Very fresh if no recent posts
        
        venue_mentions = 0
        category_mentions = 0
        
        for post in recent_posts:
            post_keywords = post.get('keywords', [])
            post_category = post.get('category', '').lower()
            post_tags = [tag.lower() for tag in post.get('tags', [])]
            
            # Check venue mentions
            if venue:
                venue_similarity = max([
                    fuzz.partial_ratio(venue.lower(), keyword.lower())
                    for keyword in post_keywords
                ], default=0)
                if venue_similarity > 70:  # 70% similarity threshold
                    venue_mentions += 1
            
            # Check category mentions
            if category:
                if (category.lower() in post_category or 
                    category.lower() in post_tags):
                    category_mentions += 1
        
        # Calculate freshness based on mention frequency
        venue_freshness = max(0.0, 1.0 - (venue_mentions * 0.3))
        category_freshness = max(0.0, 1.0 - (category_mentions * 0.2))
        
        # Return average freshness
        return (venue_freshness + category_freshness) / 2.0
    
    def suggest_content_angle(self, event_title: str, venue: str = None, 
                             category: str = None, existing_posts: List[Dict] = None) -> str:
        """
        Suggest different content angles for similar events.
        
        Args:
            event_title: Title of the event
            venue: Event venue
            category: Event category
            existing_posts: List of existing posts (optional)
            
        Returns:
            Suggested content angle
        """
        if existing_posts is None:
            existing_posts = self.scan_existing_posts()
        
        # Analyze existing coverage patterns
        venue_coverage = 0
        category_coverage = 0
        preview_content = 0
        guide_content = 0
        
        for post in existing_posts[-10:]:  # Look at last 10 posts
            title = post.get('title', '').lower()
            content = post.get('content', '').lower()
            
            if venue and venue.lower() in title:
                venue_coverage += 1
            
            if category and category.lower() in title:
                category_coverage += 1
            
            if any(word in title for word in ['preview', 'upcoming', 'coming']):
                preview_content += 1
            
            if any(word in title for word in ['guide', 'tips', 'everything you need']):
                guide_content += 1
        
        # Suggest angle based on coverage gaps
        if venue_coverage == 0:
            return f"venue_spotlight"
        elif category_coverage < 2:
            return f"category_deep_dive"
        elif preview_content < guide_content:
            return "event_preview"
        elif guide_content < preview_content:
            return "attendee_guide"
        else:
            return "insider_perspective"
    
    def get_content_angle_template(self, angle: str, event_title: str) -> Dict[str, str]:
        """Get content template based on suggested angle."""
        
        templates = {
            "venue_spotlight": {
                "title_prefix": "Spotlight on",
                "focus": "venue history, upcoming events, what makes it special",
                "angle": "venue-focused content"
            },
            "category_deep_dive": {
                "title_prefix": "Houston's Best",
                "focus": "category overview, top venues, upcoming events in category",
                "angle": "category exploration"
            },
            "event_preview": {
                "title_prefix": "Coming Soon:",
                "focus": "what to expect, artist/performer background, ticket info",
                "angle": "anticipation building"
            },
            "attendee_guide": {
                "title_prefix": "Your Complete Guide to",
                "focus": "practical tips, parking, timing, what to bring",
                "angle": "practical information"
            },
            "insider_perspective": {
                "title_prefix": "Insider's Take:",
                "focus": "behind-the-scenes insights, local connections, unique aspects",
                "angle": "exclusive insights"
            }
        }
        
        return templates.get(angle, templates["event_preview"]) 