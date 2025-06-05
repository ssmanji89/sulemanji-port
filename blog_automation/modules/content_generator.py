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
        max_retries = 2
        for attempt in range(max_retries + 1):
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
                    if attempt < max_retries:
                        logger.warning(f"Generated content too short: {word_count} words (attempt {attempt + 1}). Retrying...")
                        # Add more specific instruction for retry
                        prompt += f"\n\nIMPORTANT: The previous attempt was only {word_count} words. You MUST generate at least {Config.MIN_WORD_COUNT} words. Expand each section with more detail, examples, and explanations."
                        continue
                    else:
                        logger.error(f"Generated content still too short after {max_retries} retries: {word_count} words")
                        return None
                
                logger.info(f"Generated content: {word_count} words")
                return content
                
            except Exception as e:
                if attempt < max_retries:
                    logger.warning(f"Error generating content (attempt {attempt + 1}): {e}. Retrying...")
                    await asyncio.sleep(2)  # Brief delay before retry
                    continue
                else:
                    logger.error(f"Error generating content after {max_retries} retries: {e}")
                    return None
        
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

CRITICAL REQUIREMENTS:
- MINIMUM {request.target_word_count} words (this is mandatory - do not generate shorter content)
- Use proper markdown headers (##, ###, ####) - NEVER use numbered lists (1., 2., 3.)
- Include code blocks, bullet points, and visual formatting elements
- Use engaging subheadings that break up the content
- Include practical examples with code snippets where relevant
- Each major section should be 200-300 words minimum

AUDIENCE & STYLE:
- Audience: {request.target_audience}  
- Style: {request.writing_style}
- Technical but accessible
- Authoritative with actionable insights

TOPIC CONTEXT:
- Main keyword: {request.topic.keyword}
- Related terms: {', '.join(request.topic.related_terms)}
- Trend score: {request.topic.trend_score}
- Source: {request.topic.source}

REQUIRED STRUCTURE (each section should be substantial):
## Introduction
Hook the reader and provide a compelling overview of what they'll learn. Include the business value and why this topic matters today. (200+ words)

## Understanding the Fundamentals  
Background context and core concepts explained clearly. Define key terms and provide historical context. (250+ words)

## Technical Implementation
Detailed technical sections with practical examples and code snippets. Include multiple sub-sections with different approaches or techniques. (300+ words)

## Best Practices and Strategies
Proven approaches, methodologies, and expert recommendations. Include real-world scenarios and lessons learned. (250+ words)

## Advanced Techniques and Tools
Deep dive into advanced concepts, tools, and methodologies. Include comparisons and technical details. (200+ words)

## Real-World Applications
Concrete examples of implementation in production environments. Include case studies and success stories. (200+ words)

## Common Pitfalls and Solutions
Address challenges, troubleshooting, and how to avoid common mistakes. (150+ words)

## Future Trends and Innovations
Emerging developments and what's coming next in this space. Industry predictions and expert insights. (150+ words)

## Key Takeaways
Summary of the most important points and actionable insights. Create a bulleted list of main points. (100+ words)

FORMATTING GUIDELINES:
- Use bullet points with `-` for lists
- Include code blocks with ```language tags
- Use **bold** and *italic* for emphasis
- Add > blockquotes for important insights
- Include tables where data comparison is helpful
- Use horizontal rules (---) to separate major sections

IMPORTANT: Ensure your response is AT LEAST {request.target_word_count} words. Do not provide a shorter article - expand each section with detailed explanations, examples, and practical guidance.

Write the complete blog post content now using proper markdown formatting:"""
    
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