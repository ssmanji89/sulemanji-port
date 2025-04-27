"""
GitHub Integration Module
Publishes generated content to GitHub Pages
"""
import os
import logging
import git
import tempfile
import shutil
from datetime import datetime
import re
from jinja2 import Template

from utils.storage import save_data, load_data

logger = logging.getLogger(__name__)

def publish_to_github(content, product):
    """
    Publish generated content to GitHub Pages
    Returns the URL of the published post
    """
    try:
        logger.info(f"Publishing content for: {content.get('title', '')}")
        
        # Get GitHub credentials from environment
        github_token = os.environ.get("GITHUB_TOKEN")
        github_repo = os.environ.get("GITHUB_REPO")
        
        if not github_token or not github_repo:
            logger.error("GitHub credentials not found in environment variables")
            return None
        
        # Create a temporary directory to clone the repository
        with tempfile.TemporaryDirectory() as temp_dir:
            logger.info(f"Cloning repository: {github_repo}")
            
            # Construct repository URL with token for authentication
            repo_url = f"https://{github_token}@github.com/{github_repo}.git"
            
            # Clone the repository
            repo = git.Repo.clone_from(repo_url, temp_dir)
            
            # Create post file
            post_path = create_post_file(temp_dir, content, product)
            
            # Commit and push changes
            logger.info("Committing and pushing changes")
            repo.git.add(post_path)
            repo.git.commit(m=f"Add post: {content.get('title', 'New post')}")
            repo.git.push()
            
            # Construct the published URL
            post_url = construct_post_url(github_repo, post_path)
            
            # Save publishing history
            save_publish_history(content, post_url)
            
            logger.info(f"Content published successfully: {post_url}")
            return post_url
    
    except Exception as e:
        logger.error(f"Error publishing to GitHub: {str(e)}")
        return None

def create_post_file(repo_dir, content, product):
    """
    Create a Jekyll post file in the repository
    Returns the path to the created file
    """
    # Create post filename based on date and title
    date_str = datetime.now().strftime("%Y-%m-%d")
    title_slug = slugify(content.get("title", "product-review"))
    filename = f"{date_str}-{title_slug}.md"
    
    # Determine posts directory
    posts_dir = os.path.join(repo_dir, "_posts")
    if not os.path.exists(posts_dir):
        os.makedirs(posts_dir)
    
    # Construct post content
    post_content = f"""---
{content['front_matter']}
---

{content['body']}

<!-- Affiliate link: {product['affiliate_link']} -->
"""
    
    # Write post to file
    post_path = os.path.join(posts_dir, filename)
    with open(post_path, "w") as f:
        f.write(post_content)
    
    return post_path.replace(repo_dir + "/", "")

def slugify(text):
    """
    Convert text to a URL-friendly slug
    """
    # Remove non-word characters, replace spaces with hyphens
    slug = re.sub(r'[^\w\s-]', '', text.lower())
    slug = re.sub(r'[\s_-]+', '-', slug)
    slug = re.sub(r'^-+|-+$', '', slug)
    return slug

def construct_post_url(github_repo, post_path):
    """
    Construct the URL to the published post
    """
    # Extract username and repo name
    parts = github_repo.split("/")
    username = parts[0]
    repo_name = parts[1]
    
    # Extract the date and slug from the post path
    post_filename = os.path.basename(post_path)
    match = re.match(r'(\d{4}-\d{2}-\d{2})-(.+)\.md', post_filename)
    
    if match:
        date_parts = match.group(1).split("-")
        slug = match.group(2)
        url = f"https://{username}.github.io/{repo_name}/{date_parts[0]}/{date_parts[1]}/{date_parts[2]}/{slug}"
    else:
        # Fallback URL
        url = f"https://{username}.github.io/{repo_name}"
    
    return url

def save_publish_history(content, post_url):
    """Save publishing history to persistent storage"""
    current_data = load_data("publish_history.json") or {}
    
    # Use timestamp as key
    current_data[datetime.now().isoformat()] = {
        "title": content["title"],
        "post_url": post_url,
        "product": content["product"]
    }
    
    # Keep only the last 100 published posts
    if len(current_data) > 100:
        sorted_keys = sorted(current_data.keys())
        for old_key in sorted_keys[:-100]:
            current_data.pop(old_key)
    
    save_data("publish_history.json", current_data) 