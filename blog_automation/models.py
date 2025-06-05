"""
Data models for the automated blog content generation system.

This module defines the core data structures used throughout the system,
following the user's specified requirements for type safety and structure.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional
from enum import Enum


class TrendSource(Enum):
    """Sources for trending topic discovery."""
    REDDIT = "reddit"
    GOOGLE_TRENDS = "google_trends"
    MANUAL = "manual"


class PostCategory(Enum):
    """Blog post categories aligned with site focus."""
    AI = "AI"
    AUTOMATION = "Automation"
    OPTIMIZATION = "Optimization"
    EMERGING_TECH = "Emerging Tech"
    TECH_TRENDS = "Tech Trends"


@dataclass
class TrendingTopic:
    """Represents a trending topic discovered from various sources."""
    keyword: str
    trend_score: float
    search_volume: int
    related_terms: List[str]
    timestamp: datetime
    source: str
    final_score: float = 0.0
    
    def __post_init__(self):
        """Calculate final score if not provided."""
        if self.final_score == 0.0:
            # Weighted scoring: trend_score (40%) + normalized search_volume (60%)
            normalized_volume = min(self.search_volume / 10000, 1.0)  # Cap at 10k
            self.final_score = (self.trend_score * 0.4) + (normalized_volume * 0.6)


@dataclass
class Product:
    """Amazon product for affiliate integration."""
    title: str
    asin: str
    price: Optional[str] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    affiliate_link: str = ""
    
    def __post_init__(self):
        """Generate affiliate link if not provided."""
        if not self.affiliate_link and self.asin:
            self.affiliate_link = f"https://www.amazon.com/dp/{self.asin}?tag=sghpgs-20"


@dataclass
class BlogPost:
    """Complete blog post with metadata and content."""
    title: str
    content: str
    excerpt: str
    category: str
    tags: List[str]
    author: str = "Suleman Anji"
    date: Optional[datetime] = None
    affiliate_products: List[Product] = field(default_factory=list)
    word_count: int = 0
    seo_title: Optional[str] = None
    meta_description: Optional[str] = None
    
    def __post_init__(self):
        """Set defaults and calculate derived fields."""
        if self.date is None:
            self.date = datetime.now()
        
        if self.word_count == 0:
            self.word_count = len(self.content.split())
        
        if self.seo_title is None:
            self.seo_title = self.title
        
        if self.meta_description is None:
            # Use first 150 characters of excerpt
            self.meta_description = self.excerpt[:150] + "..." if len(self.excerpt) > 150 else self.excerpt


@dataclass
class ContentGenerationRequest:
    """Request parameters for content generation."""
    topic: TrendingTopic
    target_word_count: int = 1400  # Middle of 1200-1500 range
    include_products: bool = True
    max_products: int = 5
    writing_style: str = "technical_professional"
    target_audience: str = "engineering_professionals"


@dataclass
class GenerationResult:
    """Result of the content generation process."""
    success: bool
    blog_post: Optional[BlogPost] = None
    error_message: Optional[str] = None
    generation_time_seconds: float = 0.0
    api_calls_made: int = 0
    
    @property
    def is_valid(self) -> bool:
        """Check if the generated content meets quality requirements."""
        if not self.success or not self.blog_post:
            return False
        
        # Check word count requirements
        if not (1200 <= self.blog_post.word_count <= 1500):
            return False
        
        # Check required fields
        required_fields = [
            self.blog_post.title,
            self.blog_post.content,
            self.blog_post.excerpt,
            self.blog_post.category
        ]
        
        return all(field for field in required_fields)


@dataclass
class PublishingResult:
    """Result of the publishing process."""
    success: bool
    file_path: Optional[str] = None
    commit_sha: Optional[str] = None
    error_message: Optional[str] = None
    duplicate_detected: bool = False