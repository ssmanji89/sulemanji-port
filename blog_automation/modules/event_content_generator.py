"""
Event Content Generator Module

Generates engaging blog content specifically for Houston events,
extending the base ContentGenerator with event-specific prompts and formatting.
"""

import asyncio
import logging
import time
import random
from typing import Optional, Dict, Any, List
from datetime import datetime

from .content_generator import ContentGenerator
from ..models import TrendingTopic, EventTrendingTopic, HoustonEvent, BlogPost, ContentGenerationRequest, GenerationResult, ContentType
from ..config import config

logger = logging.getLogger(__name__)


class EventContentGenerator(ContentGenerator):
    """Generates engaging blog content specifically for Houston events."""
    
    def __init__(self):
        """Initialize the event content generator."""
        super().__init__()
        logger.info("Event content generator initialized")
    
    def _get_dynamic_system_prompt(self, topic: TrendingTopic) -> str:
        """Get event-specific system prompts for engaging content."""
        
        base_personality = """You are Suleman Anji, a Houston local and tech professional who loves exploring the city's vibrant event scene. You have a knack for discovering hidden gems and making event recommendations that help people make the most of their time in Houston."""
        
        # Determine writing style based on event type
        if isinstance(topic, EventTrendingTopic) and topic.event_data:
            event = topic.event_data
            category = event.category or 'general'
            
            if category == 'concerts':
                style = 'music_enthusiast'
            elif category == 'festivals':
                style = 'community_connector'
            elif category == 'theatre':
                style = 'arts_aficionado'
            elif category == 'family':
                style = 'family_guide'
            elif category == 'food':
                style = 'foodie_insider'
            else:
                style = 'local_explorer'
        else:
            style = 'local_explorer'
        
        style_prompts = {
            "music_enthusiast": f"""{base_personality}

Write like a passionate music lover who knows Houston's music scene inside and out. Be enthusiastic about live performances and help readers understand what makes each event special. Include:
- Insights about the artists/performers
- Context about the venue and its significance
- Tips for getting the best experience
- Connection to Houston's broader music culture""",

            "community_connector": f"""{base_personality}

Write like someone who sees festivals as the heart of community connection. Focus on the cultural significance and community aspects of events. Include:
- What makes this festival unique to Houston
- Community traditions and cultural significance
- How to fully participate and connect with others
- Family-friendly aspects and logistics""",

            "arts_aficionado": f"""{base_personality}

Write with the sophistication of someone deeply appreciative of the arts while remaining accessible. Share insights that enhance the experience. Include:
- Background on the production, artists, or company
- Historical or cultural context
- What to expect and how to prepare
- Houston's thriving arts scene connections""",

            "family_guide": f"""{base_personality}

Write like a parent who wants to help other families find amazing experiences in Houston. Be practical while maintaining excitement. Include:
- Age-appropriate details and considerations
- Practical logistics (parking, timing, cost)
- What kids will love most about the event
- How to make it a memorable family experience""",

            "foodie_insider": f"""{base_personality}

Write like someone who truly understands Houston's incredible food scene. Share insider knowledge while building excitement. Include:
- What makes this food event special
- Key chefs, restaurants, or culinary traditions featured
- Insider tips for getting the most out of the experience
- Connection to Houston's diverse culinary landscape""",

            "local_explorer": f"""{base_personality}

Write like a Houston insider who loves helping people discover the best of what the city has to offer. Be enthusiastic and informative. Include:
- Why this event is worth attending
- Local context and significance
- Practical tips for attendees
- Connection to Houston's unique character"""
        }
        
        return style_prompts.get(style, style_prompts["local_explorer"])
    
    def _create_dynamic_content_prompt(self, request: ContentGenerationRequest) -> str:
        """Create event-specific content generation prompts."""
        
        topic = request.topic
        
        if isinstance(topic, EventTrendingTopic) and topic.event_data:
            event = topic.event_data
            
            # Build event-specific prompt
            prompt = f"""
Write an engaging blog post about this Houston event:

Event Title: {event.title}
Date: {event.date.strftime('%A, %B %d, %Y')}
Venue: {event.venue or 'TBD'}
Category: {event.category or 'General Event'}
Description: {event.description or 'No description available'}

Your blog post should:

1. **Hook readers immediately** - Start with something compelling about this event or Houston's event scene
2. **Provide valuable context** - Explain why this event matters and what makes it special
3. **Include practical information** - Date, time, location, how to get tickets
4. **Share insider knowledge** - Local tips, best times to arrive, what to expect
5. **Connect to Houston culture** - How this fits into Houston's broader cultural landscape
6. **Build excitement** - Help readers understand why they shouldn't miss this

Structure your post with:
- Engaging introduction that hooks the reader
- Main event details and what makes it special
- Practical attending information
- Why it's worth your time
- How it connects to Houston's culture
- Clear call-to-action for readers

Target word count: {request.target_word_count} words

Make this feel like a personal recommendation from a Houston insider, not a dry event listing.
"""
        else:
            # Fallback for non-event trending topics
            prompt = f"""
Write an engaging blog post about Houston events related to: {topic.keyword}

Focus on upcoming events, venues, or event categories in Houston that relate to this topic.
Include practical information and local insights that help readers discover great experiences in Houston.

Target word count: {request.target_word_count} words
"""
        
        return prompt
    
    def _determine_category(self, topic: TrendingTopic) -> str:
        """Map event topics to blog categories."""
        
        if isinstance(topic, EventTrendingTopic) and topic.event_data:
            event_category = topic.event_data.category
            
            category_mapping = {
                'concerts': 'Houston Events',
                'festivals': 'Houston Events', 
                'theatre': 'Arts & Culture',
                'family': 'Family Fun',
                'food': 'Food & Dining',
                'sports': 'Sports & Recreation'
            }
            
            return category_mapping.get(event_category, 'Houston Events')
        
        return 'Houston Events'
    
    async def generate_event_seo_data(self, event: HoustonEvent) -> Dict[str, Any]:
        """Generate Houston event-specific SEO metadata."""
        
        # Build local keywords
        local_keywords = self._generate_local_keywords(event)
        
        # Create SEO title
        date_str = event.date.strftime('%B %Y') if event.date else ''
        seo_title = f"{event.title} - Houston {event.category.title()} {date_str} | Your Guide"
        
        # Create meta description with local context
        venue_text = f" at {event.venue}" if event.venue else " in Houston"
        date_text = f" on {event.date.strftime('%B %d')}" if event.date else ""
        
        meta_description = f"Don't miss {event.title}{venue_text}{date_text}. Complete guide with tickets, parking, and insider tips for this Houston {event.category} event."
        
        # Generate schema markup data
        schema_data = self._create_event_schema_markup(event)
        
        return {
            'seo_title': seo_title[:60],  # Google's recommended title length
            'meta_description': meta_description[:160],  # Google's recommended description length
            'local_keywords': local_keywords,
            'schema_markup': schema_data
        }
    
    def _generate_local_keywords(self, event: HoustonEvent) -> List[str]:
        """Generate Houston-specific keywords for SEO."""
        
        keywords = [
            f"Houston {event.category}",
            f"{event.category} Houston",
            f"Houston events {event.date.strftime('%B %Y') if event.date else ''}",
            "things to do Houston",
            "Houston weekend events"
        ]
        
        # Add venue-specific keywords
        if event.venue:
            keywords.extend([
                f"{event.venue} events",
                f"{event.venue} Houston"
            ])
        
        # Add neighborhood keywords if we can identify them
        houston_areas = [
            'downtown Houston', 'Museum District', 'Heights', 'Montrose',
            'Midtown Houston', 'River Oaks', 'Memorial', 'Galleria',
            'Sugar Land', 'The Woodlands', 'Katy', 'Pearland'
        ]
        
        # Check if venue or description mentions any Houston areas
        search_text = f"{event.venue or ''} {event.description or ''}".lower()
        for area in houston_areas:
            if area.lower() in search_text:
                keywords.append(f"{event.category} {area}")
        
        return keywords[:10]  # Limit to top 10 keywords
    
    def _create_event_schema_markup(self, event: HoustonEvent) -> Dict[str, Any]:
        """Create JSON-LD schema markup for the event."""
        
        schema = {
            "@context": "https://schema.org",
            "@type": "Event",
            "name": event.title,
            "description": event.description or f"Join us for {event.title} in Houston",
            "startDate": event.date.isoformat() if event.date else None,
            "location": {
                "@type": "Place",
                "name": event.venue or "Houston, TX",
                "address": {
                    "@type": "PostalAddress",
                    "addressLocality": "Houston",
                    "addressRegion": "TX",
                    "addressCountry": "US"
                }
            },
            "organizer": {
                "@type": "Organization",
                "name": "Houston Events"
            }
        }
        
        # Add optional fields if available
        if event.url:
            schema["url"] = event.url
        
        if event.image_url:
            schema["image"] = event.image_url
        
        if event.price:
            schema["offers"] = {
                "@type": "Offer",
                "price": event.price,
                "priceCurrency": "USD"
            }
        
        return schema
    
    async def generate_local_business_mentions(self, event: HoustonEvent) -> List[str]:
        """Generate mentions of nearby Houston businesses for local SEO."""
        
        business_mentions = []
        
        # Common Houston venues and their nearby businesses
        venue_context = {
            'downtown': [
                "downtown Houston restaurants",
                "Discovery Green",
                "GRB Convention Center",
                "Minute Maid Park"
            ],
            'museum district': [
                "Houston Museum of Natural Science",
                "Museum of Fine Arts Houston",
                "Hermann Park",
                "Rice Village"
            ],
            'heights': [
                "Heights Boulevard",
                "White Oak Music Hall",
                "19th Street in the Heights"
            ],
            'montrose': [
                "Montrose Boulevard",
                "Menil Collection",
                "River Oaks shopping"
            ]
        }
        
        # Check venue location context
        venue_text = (event.venue or '').lower()
        description_text = (event.description or '').lower()
        search_text = f"{venue_text} {description_text}"
        
        for area, businesses in venue_context.items():
            if area in search_text:
                business_mentions.extend(businesses[:2])  # Add up to 2 mentions per area
                break
        
        # Add general Houston context if no specific area identified
        if not business_mentions:
            business_mentions = [
                "Houston Metro",
                "Hermann Park",
                "Buffalo Bayou"
            ]
        
        return business_mentions[:3]  # Limit to 3 mentions
    
    def optimize_for_voice_search(self, event: HoustonEvent) -> List[str]:
        """Generate conversational keywords for voice search optimization."""
        
        voice_queries = [
            f"what's happening in Houston this weekend",
            f"Houston {event.category} events",
            f"things to do in Houston {event.date.strftime('%B') if event.date else 'this month'}",
            f"where to go for {event.category} in Houston",
            f"Houston events near me"
        ]
        
        if event.venue:
            voice_queries.append(f"events at {event.venue}")
        
        if event.category:
            voice_queries.extend([
                f"best {event.category} events Houston",
                f"Houston {event.category} this weekend"
            ])
        
        return voice_queries
    
    async def generate_content(self, selected_topic: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate event content - compatibility method for existing orchestrator.
        
        Args:
            selected_topic: Dictionary with topic information
            
        Returns:
            Dictionary with generated content
        """
        try:
            # Convert dictionary to EventTrendingTopic if needed
            if isinstance(selected_topic, dict):
                # Create a mock EventTrendingTopic from the dictionary
                topic = EventTrendingTopic(
                    keyword=selected_topic.get('title', 'Houston Event'),
                    trend_score=selected_topic.get('score', 0.5),
                    search_volume=selected_topic.get('upvotes', 100),
                    related_terms=[selected_topic.get('category', 'events')],
                    timestamp=datetime.now(),
                    source="houston_events",
                    source_url=selected_topic.get('url')
                )
            else:
                topic = selected_topic
            
            # Create content generation request
            request = ContentGenerationRequest(
                topic=topic,
                content_type=ContentType.EVENTS
            )
            
            # Generate the content
            result = await self.generate_blog_post(request)
            
            if result.success and result.blog_post:
                return {
                    'title': result.blog_post.title,
                    'content': result.blog_post.content,
                    'excerpt': result.blog_post.excerpt,
                    'category': result.blog_post.category,
                    'tags': result.blog_post.tags,
                    'seo_title': result.blog_post.seo_title,
                    'meta_description': result.blog_post.meta_description
                }
            else:
                raise Exception(result.error_message or "Content generation failed")
        
        except Exception as e:
            logger.error(f"Error in event content generation: {e}")
            raise 