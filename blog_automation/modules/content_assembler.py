"""
Content Assembly Module

Assembles blog posts with Jekyll front matter, affiliate product integration,
and SEO optimization following the specified requirements.
"""

import logging
from datetime import datetime
from typing import List, Optional
import re
from ..models import BlogPost, Product, TrendingTopic
from ..config import Config

logger = logging.getLogger(__name__)


class ContentAssembler:
    """Assembles complete blog posts with Jekyll formatting and affiliate integration."""
    
    def __init__(self):
        """Initialize the content assembler."""
        pass
    
    def assemble_blog_post(self, blog_post: BlogPost, products: List[Product], source_topic: Optional[TrendingTopic] = None) -> str:
        """
        Assemble a complete Jekyll blog post with front matter and affiliate integration.
        
        Args:
            blog_post: The blog post object with content and metadata
            products: List of affiliate products to integrate
            source_topic: Original trending topic with source information
            
        Returns:
            Complete Jekyll markdown content ready for publishing
        """
        logger.info(f"Assembling blog post: {blog_post.title}")
        
        try:
            # Generate Jekyll front matter
            front_matter = self._generate_front_matter(blog_post)
            
            # Integrate affiliate products into content
            enhanced_content = self._integrate_affiliate_products(blog_post.content, products)
            
            # Add source attribution if available
            content_with_source = self._add_source_attribution(enhanced_content, source_topic)
            
            # Add affiliate disclosure
            content_with_disclosure = self._add_affiliate_disclosure(content_with_source)
            
            # Combine everything
            complete_post = f"{front_matter}\n\n{content_with_disclosure}"
            
            logger.info("Blog post assembly completed successfully")
            return complete_post
            
        except Exception as e:
            logger.error(f"Error assembling blog post: {e}")
            raise
    
    def _generate_front_matter(self, blog_post: BlogPost) -> str:
        """Generate Jekyll front matter for the blog post."""
        # Format date for Jekyll
        date_str = blog_post.date.strftime("%Y-%m-%d %H:%M:%S %z") if blog_post.date else datetime.now().strftime("%Y-%m-%d %H:%M:%S +0000")
        
        # Format tags for YAML
        tags_yaml = "[" + ", ".join(f'"{tag}"' for tag in blog_post.tags) + "]"
        
        front_matter = f"""---
layout: post
title: "{blog_post.title}"
excerpt: "{blog_post.excerpt}"
categories: [{blog_post.category}]
tags: {tags_yaml}
author: "{blog_post.author}"
date: {date_str}
seo_title: "{blog_post.seo_title or blog_post.title}"
meta_description: "{blog_post.meta_description or blog_post.excerpt}"
word_count: {blog_post.word_count}
---"""
        
        return front_matter    
    def _integrate_affiliate_products(self, content: str, products: List[Product]) -> str:
        """Integrate affiliate products naturally into the content."""
        if not products:
            return content
        
        try:
            # Split content into paragraphs
            paragraphs = content.split('\n\n')
            
            # Find good insertion points (avoid first and last paragraphs)
            insertion_points = []
            for i, paragraph in enumerate(paragraphs):
                if i > 0 and i < len(paragraphs) - 1 and len(paragraph) > 100:
                    insertion_points.append(i)
            
            # Insert products at strategic points
            products_inserted = 0
            for i, product in enumerate(products):
                if products_inserted >= len(insertion_points):
                    break
                
                insertion_index = insertion_points[products_inserted]
                product_mention = self._create_product_mention(product, i + 1)
                
                # Insert after the selected paragraph
                paragraphs.insert(insertion_index + 1, product_mention)
                products_inserted += 1
                
                # Adjust subsequent insertion points
                for j in range(products_inserted, len(insertion_points)):
                    insertion_points[j] += 1
            
            # Add remaining products at the end if any
            if products_inserted < len(products):
                recommendations_section = self._create_recommendations_section(products[products_inserted:])
                paragraphs.append(recommendations_section)
            
            return '\n\n'.join(paragraphs)
            
        except Exception as e:
            logger.error(f"Error integrating affiliate products: {e}")
            return content
    
    def _create_product_mention(self, product: Product, position: int) -> str:
        """Create a natural product mention for integration into content."""
        mention_templates = [
            f"""
> **Recommended Resource:** For those looking to dive deeper into this topic, **[{product.title}]({product.affiliate_link})** offers comprehensive insights and practical guidance. {f"⭐ {product.rating}/5" if product.rating else ""} {f"- {product.price}" if product.price else ""}
""",
            f"""
### 💡 Professional Resource

To implement these concepts effectively, consider exploring **[{product.title}]({product.affiliate_link})**, which provides detailed methodologies and best practices. {f"Rating: {product.rating}/5" if product.rating else ""} {f"| Price: {product.price}" if product.price else ""}
""",
            f"""
---

**📚 Expert Recommendation:** A valuable resource for understanding these principles is **[{product.title}]({product.affiliate_link})**, offering both theoretical foundations and practical applications. {f"({product.rating}⭐)" if product.rating else ""} {f"{product.price}" if product.price else ""}

---
""",
        ]
        
        template_index = (position - 1) % len(mention_templates)
        return mention_templates[template_index]
    
    def _create_recommendations_section(self, products: List[Product]) -> str:
        """Create a recommendations section for remaining products."""
        section = """
---

## 📚 Recommended Resources

To further explore the topics discussed in this article, consider these carefully selected resources:

"""
        
        for i, product in enumerate(products, 1):
            rating_display = f" ⭐ {product.rating}/5" if product.rating else ""
            price_display = f" • {product.price}" if product.price else ""
            description = f" - {product.description}" if hasattr(product, 'description') and product.description else ""
            
            section += f"""
### {i}. [{product.title}]({product.affiliate_link})
{description}{rating_display}{price_display}

"""
        
        return section    
    def _add_source_attribution(self, content: str, source_topic: Optional[TrendingTopic]) -> str:
        """Add source attribution for the original topic, especially Reddit threads."""
        if not source_topic or not source_topic.source_url:
            return content
        
        # Check if this is a Reddit source
        if source_topic.source.startswith('reddit_') and source_topic.source_url:
            subreddit_name = source_topic.source.replace('reddit_', '')
            
            attribution = f"""
---

## 📰 Discussion Source

This article was inspired by an active discussion in the **r/{subreddit_name}** community. Join the conversation and share your thoughts:

**[View Original Reddit Discussion]({source_topic.source_url})**

The topic "{source_topic.keyword}" has generated significant engagement ({source_topic.search_volume} upvotes) and represents a trending area of interest in the tech community.

---
"""
            
            # Insert attribution before the affiliate disclosure
            return content + attribution
        
        return content
    
    def _add_affiliate_disclosure(self, content: str) -> str:
        """Add required affiliate disclosure to the content."""
        disclosure = """
---

**Affiliate Disclosure:** This post contains affiliate links. As an Amazon Associate, I earn from qualifying purchases. This helps support the creation of quality technical content while providing you with valuable resources. Thank you for your support!

---
"""
        
        return content + disclosure
    
    def generate_filename(self, blog_post: BlogPost) -> str:
        """Generate Jekyll-compatible filename for the blog post."""
        # Format: YYYY-MM-DD-title-slug.md
        date_str = blog_post.date.strftime("%Y-%m-%d") if blog_post.date else datetime.now().strftime("%Y-%m-%d")
        
        # Create URL-friendly slug from title
        slug = self._create_slug(blog_post.title)
        
        return f"{date_str}-{slug}.md"
    
    def _create_slug(self, title: str) -> str:
        """Create a URL-friendly slug from the title."""
        # Convert to lowercase and replace spaces with hyphens
        slug = title.lower()
        
        # Remove special characters except hyphens and alphanumeric
        slug = re.sub(r'[^a-z0-9\s-]', '', slug)
        
        # Replace spaces with hyphens
        slug = re.sub(r'\s+', '-', slug)
        
        # Remove multiple consecutive hyphens
        slug = re.sub(r'-+', '-', slug)
        
        # Remove leading/trailing hyphens
        slug = slug.strip('-')
        
        # Limit length
        return slug[:50]

    async def assemble_post(self, blog_content: dict, products: List[Product], selected_topic: dict) -> str:
        """
        Assemble a blog post from dictionary content and product list.
        This method is expected by the orchestrator and converts dict format to BlogPost.
        
        Args:
            blog_content: Dictionary with blog content and metadata
            products: List of affiliate products
            selected_topic: Dictionary with topic information
            
        Returns:
            Complete Jekyll markdown content ready for publishing
        """
        try:
            # Convert dictionary to BlogPost object
            blog_post = BlogPost(
                title=blog_content['title'],
                content=blog_content['content'],
                excerpt=blog_content['excerpt'],
                category=blog_content['category'],
                tags=blog_content['tags'],
                seo_title=blog_content.get('seo_title'),
                meta_description=blog_content.get('meta_description')
            )
            
            # Convert selected_topic dict to TrendingTopic if needed for source attribution
            source_topic = None
            if selected_topic.get('source') and selected_topic.get('url'):
                source_topic = TrendingTopic(
                    keyword=selected_topic['title'],
                    trend_score=selected_topic.get('score', 1.0),
                    search_volume=selected_topic.get('upvotes', 0),
                    related_terms=[],
                    timestamp=datetime.now(),
                    source=selected_topic['source'],
                    source_url=selected_topic['url']
                )
            
            # Use the existing assemble_blog_post method
            return self.assemble_blog_post(blog_post, products, source_topic)
            
        except Exception as e:
            logger.error(f"Error in assemble_post wrapper: {e}")
            raise