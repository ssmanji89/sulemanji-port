"""
Tests for data models.
"""

import pytest
from datetime import datetime
from blog_automation.models import TrendingTopic, Product, BlogPost, ContentGenerationRequest


class TestTrendingTopic:
    """Test cases for TrendingTopic model."""
    
    def test_trending_topic_creation(self):
        """Test basic TrendingTopic creation."""
        topic = TrendingTopic(
            keyword="artificial intelligence",
            trend_score=0.8,
            search_volume=5000,
            related_terms=["AI", "machine learning"],
            timestamp=datetime.now(),
            source="reddit_technology"
        )
        
        assert topic.keyword == "artificial intelligence"
        assert topic.trend_score == 0.8
        assert topic.search_volume == 5000
        assert topic.final_score > 0  # Should be calculated automatically
    
    def test_final_score_calculation(self):
        """Test automatic final score calculation."""
        topic = TrendingTopic(
            keyword="test",
            trend_score=0.5,
            search_volume=1000,
            related_terms=[],
            timestamp=datetime.now(),
            source="test"
        )
        
        # Expected: (0.5 * 0.4) + (0.1 * 0.6) = 0.2 + 0.06 = 0.26
        expected_score = (0.5 * 0.4) + (min(1000 / 10000, 1.0) * 0.6)
        assert abs(topic.final_score - expected_score) < 0.01


class TestProduct:
    """Test cases for Product model."""
    
    def test_product_creation(self):
        """Test basic Product creation."""
        product = Product(
            title="Test Product",
            asin="B123456789",
            price="$29.99",
            rating=4.5
        )
        
        assert product.title == "Test Product"
        assert product.asin == "B123456789"
        assert product.affiliate_link == "https://www.amazon.com/dp/B123456789?tag=sghpgs-20"
    
    def test_affiliate_link_generation(self):
        """Test automatic affiliate link generation."""
        product = Product(title="Test", asin="B123456789")
        expected_link = "https://www.amazon.com/dp/B123456789?tag=sghpgs-20"
        assert product.affiliate_link == expected_link


class TestBlogPost:
    """Test cases for BlogPost model."""
    
    def test_blog_post_creation(self):
        """Test basic BlogPost creation."""
        post = BlogPost(
            title="Test Post",
            content="This is test content with multiple words to test word counting.",
            excerpt="Test excerpt",
            category="AI",
            tags=["test", "ai"]
        )
        
        assert post.title == "Test Post"
        assert post.author == "Suleman Anji"  # Default author
        assert post.word_count > 0  # Should be calculated
        assert post.date is not None  # Should be set automatically
    
    def test_word_count_calculation(self):
        """Test automatic word count calculation."""
        content = "This is a test content with exactly ten words here."
        post = BlogPost(
            title="Test",
            content=content,
            excerpt="Test",
            category="Test",
            tags=["test"]
        )
        
        assert post.word_count == 10