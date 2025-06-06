"""
Publisher Module

Handles publishing blog posts to files and potentially other platforms.
"""

import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class PublishingResult:
    """Result of a publishing operation."""
    success: bool
    file_path: Optional[str] = None
    commit_sha: Optional[str] = None
    error_message: Optional[str] = None


class GitHubPublisher:
    """Publisher that saves blog posts to files in the Jekyll _posts directory."""
    
    def __init__(self, output_dir: str = "_posts"):
        """Initialize the publisher with output directory."""
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
    
    async def publish_post(self, content: str, filename: str) -> PublishingResult:
        """
        Publish a blog post by saving it to a file.
        
        Args:
            content: The complete blog post content
            filename: The filename for the post
            
        Returns:
            PublishingResult with success status and file path
        """
        try:
            # Ensure filename has .md extension
            if not filename.endswith('.md'):
                filename += '.md'
            
            # Create full file path
            file_path = self.output_dir / filename
            
            # Write content to file
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            logger.info(f"Successfully published post: {filename}")
            
            return PublishingResult(
                success=True,
                file_path=str(file_path),
                commit_sha=f"local_{int(datetime.now().timestamp())}"  # Mock commit SHA
            )
            
        except Exception as e:
            logger.error(f"Failed to publish post {filename}: {e}")
            return PublishingResult(
                success=False,
                error_message=str(e)
            )
    
    def get_recent_posts(self, limit: int = 10) -> list:
        """Get a list of recent posts."""
        try:
            posts = []
            for file_path in self.output_dir.glob("*.md"):
                stat = file_path.stat()
                posts.append({
                    "filename": file_path.name,
                    "path": str(file_path),
                    "created": datetime.fromtimestamp(stat.st_ctime),
                    "modified": datetime.fromtimestamp(stat.st_mtime),
                    "size": stat.st_size
                })
            
            # Sort by creation time, newest first
            posts.sort(key=lambda x: x["created"], reverse=True)
            
            return posts[:limit]
            
        except Exception as e:
            logger.error(f"Failed to get recent posts: {e}")
            return [] 