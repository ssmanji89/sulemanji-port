"""
Content Generation Module
Generates blog post content using Claude API
"""
import os
import logging
import json
from datetime import datetime
import anthropic
from jinja2 import Template

from utils.storage import save_data, load_data

logger = logging.getLogger(__name__)

def generate_content(product):
    """
    Generate blog post content for a product using Claude
    Returns a dictionary with the generated content and metadata
    """
    try:
        logger.info(f"Generating content for product: {product.get('title', '')}")
        
        # Get Claude API key from environment
        api_key = os.environ.get("LLM_API_KEY")
        model = os.environ.get("LLM_MODEL", "anthropic/claude-3-5-sonnet-20240620")
        
        if not api_key:
            logger.error("Claude API key not found in environment variables")
            return None
        
        # Initialize Claude client
        client = anthropic.Anthropic(api_key=api_key)
        
        # Prepare prompt for Claude
        prompt = create_prompt(product)
        
        # Generate content with Claude
        logger.info("Calling Claude API to generate content")
        response = client.messages.create(
            model=model,
            max_tokens=4000,
            temperature=0.7,
            system="You are an expert product reviewer and content creator specializing in Amazon product reviews. Your task is to create engaging, informative, and SEO-friendly blog posts that naturally incorporate affiliate links.",
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        # Extract generated content
        generated_text = response.content[0].text
        
        # Parse the generated content to separate front matter and body
        content_parts = parse_generated_content(generated_text)
        
        # Prepare final content dictionary
        content = {
            "title": product.get("title", ""),
            "search_term": product.get("search_term", ""),
            "front_matter": content_parts["front_matter"],
            "body": content_parts["body"],
            "product": {
                "asin": product.get("asin", ""),
                "title": product.get("title", ""),
                "price": product.get("price", 0),
                "affiliate_link": product.get("affiliate_link", "")
            },
            "timestamp": datetime.now().isoformat()
        }
        
        # Save generated content to history
        save_generated_content(content)
        
        return content
    
    except Exception as e:
        logger.error(f"Error generating content: {str(e)}")
        return None

def create_prompt(product):
    """
    Create a prompt for Claude based on product information
    """
    # Load prompt template
    with open("templates/prompt_template.txt", "r") as f:
        template_text = f.read()
    
    # Render template with product data
    template = Template(template_text)
    prompt = template.render(
        product_title=product.get("title", ""),
        product_description=product.get("description", ""),
        product_price=product.get("price", ""),
        product_rating=product.get("rating", ""),
        product_reviews=product.get("review_count", ""),
        product_category=product.get("category", ""),
        affiliate_link=product.get("affiliate_link", ""),
        search_term=product.get("search_term", "")
    )
    
    return prompt

def parse_generated_content(text):
    """
    Parse the generated content to separate front matter and body
    """
    # Check if content has Jekyll front matter (between --- markers)
    parts = text.split("---", 2)
    
    if len(parts) >= 3:
        # Content has front matter
        front_matter = parts[1].strip()
        body = parts[2].strip()
    else:
        # No front matter, generate it
        front_matter = """
layout: post
title: "{title}"
date: {date}
categories: [product-review]
tags: [amazon, product-review]
""".format(
            title=extract_title(text),
            date=datetime.now().strftime("%Y-%m-%d %H:%M:%S %z")
        )
        body = text
    
    return {
        "front_matter": front_matter,
        "body": body
    }

def extract_title(text):
    """
    Extract a title from the content if not explicitly provided
    """
    # Simple heuristic: use the first line if it looks like a title
    lines = text.strip().split("\n")
    if lines and lines[0].startswith("# "):
        return lines[0][2:].strip()
    else:
        return "Product Review"

def save_generated_content(content):
    """Save generated content to persistent storage"""
    current_data = load_data("generated_content.json") or {}
    
    # Use timestamp as key
    current_data[content["timestamp"]] = {
        "title": content["title"],
        "search_term": content["search_term"],
        "product": content["product"]
    }
    
    # Keep only the last 100 generated contents
    if len(current_data) > 100:
        sorted_keys = sorted(current_data.keys())
        for old_key in sorted_keys[:-100]:
            current_data.pop(old_key)
    
    save_data("generated_content.json", current_data) 