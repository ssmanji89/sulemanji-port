"""
Content Generation Module

Generates high-quality technical blog content using OpenAI GPT-4 with structured
prompts and comprehensive error handling.
"""

import asyncio
import logging
import time
from typing import Optional, Dict, Any
import openai
from openai import AsyncOpenAI
from ..models import TrendingTopic, BlogPost, ContentGenerationRequest, GenerationResult
from ..config import Config

logger = logging.getLogger(__name__)


class ContentGenerator:
    """Generates blog content using OpenAI GPT-4."""
    
    def __init__(self):
        """Initialize the content generator with OpenAI client."""
        self.client = AsyncOpenAI(api_key=Config.OPENAI_API_KEY)
        self.api_calls_count = 0
    
    async def generate_blog_post(self, request: ContentGenerationRequest) -> GenerationResult:
        """
        Generate a complete blog post from a trending topic.
        
        Args:
            request: Content generation parameters
            
        Returns:
            GenerationResult with success status and generated content
        """
        start_time = time.time()
        logger.info(f"Starting content generation for topic: {request.topic.keyword}")
        
        try:
            # Generate the main content
            content_result = await self._generate_content(request)
            if not content_result:
                return GenerationResult(
                    success=False,
                    error_message="Failed to generate main content",
                    generation_time_seconds=time.time() - start_time,
                    api_calls_made=self.api_calls_count
                )
            
            # Generate metadata (title, excerpt, tags)
            metadata_result = await self._generate_metadata(request.topic, content_result)
            if not metadata_result:
                return GenerationResult(
                    success=False,
                    error_message="Failed to generate metadata",
                    generation_time_seconds=time.time() - start_time,
                    api_calls_made=self.api_calls_count
                )
            
            # Create the blog post object
            blog_post = BlogPost(
                title=metadata_result['title'],
                content=content_result,
                excerpt=metadata_result['excerpt'],
                category=self._determine_category(request.topic),
                tags=metadata_result['tags'],
                seo_title=metadata_result.get('seo_title'),
                meta_description=metadata_result.get('meta_description')
            )
            
            generation_time = time.time() - start_time
            logger.info(f"Content generation completed in {generation_time:.2f} seconds")
            
            return GenerationResult(
                success=True,
                blog_post=blog_post,
                generation_time_seconds=generation_time,
                api_calls_made=self.api_calls_count
            )
            
        except Exception as e:
            logger.error(f"Error in content generation: {e}")
            return GenerationResult(
                success=False,
                error_message=str(e),
                generation_time_seconds=time.time() - start_time,
                api_calls_made=self.api_calls_count
            )    
    async def _generate_content(self, request: ContentGenerationRequest) -> Optional[str]:
        """Generate the main blog post content."""
        try:
            prompt = self._create_content_prompt(request)
            
            response = await self.client.chat.completions.create(
                model=Config.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": self._get_system_prompt()},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=Config.OPENAI_MAX_TOKENS,
                temperature=Config.OPENAI_TEMPERATURE
            )
            
            self.api_calls_count += 1
            content = response.choices[0].message.content
            
            # Validate content length
            word_count = len(content.split())
            if word_count < Config.MIN_WORD_COUNT:
                logger.warning(f"Generated content too short: {word_count} words")
                return None
            
            logger.info(f"Generated content: {word_count} words")
            return content
            
        except Exception as e:
            logger.error(f"Error generating content: {e}")
            return None
    
    async def _generate_metadata(self, topic: TrendingTopic, content: str) -> Optional[Dict[str, Any]]:
        """Generate metadata (title, excerpt, tags) for the blog post."""
        try:
            prompt = self._create_metadata_prompt(topic, content)
            
            response = await self.client.chat.completions.create(
                model=Config.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "You are an expert SEO and content strategist."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=500,
                temperature=0.3  # Lower temperature for more consistent metadata
            )
            
            self.api_calls_count += 1
            
            # Parse the structured response
            metadata_text = response.choices[0].message.content
            metadata = self._parse_metadata_response(metadata_text)
            
            logger.info("Generated metadata successfully")
            return metadata
            
        except Exception as e:
            logger.error(f"Error generating metadata: {e}")
            return None
    
    def _get_system_prompt(self) -> str:
        """Get the system prompt for content generation."""
        return """You are Suleman Anji, a technical problem-solver and IT professional specializing in AI, automation, and optimization. 

Write professional, technical blog content for an engineering audience. Your writing should be:
- Authoritative and knowledgeable
- Practical with actionable insights
- Well-structured with clear sections
- Technical but accessible
- Focused on real-world applications

Include specific examples, best practices, and implementation details where relevant.
Always maintain a professional tone while being engaging and informative."""    
    def _create_content_prompt(self, request: ContentGenerationRequest) -> str:
        """Create a structured prompt for content generation."""
        return f"""Write a comprehensive technical blog post about: {request.topic.keyword}

REQUIREMENTS:
- Target length: {request.target_word_count} words
- Audience: {request.target_audience}
- Style: {request.writing_style}
- Include practical examples and implementation details
- Structure with clear headings and subheadings
- Focus on actionable insights and best practices

TOPIC CONTEXT:
- Main keyword: {request.topic.keyword}
- Related terms: {', '.join(request.topic.related_terms)}
- Trend score: {request.topic.trend_score}
- Source: {request.topic.source}

CONTENT STRUCTURE:
1. Introduction (hook + overview)
2. Background/Context
3. Main content sections (3-4 sections)
4. Practical implementation examples
5. Best practices and recommendations
6. Future outlook/trends
7. Conclusion with key takeaways

Write the complete blog post content now:"""
    
    def _create_metadata_prompt(self, topic: TrendingTopic, content: str) -> str:
        """Create prompt for generating metadata."""
        content_preview = content[:500] + "..." if len(content) > 500 else content
        
        return f"""Generate SEO-optimized metadata for this blog post:

TOPIC: {topic.keyword}
CONTENT PREVIEW: {content_preview}

Generate the following in this exact format:

TITLE: [Compelling, SEO-friendly title under 60 characters]
SEO_TITLE: [Alternative SEO title if different from main title]
EXCERPT: [Engaging 2-3 sentence excerpt, 150-160 characters]
META_DESCRIPTION: [SEO meta description, 150-160 characters]
TAGS: [5-7 relevant tags, comma-separated]

Focus on technical keywords while maintaining readability."""
    
    def _parse_metadata_response(self, response: str) -> Dict[str, Any]:
        """Parse the structured metadata response."""
        metadata = {}
        
        try:
            lines = response.strip().split('\n')
            for line in lines:
                if ':' in line:
                    key, value = line.split(':', 1)
                    key = key.strip().lower()
                    value = value.strip()
                    
                    if key == 'title':
                        metadata['title'] = value
                    elif key == 'seo_title':
                        metadata['seo_title'] = value
                    elif key == 'excerpt':
                        metadata['excerpt'] = value
                    elif key == 'meta_description':
                        metadata['meta_description'] = value
                    elif key == 'tags':
                        metadata['tags'] = [tag.strip() for tag in value.split(',')]
            
            # Ensure required fields have defaults
            metadata.setdefault('title', 'Technical Insights')
            metadata.setdefault('excerpt', 'Exploring the latest in technology and automation.')
            metadata.setdefault('tags', ['Technology', 'AI', 'Automation'])
            
            return metadata
            
        except Exception as e:
            logger.error(f"Error parsing metadata: {e}")
            return {
                'title': 'Technical Insights',
                'excerpt': 'Exploring the latest in technology and automation.',
                'tags': ['Technology', 'AI', 'Automation']
            }
    
    def _determine_category(self, topic: TrendingTopic) -> str:
        """Determine the blog post category based on the topic."""
        keyword_lower = topic.keyword.lower()
        
        if any(term in keyword_lower for term in ['ai', 'artificial intelligence', 'machine learning', 'neural']):
            return 'AI'
        elif any(term in keyword_lower for term in ['automation', 'automate', 'workflow']):
            return 'Automation'
        elif any(term in keyword_lower for term in ['optimization', 'optimize', 'performance', 'efficiency']):
            return 'Optimization'
        elif any(term in keyword_lower for term in ['emerging', 'future', 'trend', 'innovation']):
            return 'Emerging Tech'
        else:
            return 'Tech Trends'