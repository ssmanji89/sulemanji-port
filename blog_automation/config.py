"""
Configuration management for the automated blog generation system.

Handles environment variables, API keys, and system settings with proper
security practices and validation.
"""

import os
from typing import Optional
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class Config:
    """Central configuration management with validation and defaults."""
    
    # OpenAI Configuration
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4")
    OPENAI_MAX_TOKENS: int = int(os.getenv("OPENAI_MAX_TOKENS", "4000"))
    OPENAI_TEMPERATURE: float = float(os.getenv("OPENAI_TEMPERATURE", "0.7"))
    
    # Reddit API Configuration
    REDDIT_CLIENT_ID: str = os.getenv("REDDIT_CLIENT_ID", "")
    REDDIT_CLIENT_SECRET: str = os.getenv("REDDIT_CLIENT_SECRET", "")
    REDDIT_USER_AGENT: str = os.getenv("REDDIT_USER_AGENT", "BlogAutomation/1.0")
    
    # GitHub Configuration
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")
    GITHUB_REPO: str = os.getenv("GITHUB_REPO", "")
    GITHUB_BRANCH: str = os.getenv("GITHUB_BRANCH", "main")
    
    # Amazon Affiliate Configuration
    AMAZON_STORE_ID: str = os.getenv("AMAZON_STORE_ID", "sghpgs-20")
    
    # Content Configuration
    MIN_WORD_COUNT: int = int(os.getenv("MIN_WORD_COUNT", "1200"))
    MAX_WORD_COUNT: int = int(os.getenv("MAX_WORD_COUNT", "1500"))
    TARGET_WORD_COUNT: int = int(os.getenv("TARGET_WORD_COUNT", "1400"))
    
    # Rate Limiting
    MAX_REQUESTS_PER_MINUTE: int = int(os.getenv("MAX_REQUESTS_PER_MINUTE", "60"))
    CONTENT_GENERATION_DELAY: int = int(os.getenv("CONTENT_GENERATION_DELAY", "5"))
    
    # Publishing Configuration
    POSTS_PER_DAY: int = int(os.getenv("POSTS_PER_DAY", "1"))
    POSTS_DIRECTORY: str = os.getenv("POSTS_DIRECTORY", "_posts")
    
    # Logging Configuration
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: str = os.getenv("LOG_FILE", "blog_automation.log")
    
    @classmethod
    def validate(cls) -> bool:
        """Validate that all required configuration is present and secure."""
        required_vars = [
            ("OPENAI_API_KEY", cls.OPENAI_API_KEY),
            ("REDDIT_CLIENT_ID", cls.REDDIT_CLIENT_ID),
            ("REDDIT_CLIENT_SECRET", cls.REDDIT_CLIENT_SECRET),
            ("GITHUB_TOKEN", cls.GITHUB_TOKEN),
            ("GITHUB_REPO", cls.GITHUB_REPO),
        ]
        
        missing_vars = []
        placeholder_vars = []
        
        for var_name, var_value in required_vars:
            if not var_value:
                missing_vars.append(var_name)
            elif cls._is_placeholder_value(var_value):
                placeholder_vars.append(var_name)
        
        if missing_vars:
            logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
        
        if placeholder_vars:
            logger.error(f"Placeholder values detected for: {', '.join(placeholder_vars)}")
            logger.error("Please replace placeholder values with your actual API keys")
        
        return len(missing_vars) == 0 and len(placeholder_vars) == 0
    
    @classmethod
    def _is_placeholder_value(cls, value: str) -> bool:
        """Check if a value appears to be a placeholder rather than a real API key."""
        # Check for obvious placeholder patterns at the beginning
        placeholder_prefixes = [
            "your_", "example_", "placeholder_", "test_", "demo_",
            "fake_", "dummy_", "sample_"
        ]
        
        # Check for complete placeholder values
        placeholder_values = [
            "your_openai_api_key_here",
            "your_reddit_client_id", 
            "your_reddit_client_secret",
            "your_github_personal_access_token",
            "your_github_token_here",
            "username/repository_name"
        ]
        
        value_lower = value.lower()
        
        # Check prefixes
        if any(value_lower.startswith(prefix) for prefix in placeholder_prefixes):
            return True
            
        # Check complete values
        if value_lower in placeholder_values:
            return True
            
        # Additional check: very short values that are clearly placeholders
        if len(value) < 10 and any(word in value_lower for word in ["test", "demo", "fake", "example"]):
            return True
            
        return False
    
    @classmethod
    def get_safe_config(cls) -> dict:
        """Get configuration dict with sensitive values masked."""
        return {
            "openai_model": cls.OPENAI_MODEL,
            "target_word_count": cls.TARGET_WORD_COUNT,
            "posts_per_day": cls.POSTS_PER_DAY,
            "github_repo": cls.GITHUB_REPO,
            "amazon_store_id": cls.AMAZON_STORE_ID,
            "log_level": cls.LOG_LEVEL,
            "has_openai_key": bool(cls.OPENAI_API_KEY),
            "has_reddit_credentials": bool(cls.REDDIT_CLIENT_ID and cls.REDDIT_CLIENT_SECRET),
            "has_github_token": bool(cls.GITHUB_TOKEN),
        }


def setup_logging() -> None:
    """Configure logging for the application."""
    logging.basicConfig(
        level=getattr(logging, Config.LOG_LEVEL.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(Config.LOG_FILE),
            logging.StreamHandler()
        ]
    )
    
    # Reduce noise from external libraries
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("requests").setLevel(logging.WARNING)
    logging.getLogger("aiohttp").setLevel(logging.WARNING)