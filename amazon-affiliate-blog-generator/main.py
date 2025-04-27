#!/usr/bin/env python3
"""
Amazon Affiliate Blog Generator

A script to generate blog posts with Amazon product recommendations
and affiliate links for various topics.
"""

import os
import logging
import json
import argparse
from datetime import datetime
from modules.product_finder import ProductFinder
from modules.content_generator import ContentGenerator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("blog_generator.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

def setup_output_directories(output_dir):
    """
    Create output directories if they don't exist.
    
    Args:
        output_dir (str): Base output directory
    """
    directories = [
        output_dir,
        os.path.join(output_dir, "markdown"),
        os.path.join(output_dir, "html")
    ]
    
    for directory in directories:
        if not os.path.exists(directory):
            os.makedirs(directory)
            logger.info(f"Created directory: {directory}")

def generate_blog(topic, affiliate_tag, output_dir, max_products=5, keyword_density=2.0):
    """
    Generate a complete blog post for a given topic.
    
    Args:
        topic (str): Blog topic to generate content for
        affiliate_tag (str): Amazon affiliate tag
        output_dir (str): Directory to save the output
        max_products (int): Maximum number of products to include
        keyword_density (float): Target keyword density for SEO
        
    Returns:
        dict: Blog post data including paths to saved files
    """
    try:
        logger.info(f"Starting blog generation for topic: {topic}")
        
        # Step 1: Find products related to the topic
        product_finder = ProductFinder(affiliate_tag=affiliate_tag, max_products_per_topic=max_products)
        products = product_finder.find_products(topic)
        
        if not products:
            logger.warning(f"No products found for topic: {topic}")
            return None
            
        logger.info(f"Found {len(products)} products for topic: {topic}")
        
        # Step 2: Generate blog content
        content_generator = ContentGenerator()
        blog_post = content_generator.generate_blog_post(
            topic=topic,
            products=products,
            keyword_density=keyword_density
        )
        
        # Step 3: Save the generated content
        setup_output_directories(output_dir)
        
        # Save markdown version
        markdown_path = os.path.join(output_dir, "markdown", f"{blog_post['slug']}.md")
        with open(markdown_path, 'w', encoding='utf-8') as f:
            f.write(blog_post['markdown_content'])
            
        # Save HTML version
        html_path = os.path.join(output_dir, "html", f"{blog_post['slug']}.html")
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(blog_post['html_content'])
            
        # Save metadata
        metadata_path = os.path.join(output_dir, f"{blog_post['slug']}.json")
        metadata = {
            "title": blog_post['title'],
            "meta_description": blog_post['meta_description'],
            "keywords": blog_post['keywords'],
            "topic": blog_post['topic'],
            "slug": blog_post['slug'],
            "date": blog_post['date'],
            "product_count": blog_post['product_count'],
            "markdown_file": markdown_path,
            "html_file": html_path,
            "generation_timestamp": datetime.now().isoformat()
        }
        
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2)
            
        logger.info(f"Successfully generated blog post: {blog_post['title']}")
        logger.info(f"Files saved to: {output_dir}")
        
        return {
            "metadata": metadata,
            "markdown_path": markdown_path,
            "html_path": html_path,
            "metadata_path": metadata_path
        }
        
    except Exception as e:
        logger.error(f"Error generating blog for topic '{topic}': {str(e)}", exc_info=True)
        return None

def generate_from_topic_list(topic_file, affiliate_tag, output_dir, max_products=5):
    """
    Generate multiple blog posts from a list of topics in a file.
    
    Args:
        topic_file (str): Path to file containing topic list (one per line)
        affiliate_tag (str): Amazon affiliate tag
        output_dir (str): Directory to save the output
        max_products (int): Maximum number of products per blog post
        
    Returns:
        list: Results of each blog generation attempt
    """
    try:
        with open(topic_file, 'r', encoding='utf-8') as f:
            topics = [line.strip() for line in f if line.strip()]
            
        logger.info(f"Loaded {len(topics)} topics from {topic_file}")
        
        results = []
        for i, topic in enumerate(topics):
            logger.info(f"Processing topic {i+1}/{len(topics)}: {topic}")
            result = generate_blog(
                topic=topic,
                affiliate_tag=affiliate_tag,
                output_dir=output_dir,
                max_products=max_products
            )
            results.append({
                "topic": topic,
                "success": result is not None,
                "result": result
            })
            
        # Create a summary report
        summary = {
            "total_topics": len(topics),
            "successful": sum(1 for r in results if r["success"]),
            "failed": sum(1 for r in results if not r["success"]),
            "timestamp": datetime.now().isoformat(),
            "results": results
        }
        
        summary_path = os.path.join(output_dir, f"generation_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
        with open(summary_path, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2)
            
        logger.info(f"Generation complete. Summary saved to: {summary_path}")
        return results
        
    except Exception as e:
        logger.error(f"Error in batch generation: {str(e)}", exc_info=True)
        return []

def main():
    """
    Main entry point for the blog generator script.
    Parses command line arguments and executes the generation process.
    """
    parser = argparse.ArgumentParser(description="Generate Amazon affiliate blog posts")
    
    # Define command-line arguments
    parser.add_argument("--topic", type=str, help="Single topic to generate a blog post for")
    parser.add_argument("--topic-file", type=str, help="File containing a list of topics (one per line)")
    parser.add_argument("--affiliate-tag", type=str, required=True, help="Amazon affiliate tag")
    parser.add_argument("--output-dir", type=str, default="output", help="Directory to save generated content")
    parser.add_argument("--max-products", type=int, default=5, help="Maximum number of products per blog post")
    parser.add_argument("--keyword-density", type=float, default=2.0, help="Target keyword density percentage")
    
    args = parser.parse_args()
    
    # Validate arguments
    if not args.topic and not args.topic_file:
        parser.error("Either --topic or --topic-file must be provided")
        
    if args.topic and args.topic_file:
        parser.error("Only one of --topic or --topic-file should be provided")
        
    # Process the request
    if args.topic:
        # Generate a single blog post
        result = generate_blog(
            topic=args.topic,
            affiliate_tag=args.affiliate_tag,
            output_dir=args.output_dir,
            max_products=args.max_products,
            keyword_density=args.keyword_density
        )
        
        if result:
            print(f"Blog post generated successfully!")
            print(f"Markdown file: {result['markdown_path']}")
            print(f"HTML file: {result['html_path']}")
            print(f"Metadata file: {result['metadata_path']}")
        else:
            print(f"Failed to generate blog post for topic: {args.topic}")
            
    else:
        # Generate multiple blog posts from a topic file
        results = generate_from_topic_list(
            topic_file=args.topic_file,
            affiliate_tag=args.affiliate_tag,
            output_dir=args.output_dir,
            max_products=args.max_products
        )
        
        successful = sum(1 for r in results if r["success"])
        print(f"Generated {successful}/{len(results)} blog posts")
        print(f"Output directory: {os.path.abspath(args.output_dir)}")

if __name__ == "__main__":
    main() 