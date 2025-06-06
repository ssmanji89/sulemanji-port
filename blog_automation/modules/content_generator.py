"""
Content Generation Module

Generates engaging, human-like technical blog content using OpenAI GPT-4 with 
dynamic prompts and storytelling techniques.
"""

import asyncio
import logging
import time
import random
from typing import Optional, Dict, Any, List
import openai
from openai import AsyncOpenAI
from ..models import TrendingTopic, BlogPost, ContentGenerationRequest, GenerationResult
from ..config import config
from datetime import datetime

logger = logging.getLogger(__name__)


class ContentGenerator:
    """Generates engaging blog content using OpenAI GPT-4 with dynamic storytelling."""
    
    def __init__(self):
        """Initialize the content generator with OpenAI client."""
        try:
            self.client = AsyncOpenAI(api_key=config.get('openai.api_key'))
            self.model = config.get('openai.model', 'gpt-4')
            self.temperature = config.get('openai.temperature', 0.8)
            self.max_tokens = config.get('openai.max_tokens', 3000)
            self.min_words = config.get('content.min_words', 600)
            self.max_words = config.get('content.max_words', 1200)
            self.api_calls_count = 0
            logger.info("Content generator initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize content generator: {e}")
            raise
    
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
            # Generate the main content with dynamic approach
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
        """Generate the main blog post content with engaging storytelling."""
        max_retries = 2
        for attempt in range(max_retries + 1):
            try:
                # Use dynamic prompt based on topic characteristics
                prompt = self._create_dynamic_content_prompt(request)
                system_prompt = self._get_dynamic_system_prompt(request.topic)
                
                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=self.max_tokens,
                    temperature=self.temperature
                )
                
                self.api_calls_count += 1
                content = response.choices[0].message.content
                
                # Validate content length
                word_count = len(content.split())
                if word_count < self.min_words or word_count > self.max_words:
                    if attempt < max_retries:
                        logger.warning(f"Generated content length out of range: {word_count} words (attempt {attempt + 1}). Retrying...")
                        continue
                    else:
                        logger.error(f"Generated content length out of range after {max_retries} retries: {word_count} words")
                        return None
                
                logger.info(f"Generated content: {word_count} words")
                return content
                
            except Exception as e:
                if attempt < max_retries:
                    logger.warning(f"Error generating content (attempt {attempt + 1}): {e}. Retrying...")
                    await asyncio.sleep(2)
                    continue
                else:
                    logger.error(f"Error generating content after {max_retries} retries: {e}")
                    return None
        
        return None
    
    def _get_dynamic_system_prompt(self, topic: TrendingTopic) -> str:
        """Get a dynamic system prompt based on topic characteristics for engaging content."""
        
        # Determine writing style based on topic source and content
        writing_styles = [
            "conversational_expert",
            "storytelling_technical", 
            "insider_perspective",
            "practical_guide"
        ]
        
        # Choose style based on topic characteristics
        if "reddit_" in topic.source:
            style = random.choice(["conversational_expert", "insider_perspective"])
        else:
            style = random.choice(writing_styles)
        
        base_personality = """You are Suleman Anji, a seasoned IT professional and technical problem-solver with over a decade of experience in automation, AI, and optimization. You have a unique ability to make complex technical topics accessible and engaging."""
        
        style_prompts = {
            "conversational_expert": f"""{base_personality}

Write like you're having an engaging conversation with a fellow engineer over coffee. Be authentic, share insights from your experience, and don't be afraid to show your personality. Use:
- Conversational tone with technical depth
- Personal anecdotes and real-world examples
- Occasional humor where appropriate
- Questions that engage the reader
- "Here's what I've learned..." type insights""",

            "storytelling_technical": f"""{base_personality}

Tell the story behind the technology. Every technical advancement has a narrative - the problems it solves, the people who built it, the impact it has. Structure your writing like a compelling story:
- Hook the reader with an interesting opening
- Build narrative tension around technical challenges
- Reveal solutions with satisfying explanations
- Connect to broader implications and future possibilities""",

            "insider_perspective": f"""{base_personality}

Write from the perspective of someone who's been in the trenches. Share the real talk about what works, what doesn't, and what you wish you'd known earlier. Include:
- Hard-earned lessons and gotchas
- Honest assessments of tools and approaches
- Behind-the-scenes insights
- Practical advice that saves time and headaches""",

            "practical_guide": f"""{base_personality}

Be the guide who helps engineers navigate complex topics with confidence. Focus on actionable insights and clear explanations:
- Step-by-step thinking processes
- Decision frameworks and criteria
- Common pitfalls and how to avoid them
- Concrete next steps and recommendations"""
        }
        
        return style_prompts.get(style, style_prompts["conversational_expert"])
    
    def _create_dynamic_content_prompt(self, request: ContentGenerationRequest) -> str:
        """Create a dynamic content prompt that varies structure and approach."""
        
        topic = request.topic
        
        # Determine content approach based on topic
        approaches = [
            "problem_solution_narrative",
            "personal_journey_insights", 
            "industry_analysis_takeaways",
            "hands_on_experience_guide"
        ]
        
        # Weight approaches based on topic characteristics
        if any(word in topic.keyword.lower() for word in ['breakthrough', 'new', 'latest', 'announced']):
            approach = random.choice(["industry_analysis_takeaways", "personal_journey_insights"])
        elif any(word in topic.keyword.lower() for word in ['security', 'threat', 'vulnerability']):
            approach = random.choice(["problem_solution_narrative", "hands_on_experience_guide"])
        else:
            approach = random.choice(approaches)
        
        # Set a higher target to account for GPT-4's tendency to generate shorter content
        target_words = max(request.target_word_count + 200, 800)
        
        base_requirements = f"""
🚨 CRITICAL WORD COUNT REQUIREMENT 🚨:
- Your blog post MUST be AT LEAST {target_words} words long
- This is absolutely mandatory - content under {target_words} words will be rejected
- Count your words carefully and ensure you meet this requirement
- Write comprehensive, detailed content with examples and explanations
- Each section should be substantial and well-developed

ADDITIONAL REQUIREMENTS:
- Use proper markdown formatting with engaging headers
- Include code examples, practical tips, and real-world scenarios
- Make it conversational and engaging, not academic or robotic
- Share personal insights and experiences
- Write in-depth, comprehensive content that thoroughly explores the topic
"""

        approach_prompts = {
            "problem_solution_narrative": f"""
Write an engaging technical blog post about: "{topic.keyword}"

{base_requirements}

NARRATIVE STRUCTURE (each section should be detailed and comprehensive):
1. **Start with a hook** - Open with a compelling scenario, question, or observation that draws readers in (150+ words)
2. **Set the stage** - Explain why this topic matters right now and who's affected (200+ words)
3. **Dive into the technical reality** - Share your hands-on experience and insights (250+ words)
4. **Present solutions and approaches** - Offer practical, tested solutions with examples (200+ words)
5. **Share lessons learned** - Include gotchas, tips, and hard-earned wisdom (150+ words)
6. **Look ahead** - Discuss implications and future considerations (150+ words)

TONE: Write like you're sharing insights with a colleague who respects your expertise but appreciates honesty about challenges and trade-offs.

⚠️ REMEMBER: Your response must be AT LEAST {target_words} words. Write comprehensive, detailed content.""",

            "personal_journey_insights": f"""
Write an engaging technical blog post about: "{topic.keyword}"

{base_requirements}

PERSONAL JOURNEY STRUCTURE (each section should be detailed and comprehensive):
1. **Your discovery moment** - How you first encountered this topic/technology (150+ words)
2. **Initial challenges** - What problems you faced or observed in the industry (200+ words)
3. **Learning curve insights** - What you discovered along the way (250+ words)
4. **Practical applications** - Real projects or scenarios where you applied this knowledge (200+ words)
5. **Evolved perspective** - How your understanding has matured (150+ words)
6. **Advice for others** - What you'd tell someone starting this journey (150+ words)

TONE: Authentic and reflective, like you're mentoring someone through your experiences.

⚠️ REMEMBER: Your response must be AT LEAST {target_words} words. Write comprehensive, detailed content.""",

            "industry_analysis_takeaways": f"""
Write an engaging technical blog post about: "{topic.keyword}"

{base_requirements}

ANALYSIS STRUCTURE (each section should be detailed and comprehensive):
1. **What's happening** - Break down the current situation or development (200+ words)
2. **Why it matters** - Technical and business implications (200+ words)
3. **Under the hood** - Technical deep-dive with your expert analysis (250+ words)
4. **Real-world impact** - How this affects developers, companies, users (200+ words)
5. **Strategic considerations** - Decision frameworks and evaluation criteria (150+ words)
6. **Action items** - Concrete next steps for different audiences (150+ words)

TONE: Insightful analyst who cuts through hype to deliver practical intelligence.

⚠️ REMEMBER: Your response must be AT LEAST {target_words} words. Write comprehensive, detailed content.""",

            "hands_on_experience_guide": f"""
Write an engaging technical blog post about: "{topic.keyword}"

{base_requirements}

HANDS-ON STRUCTURE (each section should be detailed and comprehensive):
1. **The scenario** - Real-world situation where this knowledge applies (150+ words)
2. **Getting started** - Your recommended approach and setup (200+ words)
3. **Step-by-step insights** - Key techniques and decision points (250+ words)
4. **Common gotchas** - Mistakes you've seen (or made) and how to avoid them (200+ words)
5. **Advanced considerations** - Optimizations and expert-level insights (150+ words)
6. **Wrap-up** - Summary of key takeaways and when to use this approach (150+ words)

TONE: Experienced practitioner sharing battle-tested knowledge.

⚠️ REMEMBER: Your response must be AT LEAST {target_words} words. Write comprehensive, detailed content."""
        }
        
        selected_prompt = approach_prompts.get(approach, approach_prompts["problem_solution_narrative"])
        
        # Add source attribution if it's from Reddit
        if topic.source_url and "reddit.com" in topic.source_url:
            selected_prompt += f"""

CONTEXT: This topic emerged from active discussions in the tech community. Consider referencing the ongoing conversation and community insights where relevant."""
        
        return selected_prompt
    
    async def _generate_metadata(self, topic: TrendingTopic, content: str) -> Optional[Dict[str, Any]]:
        """Generate engaging metadata (title, excerpt, tags) for the blog post."""
        try:
            prompt = f"""
Create engaging metadata for this technical blog post about "{topic.keyword}".

CONTENT PREVIEW:
{content[:500]}...

Generate:
1. **Title**: Compelling, specific, and SEO-friendly (60 chars max)
2. **Excerpt**: Engaging hook that makes people want to read (150-160 chars)
3. **Tags**: 5-7 relevant, searchable tags
4. **SEO Title**: Optimized for search (if different from main title)
5. **Meta Description**: Search-friendly description (150-160 chars)

Format your response EXACTLY like this:
TITLE: [compelling title here]
EXCERPT: [engaging excerpt here]
TAGS: ["tag1", "tag2", "tag3", "tag4", "tag5"]
SEO_TITLE: [seo title here]
META_DESCRIPTION: [meta description here]
"""
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert content marketer who creates compelling metadata that drives engagement."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=500,
                temperature=0.7
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
    
    def _parse_metadata_response(self, response: str) -> Dict[str, Any]:
        """Parse the structured metadata response."""
        try:
            lines = response.strip().split('\n')
            metadata = {}
            
            for line in lines:
                if line.startswith('TITLE:'):
                    metadata['title'] = line.replace('TITLE:', '').strip()
                elif line.startswith('EXCERPT:'):
                    metadata['excerpt'] = line.replace('EXCERPT:', '').strip()
                elif line.startswith('TAGS:'):
                    tags_str = line.replace('TAGS:', '').strip()
                    # Parse the tags list
                    import json
                    try:
                        metadata['tags'] = json.loads(tags_str)
                    except:
                        metadata['tags'] = [tag.strip(' "[]') for tag in tags_str.split(',')]
                elif line.startswith('SEO_TITLE:'):
                    metadata['seo_title'] = line.replace('SEO_TITLE:', '').strip()
                elif line.startswith('META_DESCRIPTION:'):
                    metadata['meta_description'] = line.replace('META_DESCRIPTION:', '').strip()
            
            # Ensure we have the required fields
            if 'title' not in metadata:
                metadata['title'] = "Technical Insights"
            if 'excerpt' not in metadata:
                metadata['excerpt'] = "Explore the latest in technology and engineering."
            if 'tags' not in metadata:
                metadata['tags'] = ["Technology", "Engineering", "Innovation"]
            
            return metadata
            
        except Exception as e:
            logger.warning(f"Error parsing metadata response: {e}")
            return {
                'title': "Technical Insights",
                'excerpt': "Explore the latest in technology and engineering.",
                'tags': ["Technology", "Engineering", "Innovation"],
                'seo_title': "Technical Insights",
                'meta_description': "Explore the latest in technology and engineering."
            }
    
    def _determine_category(self, topic: TrendingTopic) -> str:
        """Determine the appropriate blog category based on the topic."""
        keyword_lower = topic.keyword.lower()
        
        if any(term in keyword_lower for term in ['ai', 'artificial intelligence', 'machine learning', 'neural', 'deep learning']):
            return "AI"
        elif any(term in keyword_lower for term in ['automation', 'automate', 'workflow', 'script', 'devops', 'ci/cd']):
            return "Automation"
        elif any(term in keyword_lower for term in ['optimization', 'performance', 'efficiency', 'scaling', 'optimize']):
            return "Optimization"
        elif any(term in keyword_lower for term in ['blockchain', 'quantum', 'edge computing', 'iot', 'vr', 'ar']):
            return "Emerging Tech"
        else:
            return "Tech Trends"

    async def generate_content(self, selected_topic: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate content from a topic dictionary (wrapper for orchestrator compatibility)
        
        Args:
            selected_topic: Dictionary with topic information
            
        Returns:
            Dictionary with generated content and metadata
        """
        try:
            # Create a mock TrendingTopic object from the dictionary
            from ..models import TrendingTopic
            
            # Convert dict to TrendingTopic object
            topic_obj = TrendingTopic(
                keyword=selected_topic['title'],
                trend_score=selected_topic.get('score', 1.0),
                search_volume=selected_topic.get('upvotes', 100),
                related_terms=[],
                timestamp=datetime.now(),
                source=selected_topic.get('source', 'manual'),
                source_url=selected_topic.get('url')
            )
            
            # Create ContentGenerationRequest
            from ..models import ContentGenerationRequest
            request = ContentGenerationRequest(
                topic=topic_obj,
                target_word_count=self.min_words,
                include_products=True,
                max_products=3
            )
            
            # Generate the blog post
            result = await self.generate_blog_post(request)
            
            if result.success:
                # Return in dictionary format expected by orchestrator
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
                raise Exception(f"Content generation failed: {result.error_message}")
                
        except Exception as e:
            logger.error(f"Error in generate_content wrapper: {e}")
            raise