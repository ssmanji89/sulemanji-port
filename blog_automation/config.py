"""
Configuration settings for the blog automation system.
"""

import os
import logging
import sys
from typing import List, Dict, Any
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)


class Config:
    """Configuration class for blog automation system."""
    
    def __init__(self):
        self.load_config()
    
    def load_config(self):
        """Load configuration from environment variables"""
        self.config = {
            # OpenAI Configuration
            'openai': {
                'api_key': os.getenv('OPENAI_API_KEY'),
                'model': os.getenv('OPENAI_MODEL', 'gpt-4'),
                'temperature': float(os.getenv('OPENAI_TEMPERATURE', '0.8')),
                'max_tokens': int(os.getenv('OPENAI_MAX_TOKENS', '2000'))
            },
            
            # Reddit Configuration
            'reddit': {
                'client_id': os.getenv('REDDIT_CLIENT_ID'),
                'client_secret': os.getenv('REDDIT_CLIENT_SECRET'),
                'user_agent': os.getenv('REDDIT_USER_AGENT', 'blog_automation/1.0')
            },
            
            # Google Custom Search Configuration
            'google_custom_search': {
                'api_key': os.getenv('GOOGLE_CUSTOM_SEARCH_API_KEY', 'AIzaSyD_Ns2nCerrj5aZTV3Tq9SVGK6MPBpLNoI'),
                'search_engine_id': os.getenv('GOOGLE_CUSTOM_SEARCH_ENGINE_ID', '21e7af27cedc940a7'),
                'enabled': os.getenv('USE_GOOGLE_CUSTOM_SEARCH', 'true').lower() == 'true'
            },
            
            # Amazon Affiliate Configuration
            'amazon': {
                'affiliate_tag': os.getenv('AMAZON_AFFILIATE_TAG', 'sulemanjicoc-20'),
                'fallback_to_scraping': os.getenv('AMAZON_FALLBACK_SCRAPING', 'true').lower() == 'true'
            },
            
            # Blog Configuration
            'blog': {
                'output_dir': os.getenv('BLOG_OUTPUT_DIR', '_posts'),
                'author': os.getenv('BLOG_AUTHOR', 'Suleman Anji'),
                'site_url': os.getenv('BLOG_SITE_URL', 'https://sulemanji.com')
            },
            
            # Content Generation
            'content': {
                'min_words': int(os.getenv('CONTENT_MIN_WORDS', '600')),
                'max_words': int(os.getenv('CONTENT_MAX_WORDS', '1200')),
                'include_reddit_attribution': os.getenv('INCLUDE_REDDIT_ATTRIBUTION', 'true').lower() == 'true'
            },
            
            # Trend Discovery
            'trends': {
                'reddit_subreddits': [
                    'programming', 'technology', 'MachineLearning', 'artificial',
                    'Python', 'javascript', 'webdev', 'software', 'coding',
                    'computerscience', 'datascience', 'devops', 'cybersecurity'
                ],
                'google_trends_keywords': [
                    'artificial intelligence', 'machine learning', 'automation',
                    'cloud computing', 'cybersecurity', 'blockchain', 'data science',
                    'DevOps', 'API development'
                ],
                'max_topics': int(os.getenv('MAX_TOPICS', '5'))
            }
        }
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value using dot notation"""
        keys = key.split('.')
        value = self.config
        
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default
        
        return value
    
    def validate(self) -> bool:
        """Validate that required configuration is present"""
        required_configs = [
            'openai.api_key',
            'reddit.client_id',
            'reddit.client_secret'
        ]
        
        missing_configs = []
        for config_key in required_configs:
            if not self.get(config_key):
                missing_configs.append(config_key)
        
        if missing_configs:
            logger.error(f"Missing required configuration: {', '.join(missing_configs)}")
            return False
        
        # Validate Google Custom Search if enabled
        if self.get('google_custom_search.enabled', False):
            if not self.get('google_custom_search.api_key'):
                logger.warning("Google Custom Search enabled but API key missing - will fallback to scraping")
            elif not self.get('google_custom_search.search_engine_id'):
                logger.warning("Google Custom Search enabled but search engine ID missing - will fallback to scraping")
        
        logger.info("Configuration validation passed")
        return True
    
    def get_all(self) -> Dict[str, Any]:
        """Get all configuration"""
        return self.config.copy()

# Global config instance
config = Config()

def setup_logging(log_file: str = "blog_automation.log", level: int = logging.INFO):
    """Setup logging configuration for the blog automation system."""
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Setup file handler
    file_handler = logging.FileHandler(log_file)
    file_handler.setFormatter(formatter)
    file_handler.setLevel(level)
    
    # Setup console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(level)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    
    # Clear existing handlers to avoid duplicates
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Add our handlers
    root_logger.addHandler(file_handler)
    root_logger.addHandler(console_handler)
    
    logger.info("Logging system initialized") 