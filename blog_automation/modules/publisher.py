"""
Publisher Module

Handles publishing blog posts to GitHub with full Git integration,
including branch creation, commits, pushes, and Pull Request creation.
"""

import logging
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any
from dataclasses import dataclass
import re

# GitHub and Git integration
try:
    from github import Github
    from git import Repo, GitCommandError
    import git
except ImportError as e:
    logging.error(f"Missing required dependencies: {e}")
    logging.error("Please install: pip install PyGithub GitPython")
    raise

logger = logging.getLogger(__name__)


class GitError(Exception):
    """Git operation specific error"""
    pass


class GitHubAPIError(Exception):
    """GitHub API specific error"""
    pass


class NetworkError(Exception):
    """Network connectivity error"""
    pass


@dataclass
class PublishingResult:
    """Result of a publishing operation."""
    success: bool
    file_path: Optional[str] = None
    commit_sha: Optional[str] = None
    branch_name: Optional[str] = None
    pr_url: Optional[str] = None
    pr_number: Optional[int] = None
    merge_sha: Optional[str] = None
    merge_status: Optional[str] = None
    merge_method: Optional[str] = None
    error_message: Optional[str] = None


class GitHubPublisher:
    """Publisher that creates branches, commits posts, and creates Pull Requests."""
    
    def __init__(self, output_dir: str = "_posts"):
        """Initialize the publisher with GitHub integration."""
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # GitHub configuration
        self.github_token = os.getenv('GITHUB_TOKEN')
        self.github_repo = os.getenv('GITHUB_REPO')
        self.auto_merge_enabled = os.getenv('GITHUB_AUTO_MERGE', 'true').lower() == 'true'
        self.merge_method = os.getenv('GITHUB_MERGE_METHOD', 'squash')
        
        if not self.github_token or not self.github_repo:
            raise ValueError("GITHUB_TOKEN and GITHUB_REPO environment variables are required")
        
        # Initialize GitHub client
        try:
            self.github_client = Github(self.github_token)
            self.repo = self.github_client.get_repo(self.github_repo)
        except Exception as e:
            raise GitHubAPIError(f"Failed to initialize GitHub client: {e}")
        
        # Initialize Git repository
        try:
            self.git_repo = Repo('.')
            if self.git_repo.bare:
                raise GitError("Repository is bare - cannot perform operations")
        except git.exc.InvalidGitRepositoryError:
            raise GitError("Current directory is not a Git repository")
        except Exception as e:
            raise GitError(f"Failed to initialize Git repository: {e}")
    
    def create_branch_for_post(self, post_title: str) -> str:
        """Create a timestamped temporary branch for the blog post."""
        try:
            # Generate branch name with timestamp
            timestamp = datetime.now().strftime('%Y-%m-%d-%H%M%S')
            # Sanitize post title for branch name
            title_slug = re.sub(r'[^a-zA-Z0-9-]', '-', post_title.lower())[:30]
            branch_name = f"blog-post-{timestamp}-{title_slug}"
            
            # Ensure we're on main branch and it's up to date
            main_branch = self.git_repo.heads.main
            main_branch.checkout()
            
            # Create new branch
            new_branch = self.git_repo.create_head(branch_name)
            new_branch.checkout()
            
            logger.info(f"Created and checked out branch: {branch_name}")
            return branch_name
            
        except Exception as e:
            raise GitError(f"Failed to create branch: {e}")
    
    def commit_post(self, file_path: str, post_title: str) -> str:
        """Stage and commit the blog post with specified message format."""
        try:
            # Stage the file
            self.git_repo.index.add([file_path])
            
            # Create commit with specified format
            commit_message = f"Added {post_title}"
            commit = self.git_repo.index.commit(commit_message)
            
            logger.info(f"Committed post with message: {commit_message}")
            return commit.hexsha
            
        except Exception as e:
            raise GitError(f"Failed to commit post: {e}")
    
    def push_branch(self, branch_name: str) -> None:
        """Push the temporary branch to GitHub repository."""
        try:
            # Get the remote origin
            origin = self.git_repo.remote('origin')
            
            # Push the branch with retry logic
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    origin.push(branch_name)
                    logger.info(f"Successfully pushed branch: {branch_name}")
                    return
                except Exception as e:
                    if attempt < max_retries - 1:
                        wait_time = 2 ** attempt
                        logger.warning(f"Push attempt {attempt + 1} failed, retrying in {wait_time}s: {e}")
                        time.sleep(wait_time)
                    else:
                        raise
            
        except Exception as e:
            raise GitError(f"Failed to push branch {branch_name}: {e}")
    
    def create_pull_request(self, branch_name: str, post_title: str) -> tuple[str, int]:
        """Create a Pull Request using PyGithub."""
        try:
            # Create PR with retry logic
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    pr_title = f"Add blog post: {post_title}"
                    pr_body = f"Automated blog post generation\n\n- Title: {post_title}\n- Branch: {branch_name}\n- Generated: {datetime.now().isoformat()}"
                    
                    pull_request = self.repo.create_pull(
                        title=pr_title,
                        body=pr_body,
                        head=branch_name,
                        base="main"
                    )
                    
                    logger.info(f"Created Pull Request #{pull_request.number}: {pull_request.html_url}")
                    return pull_request.html_url, pull_request.number
                    
                except Exception as e:
                    if attempt < max_retries - 1:
                        wait_time = 2 ** attempt
                        logger.warning(f"PR creation attempt {attempt + 1} failed, retrying in {wait_time}s: {e}")
                        time.sleep(wait_time)
                    else:
                        raise
                        
        except Exception as e:
            raise GitHubAPIError(f"Failed to create Pull Request: {e}")
    
    def merge_pull_request(self, pr_number: int, post_title: str) -> tuple[str, str]:
        """Merge a Pull Request using PyGithub with retry logic."""
        try:
            # Get the Pull Request
            pull_request = self.repo.get_pull(pr_number)
            
            # Create merge commit message
            merge_commit_message = f"Merge pull request #{pr_number}: {post_title}\n\nAutomated blog post merge"
            
            # Merge PR with retry logic
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    merge_result = pull_request.merge(
                        commit_message=merge_commit_message,
                        merge_method=self.merge_method
                    )
                    
                    if merge_result.merged:
                        logger.info(f"Successfully merged PR #{pr_number} using {self.merge_method} method")
                        return merge_result.sha, "merged"
                    else:
                        raise GitHubAPIError(f"Merge failed: {merge_result.message}")
                        
                except Exception as e:
                    if attempt < max_retries - 1:
                        wait_time = 2 ** attempt
                        logger.warning(f"Merge attempt {attempt + 1} failed, retrying in {wait_time}s: {e}")
                        time.sleep(wait_time)
                    else:
                        raise
                        
        except Exception as e:
            raise GitHubAPIError(f"Failed to merge Pull Request #{pr_number}: {e}")
    
    def wait_for_merge_completion(self, pr_number: int, timeout: int = 30) -> bool:
        """Wait for GitHub to complete merge processing."""
        try:
            start_time = time.time()
            while time.time() - start_time < timeout:
                pull_request = self.repo.get_pull(pr_number)
                if pull_request.merged:
                    return True
                time.sleep(2)
            
            logger.warning(f"Timeout waiting for PR #{pr_number} merge completion")
            return False
            
        except Exception as e:
            logger.warning(f"Error checking merge completion for PR #{pr_number}: {e}")
            return False
    
    def cleanup_merged_branch(self, branch_name: str) -> None:
        """Delete temporary branch after successful merge."""
        try:
            # Delete the local branch
            if branch_name in [head.name for head in self.git_repo.heads]:
                # Switch to main first
                main_branch = self.git_repo.heads.main
                main_branch.checkout()
                
                # Delete local branch
                self.git_repo.delete_head(branch_name, force=True)
                logger.info(f"Deleted local branch: {branch_name}")
            
            # Delete remote branch
            try:
                origin = self.git_repo.remote('origin')
                origin.push(f":{branch_name}")
                logger.info(f"Deleted remote branch: {branch_name}")
            except Exception as e:
                logger.warning(f"Failed to delete remote branch {branch_name}: {e}")
                
        except Exception as e:
            logger.warning(f"Failed to cleanup merged branch {branch_name}: {e}")
    
    def cleanup_on_failure(self, branch_name: str) -> None:
        """Delete temporary branch if operations fail."""
        try:
            # Switch back to main
            main_branch = self.git_repo.heads.main
            main_branch.checkout()
            
            # Delete the local branch
            if branch_name in [head.name for head in self.git_repo.heads]:
                self.git_repo.delete_head(branch_name, force=True)
                logger.info(f"Cleaned up local branch: {branch_name}")
            
            # Try to delete remote branch if it exists
            try:
                origin = self.git_repo.remote('origin')
                origin.push(f":{branch_name}")
                logger.info(f"Cleaned up remote branch: {branch_name}")
            except:
                # Remote branch might not exist, ignore
                pass
                
        except Exception as e:
            logger.warning(f"Failed to cleanup branch {branch_name}: {e}")
    
    async def publish_post(self, content: str, filename: str) -> PublishingResult:
        """
        Orchestrate the complete workflow: branch→commit→push→PR.
        
        Args:
            content: The complete blog post content
            filename: The filename for the post
            
        Returns:
            PublishingResult with complete workflow results
        """
        branch_name = None
        
        try:
            # Ensure filename has .md extension
            if not filename.endswith('.md'):
                filename += '.md'
            
            # Create full file path
            file_path = self.output_dir / filename
            
            # Extract post title from content for better branch/PR naming
            post_title = self._extract_title_from_content(content) or filename.replace('.md', '')
            
            # Step 1: Create branch
            branch_name = self.create_branch_for_post(post_title)
            
            # Step 2: Write content to file
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            # Step 3: Commit post
            commit_sha = self.commit_post(str(file_path), post_title)
            
            # Step 4: Push branch
            self.push_branch(branch_name)
            
            # Step 5: Create Pull Request
            pr_url, pr_number = self.create_pull_request(branch_name, post_title)
            
            # Step 6: Merge Pull Request (if auto-merge is enabled)
            merge_sha = None
            merge_status = "pr_created"
            
            if self.auto_merge_enabled:
                try:
                    logger.info(f"Auto-merge enabled, attempting to merge PR #{pr_number}")
                    merge_sha, merge_status = self.merge_pull_request(pr_number, post_title)
                    
                    # Wait for merge completion
                    if self.wait_for_merge_completion(pr_number):
                        # Step 7: Clean up merged branch
                        self.cleanup_merged_branch(branch_name)
                        logger.info(f"Successfully completed full automation workflow with merge")
                    else:
                        logger.warning(f"Merge completed but cleanup may have issues")
                        
                except (GitError, GitHubAPIError) as e:
                    logger.warning(f"Auto-merge failed, leaving PR open: {e}")
                    merge_status = "merge_failed"
                    # Continue workflow - PR is still created and can be merged manually
            else:
                logger.info(f"Auto-merge disabled, leaving PR open for manual merge")
            
            logger.info(f"Successfully published post with GitHub workflow")
            
            return PublishingResult(
                success=True,
                file_path=str(file_path),
                commit_sha=commit_sha,
                branch_name=branch_name,
                pr_url=pr_url,
                pr_number=pr_number,
                merge_sha=merge_sha,
                merge_status=merge_status,
                merge_method=self.merge_method if merge_sha else None
            )
            
        except (GitError, GitHubAPIError, NetworkError) as e:
            logger.error(f"Publishing workflow failed: {e}")
            if branch_name:
                self.cleanup_on_failure(branch_name)
            
            return PublishingResult(
                success=False,
                error_message=str(e),
                branch_name=branch_name
            )
        except Exception as e:
            logger.error(f"Unexpected error in publishing workflow: {e}")
            if branch_name:
                self.cleanup_on_failure(branch_name)
            
            return PublishingResult(
                success=False,
                error_message=f"Unexpected error: {e}",
                branch_name=branch_name
            )
    
    def _extract_title_from_content(self, content: str) -> Optional[str]:
        """Extract title from Jekyll front matter or first heading."""
        try:
            lines = content.split('\n')
            
            # Look for Jekyll front matter title
            in_frontmatter = False
            for line in lines:
                if line.strip() == '---':
                    in_frontmatter = not in_frontmatter
                    continue
                if in_frontmatter and line.startswith('title:'):
                    title = line.replace('title:', '').strip().strip('"\'')
                    return title
            
            # Fallback: look for first heading
            for line in lines:
                if line.startswith('# '):
                    return line[2:].strip()
                    
        except Exception:
            pass
        
        return None
    
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