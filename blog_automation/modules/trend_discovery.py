"""
Trend Discovery Module

Discovers trending topics from Reddit and Google Trends for content generation.
Implements comprehensive error handling and rate limiting as specified.
"""

import asyncio
import logging
import random
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import aiohttp
import praw
from pytrends.request import TrendReq
from ..models import TrendingTopic, TrendSource
from ..config import config

logger = logging.getLogger(__name__)


class TrendDiscovery:
    """Discovers trending topics from multiple sources."""
    
    def __init__(self):
        """Initialize trend discovery with API clients."""
        self.reddit = None
        self.pytrends = None
        self._setup_clients()
    
    def _setup_clients(self) -> None:
        """Setup API clients with error handling."""
        try:
            # Setup Reddit client
            self.reddit = praw.Reddit(
                client_id=config.get('reddit.client_id'),
                client_secret=config.get('reddit.client_secret'),
                user_agent=config.get('reddit.user_agent')
            )
            logger.info("Reddit client initialized successfully")
            
            # Setup Google Trends client
            self.pytrends = TrendReq(hl='en-US', tz=360)
            logger.info("Google Trends client initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to setup API clients: {e}")
            raise
    
    async def discover_trending_topics(self, max_topics: int = 10) -> List[TrendingTopic]:
        """
        Discover trending topics from all sources.
        
        Args:
            max_topics: Maximum number of topics to return
            
        Returns:
            List of trending topics sorted by final score with randomization
        """
        logger.info(f"Starting trend discovery for {max_topics} topics")
        
        try:
            # Gather topics from all sources concurrently
            reddit_topics, trends_topics = await asyncio.gather(
                self._get_reddit_trends(),
                self._get_google_trends(),
                return_exceptions=True
            )
            
            # Handle exceptions from concurrent execution
            all_topics = []
            
            if isinstance(reddit_topics, list):
                all_topics.extend(reddit_topics)
                logger.info(f"Retrieved {len(reddit_topics)} topics from Reddit")
            else:
                logger.error(f"Reddit trends failed: {reddit_topics}")
            
            if isinstance(trends_topics, list):
                all_topics.extend(trends_topics)
                logger.info(f"Retrieved {len(trends_topics)} topics from Google Trends")
            else:
                logger.error(f"Google Trends failed: {trends_topics}")
            
            # Sort by final score but add randomization to prevent repetition
            sorted_topics = sorted(all_topics, key=lambda x: x.final_score, reverse=True)
            
            # Get the top candidates (more than requested to allow for randomization)
            top_candidates = sorted_topics[:max_topics * 3]  # 3x buffer for randomization
            
            # If we have enough candidates, randomly select from top candidates
            if len(top_candidates) >= max_topics:
                # Weight selection towards higher scores but allow randomization
                weights = [topic.final_score for topic in top_candidates]
                result = random.choices(top_candidates, weights=weights, k=max_topics)
                # Remove duplicates while preserving randomization
                seen = set()
                final_result = []
                for topic in result:
                    topic_key = (topic.keyword, topic.source)
                    if topic_key not in seen and len(final_result) < max_topics:
                        seen.add(topic_key)
                        final_result.append(topic)
                result = final_result
            else:
                # Not enough candidates, use all available
                result = top_candidates[:max_topics]
            
            logger.info(f"Discovered {len(result)} trending topics (randomized selection)")
            return result
            
        except Exception as e:
            logger.error(f"Error in trend discovery: {e}")
            raise
    
    async def _get_reddit_trends(self) -> List[TrendingTopic]:
        """Get trending topics from Reddit technology subreddits."""
        topics = []
        
        try:
            # Target subreddits for tech content
            subreddits = ['technology', 'programming', 'MachineLearning', 'artificial', 'automation']
            
            for subreddit_name in subreddits:
                try:
                    subreddit = self.reddit.subreddit(subreddit_name)
                    
                    # Get hot posts from the last 24 hours - collect more for randomization
                    posts = list(subreddit.hot(limit=40))  # Increased from 20 to 40
                    
                    # Randomize the order to avoid always picking the same top posts
                    random.shuffle(posts)
                    
                    posts_processed = 0
                    for post in posts:
                        if posts_processed >= 20:  # Limit to 20 per subreddit
                            break
                            
                        # Filter for recent posts
                        post_time = datetime.fromtimestamp(post.created_utc)
                        if datetime.now() - post_time > timedelta(days=1):
                            continue
                        
                        # Calculate trend score based on engagement
                        trend_score = self._calculate_reddit_score(post)
                        
                        if trend_score > 0.3:  # Minimum threshold
                            # Construct Reddit URL
                            reddit_url = f"https://www.reddit.com{post.permalink}"
                            
                            topic = TrendingTopic(
                                keyword=post.title[:100],  # Truncate long titles
                                trend_score=trend_score,
                                search_volume=post.score,  # Use Reddit score as proxy
                                related_terms=self._extract_keywords(post.title),
                                timestamp=datetime.now(),
                                source=f"reddit_{subreddit_name}",
                                source_url=reddit_url
                            )
                            topics.append(topic)
                            posts_processed += 1
                    
                    # Rate limiting
                    await asyncio.sleep(1)
                    
                except Exception as e:
                    logger.warning(f"Error processing subreddit {subreddit_name}: {e}")
                    continue
            
            # Shuffle the final topics list for additional randomization
            random.shuffle(topics)
            
            logger.info(f"Retrieved {len(topics)} topics from Reddit")
            return topics
            
        except Exception as e:
            logger.error(f"Error getting Reddit trends: {e}")
            return []
    
    async def _get_google_trends(self) -> List[TrendingTopic]:
        """Get trending topics from Google Trends."""
        topics = []
        
        try:
            # Tech-related keywords to check trends for
            tech_keywords = [
                'artificial intelligence', 'machine learning', 'automation',
                'cloud computing', 'cybersecurity', 'blockchain',
                'data science', 'DevOps', 'API development'
            ]
            
            for keyword in tech_keywords:
                try:
                    # Get interest over time for the keyword
                    self.pytrends.build_payload([keyword], timeframe='now 7-d')
                    interest_data = self.pytrends.interest_over_time()
                    
                    if not interest_data.empty:
                        # Calculate trend score from recent interest
                        recent_interest = interest_data[keyword].tail(3).mean()
                        trend_score = min(recent_interest / 100.0, 1.0)
                        
                        if trend_score > 0.2:  # Minimum threshold
                            # Get related queries for additional context
                            related_queries = self.pytrends.related_queries()
                            related_terms = []
                            
                            if keyword in related_queries and related_queries[keyword]['top'] is not None:
                                related_terms = related_queries[keyword]['top']['query'].head(5).tolist()
                            
                            topic = TrendingTopic(
                                keyword=keyword,
                                trend_score=trend_score,
                                search_volume=int(recent_interest * 1000),  # Approximate volume
                                related_terms=related_terms,
                                timestamp=datetime.now(),
                                source=TrendSource.GOOGLE_TRENDS.value
                            )
                            topics.append(topic)
                    
                    # Rate limiting for Google Trends
                    await asyncio.sleep(2)
                    
                except Exception as e:
                    logger.warning(f"Error processing keyword {keyword}: {e}")
                    continue
            
            logger.info(f"Retrieved {len(topics)} topics from Google Trends")
            return topics
            
        except Exception as e:
            logger.error(f"Error getting Google Trends: {e}")
            return []
    
    def _calculate_reddit_score(self, post) -> float:
        """Calculate trend score for a Reddit post."""
        try:
            # Factors: upvotes, comments, upvote ratio, recency
            upvotes = max(post.score, 0)
            comments = max(post.num_comments, 0)
            ratio = getattr(post, 'upvote_ratio', 0.5)
            
            # Normalize scores
            upvote_score = min(upvotes / 1000.0, 1.0)
            comment_score = min(comments / 100.0, 1.0)
            
            # Weighted combination
            trend_score = (upvote_score * 0.4) + (comment_score * 0.3) + (ratio * 0.3)
            
            return min(trend_score, 1.0)
            
        except Exception as e:
            logger.warning(f"Error calculating Reddit score: {e}")
            return 0.0
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract relevant keywords from text."""
        try:
            # Simple keyword extraction - can be enhanced with NLP
            tech_terms = [
                'AI', 'ML', 'automation', 'cloud', 'API', 'data',
                'security', 'blockchain', 'DevOps', 'algorithm',
                'neural', 'deep learning', 'optimization'
            ]
            
            text_lower = text.lower()
            found_terms = [term for term in tech_terms if term.lower() in text_lower]
            
            return found_terms[:5]  # Limit to 5 terms
            
        except Exception as e:
            logger.warning(f"Error extracting keywords: {e}")
            return []