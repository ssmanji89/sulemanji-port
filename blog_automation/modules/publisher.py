"""
Publishing Module

Handles automated publishing to GitHub repository with duplicate detection
and comprehensive error handling.
"""

import asyncio
import logging
from typing import Optional, List
import base64
from github import Github, GithubException
from ..models import BlogPost, PublishingResult
from ..config import Config

logger = logging.getLogger(__name__)


class GitHubPublisher:
    """Publishes blog posts to GitHub repository."""
    
    def __init__(self):
        """Initialize the GitHub publisher."""
        self.github = Github(Config.GITHUB_TOKEN)
        self.repo = None
        self._setup_repository()
    
    def _setup_repository(self) -> None:
        """Setup GitHub repository connection."""
        try:
            self.repo = self.github.get_repo(Config.GITHUB_REPO)
            logger.info(f"Connected to repository: {Config.GITHUB_REPO}")
        except Exception as e:
            logger.error(f"Failed to connect to repository: {e}")
            raise
    
    async def publish_post(self, content: str, filename: str, commit_message: Optional[str] = None) -> PublishingResult:
        """
        Publish a blog post to the GitHub repository.
        
        Args:
            content: Complete Jekyll markdown content
            filename: Target filename for the post
            commit_message: Optional custom commit message
            
        Returns:
            PublishingResult with success status and details
        """
        logger.info(f"Publishing post: {filename}")
        
        try:
            # Check for duplicates
            if await self._check_duplicate_post(filename):
                return PublishingResult(
                    success=False,
                    error_message=f"Duplicate post detected: {filename}",
                    duplicate_detected=True
                )
            
            # Prepare file path
            file_path = f"{Config.POSTS_DIRECTORY}/{filename}"
            
            # Create commit message
            if not commit_message:
                commit_message = f"Add new blog post: {filename}"
            
            # Create the file in the repository
            result = self.repo.create_file(
                path=file_path,
                message=commit_message,
                content=content,
                branch=Config.GITHUB_BRANCH
            )
            
            logger.info(f"Successfully published post: {filename}")
            return PublishingResult(
                success=True,
                file_path=file_path,
                commit_sha=result['commit'].sha
            )
            
        except GithubException as e:
            logger.error(f"GitHub API error publishing post: {e}")
            return PublishingResult(
                success=False,
                error_message=f"GitHub API error: {e.data.get('message', str(e))}"
            )
        except Exception as e:
            logger.error(f"Error publishing post: {e}")
            return PublishingResult(
                success=False,
                error_message=str(e)
            )    
    async def _check_duplicate_post(self, filename: str) -> bool:
        """Check if a post with the same filename already exists."""
        try:
            file_path = f"{Config.POSTS_DIRECTORY}/{filename}"
            
            # Try to get the file - if it exists, it's a duplicate
            try:
                self.repo.get_contents(file_path, ref=Config.GITHUB_BRANCH)
                logger.warning(f"Duplicate post detected: {filename}")
                return True
            except GithubException as e:
                if e.status == 404:
                    # File doesn't exist, not a duplicate
                    return False
                else:
                    # Other error, re-raise
                    raise
                    
        except Exception as e:
            logger.error(f"Error checking for duplicate post: {e}")
            # In case of error, assume no duplicate to avoid blocking
            return False
    
    async def list_existing_posts(self) -> List[str]:
        """List all existing posts in the repository."""
        try:
            contents = self.repo.get_contents(Config.POSTS_DIRECTORY, ref=Config.GITHUB_BRANCH)
            
            # Filter for markdown files
            post_files = [
                item.name for item in contents 
                if item.name.endswith('.md') and item.type == 'file'
            ]
            
            logger.info(f"Found {len(post_files)} existing posts")
            return post_files
            
        except GithubException as e:
            if e.status == 404:
                logger.info("Posts directory doesn't exist yet")
                return []
            else:
                logger.error(f"Error listing existing posts: {e}")
                return []
        except Exception as e:
            logger.error(f"Error listing existing posts: {e}")
            return []
    
    async def update_post(self, content: str, filename: str, commit_message: Optional[str] = None) -> PublishingResult:
        """Update an existing blog post."""
        try:
            file_path = f"{Config.POSTS_DIRECTORY}/{filename}"
            
            # Get the existing file
            existing_file = self.repo.get_contents(file_path, ref=Config.GITHUB_BRANCH)
            
            # Create commit message
            if not commit_message:
                commit_message = f"Update blog post: {filename}"
            
            # Update the file
            result = self.repo.update_file(
                path=file_path,
                message=commit_message,
                content=content,
                sha=existing_file.sha,
                branch=Config.GITHUB_BRANCH
            )
            
            logger.info(f"Successfully updated post: {filename}")
            return PublishingResult(
                success=True,
                file_path=file_path,
                commit_sha=result['commit'].sha
            )
            
        except Exception as e:
            logger.error(f"Error updating post: {e}")
            return PublishingResult(
                success=False,
                error_message=str(e)
            )