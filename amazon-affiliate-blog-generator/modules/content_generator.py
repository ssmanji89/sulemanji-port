"""
Content Generator Module

This module generates blog post content based on product data and templates.
"""

import logging
import random
import re
from datetime import datetime
import string
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class ContentGenerator:
    """
    A class for generating blog post content with product information.
    """
    
    def __init__(self, template_dir="templates"):
        """
        Initialize the ContentGenerator.
        
        Args:
            template_dir (str): Directory containing blog post templates
        """
        self.template_dir = template_dir
        logger.info(f"Initialized ContentGenerator with template directory: {template_dir}")
    
    def generate_blog_post(self, topic, products, keyword_density=2.0, meta_description_length=160):
        """
        Generate a complete blog post with product information.
        
        Args:
            topic (str): Main topic of the blog post
            products (list): List of product dictionaries
            keyword_density (float): Target keyword density in percentage
            meta_description_length (int): Target length for meta description
            
        Returns:
            dict: Blog post data including content and metadata
        """
        if not products:
            logger.error("No products provided for content generation")
            return None
        
        # Ensure we have at least one product
        if len(products) == 0:
            logger.warning("Empty product list, cannot generate blog post")
            return None
        
        # Get the top product (first in the list)
        top_product = products[0]
        
        # Generate title
        title = self._generate_title(topic, top_product)
        
        # Generate meta description
        meta_description = self._generate_meta_description(topic, top_product, meta_description_length)
        
        # Generate keywords
        keywords = self._generate_keywords(topic, products)
        
        # Create a slug from the title
        slug = self._create_slug(title)
        
        # Generate the blog post content
        content = self._generate_content(topic, products, keyword_density)
        
        # Convert to HTML
        html_content = self._markdown_to_html(content)
        
        # Create blog post object
        blog_post = {
            "title": title,
            "meta_description": meta_description,
            "keywords": keywords,
            "topic": topic,
            "slug": slug,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "product_count": len(products),
            "markdown_content": content,
            "html_content": html_content
        }
        
        logger.info(f"Generated blog post: {title}")
        return blog_post
    
    def _generate_title(self, topic, product):
        """
        Generate a blog post title.
        
        Args:
            topic (str): Main topic
            product (dict): Top product information
            
        Returns:
            str: Blog post title
        """
        # Title templates
        templates = [
            f"Top 10 Best {topic} Products in {datetime.now().year}",
            f"The Best {topic} You Can Buy: Reviews & Buying Guide",
            f"Complete Guide to Choosing the Best {topic} - Expert Reviews",
            f"{datetime.now().year} Guide: Finding the Perfect {topic} for Your Needs",
            f"Best {topic} Brands: Top Products Compared and Reviewed"
        ]
        
        # Select a random template
        title = random.choice(templates)
        
        # Ensure the title is capitalized correctly
        title = ' '.join(word.capitalize() if not word.isupper() else word 
                         for word in title.split())
        
        return title
    
    def _generate_meta_description(self, topic, product, max_length=160):
        """
        Generate a meta description for the blog post.
        
        Args:
            topic (str): Main topic
            product (dict): Top product information
            max_length (int): Maximum length for meta description
            
        Returns:
            str: Meta description
        """
        # Meta description templates
        templates = [
            f"Looking for the best {topic}? Our comprehensive guide reviews the top products and helps you find the perfect one for your needs.",
            f"Discover the best {topic} products of {datetime.now().year}. We've tested and reviewed the top options to help you make the right choice.",
            f"Our experts have researched and compared the best {topic} products on the market. Find the perfect one with our detailed buying guide.",
            f"Compare the top-rated {topic} products with our in-depth reviews and buying guide. Find the best option for your budget and needs.",
            f"Confused about which {topic} to buy? Our comprehensive guide reviews the top products to help you make an informed decision."
        ]
        
        # Select a random template
        meta_description = random.choice(templates)
        
        # Ensure it doesn't exceed max length
        if len(meta_description) > max_length:
            meta_description = meta_description[:max_length-3] + "..."
        
        return meta_description
    
    def _generate_keywords(self, topic, products):
        """
        Generate keywords for the blog post.
        
        Args:
            topic (str): Main topic
            products (list): List of product dictionaries
            
        Returns:
            list: List of keywords
        """
        keywords = [
            topic,
            f"best {topic}",
            f"{topic} review",
            f"top {topic}",
            f"{topic} buying guide",
            f"{topic} comparison"
        ]
        
        # Add brand-related keywords if available
        brands = set()
        for product in products:
            brand = self._get_product_attribute(product, 'brand')
            if brand and len(brands) < 5:  # Limit to 5 brands
                brands.add(brand)
        
        for brand in brands:
            keywords.append(f"{brand} {topic}")
        
        # Add current year
        keywords.append(f"best {topic} {datetime.now().year}")
        
        return keywords
    
    def _create_slug(self, title):
        """
        Create a URL slug from a title.
        
        Args:
            title (str): Blog post title
            
        Returns:
            str: URL slug
        """
        # Convert to lowercase
        slug = title.lower()
        
        # Replace non-alphanumeric characters with hyphens
        slug = re.sub(r'[^a-z0-9]+', '-', slug)
        
        # Remove leading and trailing hyphens
        slug = slug.strip('-')
        
        # Add date prefix for uniqueness
        date_prefix = datetime.now().strftime("%Y-%m-%d")
        slug = f"{date_prefix}-{slug}"
        
        return slug
    
    def _generate_content(self, topic, products, keyword_density=2.0):
        """
        Generate the main content for the blog post.
        
        Args:
            topic (str): Main topic
            products (list): List of product dictionaries
            keyword_density (float): Target keyword density in percentage
            
        Returns:
            str: Blog post content in markdown format
        """
        # Generate each section of the blog post
        introduction = self._generate_introduction(topic)
        buying_guide = self._generate_buying_guide(topic)
        product_reviews = self._generate_product_reviews(topic, products)
        faq_section = self._generate_faq_section(topic)
        conclusion = self._generate_conclusion(topic, products)
        
        # Combine all sections
        content = f"""# {self._generate_title(topic, products[0])}

{introduction}

## Buying Guide: What to Look for in a {topic.title()}

{buying_guide}

## Our Top Picks for the Best {topic.title()} Products

{product_reviews}

## Frequently Asked Questions About {topic.title()}

{faq_section}

## Conclusion

{conclusion}
"""
        
        # Adjust keyword density if needed
        adjusted_content = self._adjust_keyword_density(content, topic, keyword_density)
        
        return adjusted_content
    
    def _generate_introduction(self, topic):
        """
        Generate the introduction section.
        
        Args:
            topic (str): Main topic
            
        Returns:
            str: Introduction section in markdown format
        """
        # Introduction templates
        templates = [
            f"""Finding the right {topic} can be challenging with so many options available. Whether you're a beginner or an experienced user, choosing the perfect {topic} requires careful consideration of various factors.

In this comprehensive guide, we've researched and tested the top {topic} products on the market to help you make an informed decision. We'll walk you through the key features to look for, provide detailed reviews of our top picks, and answer common questions about {topic} products.""",
            
            f"""Are you in the market for a new {topic}? With countless options available online and in stores, finding the perfect {topic} for your specific needs can feel overwhelming.

That's why we've created this in-depth guide to the best {topic} products available today. Our team has carefully evaluated the top options based on performance, durability, value, and user satisfaction to bring you our honest recommendations.""",
            
            f"""The right {topic} can make a significant difference in your experience, whether you're using it for personal, professional, or recreational purposes. But with the market flooded with options, how do you know which one is truly worth your investment?

In this guide, we'll explore the top {topic} products of {datetime.now().year}, breaking down their features, pros, cons, and ideal use cases. By the end of this article, you'll have all the information you need to choose the perfect {topic} for your specific requirements."""
        ]
        
        # Select a random template
        introduction = random.choice(templates)
        
        return introduction
    
    def _generate_buying_guide(self, topic):
        """
        Generate the buying guide section.
        
        Args:
            topic (str): Main topic
            
        Returns:
            str: Buying guide section in markdown format
        """
        factors = [
            f"**Quality and Durability**: Look for {topic} products made with high-quality materials that will stand the test of time. Reading user reviews can give you insight into how well a product holds up with regular use.",
            
            f"**Features and Functionality**: Consider what specific features are important for your {topic} needs. Different models offer various features, so prioritize what matters most to you.",
            
            f"**Price Range**: Set a budget before you start shopping. Remember that the most expensive {topic} isn't always the best, and there are often excellent mid-range options that provide great value.",
            
            f"**Brand Reputation**: Established brands with positive reputations often provide better quality, customer service, and warranty options. Research the brand's history and customer satisfaction ratings.",
            
            f"**User Reviews**: Take time to read both positive and negative reviews from verified purchasers. Pay attention to comments about long-term use and any recurring issues mentioned by multiple users.",
            
            f"**Warranty and Support**: Check what kind of warranty is offered and what it covers. Good customer support can make a significant difference if you encounter issues with your {topic}.",
            
            f"**Size and Design**: Consider the physical dimensions and aesthetic appeal of the {topic}. Make sure it fits your space and complements your existing setup.",
            
            f"**Ease of Use**: The best {topic} products combine functionality with user-friendly design. Consider how intuitive the controls are and whether it comes with clear instructions."
        ]
        
        # Select a random subset of factors (5-7)
        selected_factors = random.sample(factors, random.randint(5, min(7, len(factors))))
        
        # Combine into buying guide
        buying_guide = f"""Before diving into our top picks, it's important to understand what makes a great {topic}. Here are the key factors we considered in our evaluation:

{"".join(f"{factor}\n\n" for factor in selected_factors)}
By considering these factors, you'll be well-equipped to choose a {topic} that meets your specific needs and provides the best value for your investment."""
        
        return buying_guide
    
    def _generate_product_reviews(self, topic, products):
        """
        Generate product review sections.
        
        Args:
            topic (str): Main topic
            products (list): List of product dictionaries
            
        Returns:
            str: Product reviews section in markdown format
        """
        reviews = ""
        
        for i, product in enumerate(products[:10]):  # Limit to top 10 products
            product_name = self._get_product_attribute(product, 'title', f"{topic.title()} Product {i+1}")
            
            # Get product details with fallbacks
            price = self._get_product_attribute(product, 'price', "Check price")
            brand = self._get_product_attribute(product, 'brand', "")
            rating = self._get_product_attribute(product, 'rating', None)
            review_count = self._get_product_attribute(product, 'review_count', None)
            availability = self._get_product_attribute(product, 'availability', "Available")
            asin = self._get_product_attribute(product, 'asin', "")
            url = self._get_product_attribute(product, 'url', "#")
            description = self._get_product_attribute(product, 'description', f"A quality {topic} product.")
            
            # Format features list if available
            features_section = ""
            features = self._get_product_attribute(product, 'features', [])
            if features:
                features_section = "\n\n**Key Features:**\n\n"
                for feature in features:
                    features_section += f"- {feature}\n"
            
            # Format rating if available
            rating_text = ""
            if rating and review_count:
                stars = "★" * int(rating) + "☆" * (5 - int(rating))
                rating_text = f"\n\n**Rating:** {stars} ({rating}/5 based on {review_count} reviews)"
            
            # Create the review section
            if i == 0:
                award = "**Our Top Pick Overall**"
            elif i == 1:
                award = "**Best Value Option**"
            elif i == 2:
                award = "**Premium Choice**"
            else:
                award = ""
            
            brand_text = f" by {brand}" if brand else ""
            
            review = f"""### {i+1}. {product_name}{brand_text}

{award}

![{product_name}](product_image_url_{i+1}.jpg)

{description}{features_section}{rating_text}

**Price:** {price}  
**Availability:** {availability}

[Check Price and Reviews](#{url})

"""
            reviews += review
        
        if not products:
            reviews = f"No {topic} products are currently available for review. Please check back later for updates."
        
        return reviews
    
    def _generate_faq_section(self, topic):
        """
        Generate a FAQ section for the blog post.
        
        Args:
            topic (str): Main topic
            
        Returns:
            str: FAQ section in markdown format
        """
        # Common FAQ templates
        faq_templates = [
            {
                "question": f"What should I look for when buying a {topic}?",
                "answer": f"When purchasing a {topic}, consider factors such as quality, durability, features, price, brand reputation, and warranty. Our buying guide above provides more detailed information on what to look for based on your specific needs."
            },
            {
                "question": f"How much should I expect to spend on a good {topic}?",
                "answer": f"The price range for quality {topic} products varies significantly depending on features and brand. You can find good entry-level options starting around $30-50, while premium products can range from $100-500 or more. We recommend focusing on value rather than just price - sometimes spending a bit more upfront results in a better long-term investment."
            },
            {
                "question": f"Does a higher price always mean better quality for {topic} products?",
                "answer": f"Not necessarily. While higher price often correlates with better quality and more features, the 'best' product depends on your specific needs. Sometimes mid-range options offer the best value, providing the essential features without the premium price tag. Always check reviews and compare features rather than assuming higher price equals better quality."
            },
            {
                "question": f"What are the most important features to look for in {topic} products?",
                "answer": f"The most important features depend on your specific needs, but generally look for durability, reliability, and functionality that matches your requirements. Other considerations include warranty length, customer support quality, and compatibility with other items you own. Our buying guide above provides more detailed information on key features to consider."
            },
            {
                "question": f"How often should I replace my {topic}?",
                "answer": f"The lifespan of a {topic} varies depending on the quality, frequency of use, and proper maintenance. Generally, a good quality {topic} should last between 3-7 years with proper care. Signs that you may need a replacement include decreased performance, physical damage, or when repairs become more frequent or costly."
            },
            {
                "question": f"Are brand name {topic} products worth the extra cost?",
                "answer": f"Established brands often offer better quality, reliability, and customer support, which can justify their higher prices. However, there are many excellent lesser-known brands that provide comparable quality at lower prices. We recommend researching specific models rather than buying solely based on brand name. Our reviews include options at various price points from both well-known and emerging brands."
            },
            {
                "question": f"What's the best way to maintain my {topic}?",
                "answer": f"Proper maintenance extends the life of your {topic} and ensures optimal performance. General tips include regular cleaning, following the manufacturer's care instructions, storing properly when not in use, and addressing minor issues before they become major problems. Most products come with specific maintenance guidelines in their user manual."
            },
            {
                "question": f"Should I buy a {topic} online or in-store?",
                "answer": f"Both options have advantages. Buying online typically offers better prices, more selection, and the convenience of delivery to your door. You can also easily compare features and read reviews. In-store purchases allow you to physically examine the product and get immediate assistance from staff. Many retailers now offer the best of both worlds with online ordering and in-store pickup options."
            }
        ]
        
        # Select a random subset of FAQs (4-6)
        selected_faqs = random.sample(faq_templates, random.randint(4, min(6, len(faq_templates))))
        
        # Format FAQ section
        faq_content = ""
        for faq in selected_faqs:
            faq_content += f"""### {faq['question']}

{faq['answer']}

"""
        
        return faq_content
    
    def _generate_conclusion(self, topic, products):
        """
        Generate the conclusion section.
        
        Args:
            topic (str): Main topic
            products (list): List of product dictionaries
            
        Returns:
            str: Conclusion section in markdown format
        """
        if not products:
            return f"Finding the right {topic} is important for ensuring you get the best experience. We'll continue to update this guide as new products become available."
        
        top_product = products[0]
        top_product_name = self._get_product_attribute(top_product, 'title', f"top {topic} product")
        
        # Get second and third products if available
        runner_up_name = ""
        if len(products) > 1:
            runner_up_name = self._get_product_attribute(products[1], 'title', "")
        
        budget_name = ""
        if len(products) > 2:
            budget_name = self._get_product_attribute(products[2], 'title', "")
        
        # Conclusion templates
        templates = [
            f"""Choosing the right {topic} can significantly enhance your experience and provide long-term value. After thorough research and testing, we found the {top_product_name} to be the best overall option, offering an excellent balance of quality, features, and price.

{f"For those seeking the best value, the {runner_up_name} provides reliable performance. " if runner_up_name else ""}
{f"Budget-conscious buyers will appreciate the {budget_name}, which offers good performance at a more accessible price point." if budget_name else ""}

Remember to consider your specific needs and priorities when making your decision. We hope this guide has helped you narrow down your options and find the perfect {topic} for your requirements.""",
            
            f"""Finding the ideal {topic} doesn't have to be overwhelming. By focusing on the key factors outlined in our buying guide and considering our top recommendations, you can make an informed decision that you'll be happy with for years to come.

The {top_product_name} stands out as our top recommendation due to its exceptional performance and reliability. {f"However, the {runner_up_name} and {budget_name} are also excellent choices depending on your specific needs and budget." if runner_up_name and budget_name else ""}

Whichever option you choose, investing in a quality {topic} will enhance your experience and provide better results. We'll continue to update this guide as new products are released and technologies evolve."""
        ]
        
        # Select a random template
        conclusion = random.choice(templates)
        
        return conclusion
    
    def _adjust_keyword_density(self, content, keyword, target_density=2.0):
        """
        Adjust the keyword density of the content.
        
        Args:
            content (str): Content to adjust
            keyword (str): Main keyword
            target_density (float): Target keyword density in percentage
            
        Returns:
            str: Content with adjusted keyword density
        """
        # Calculate current density
        word_count = len(content.split())
        keyword_count = len(re.findall(r'\b' + re.escape(keyword) + r'\b', content, re.IGNORECASE))
        
        current_density = (keyword_count / word_count) * 100
        
        # If density is already close to target, return content as is
        if abs(current_density - target_density) < 0.5:
            return content
        
        # If density is too low, add more keywords
        if current_density < target_density:
            # Calculate how many keywords to add
            target_count = int((target_density * word_count) / 100)
            to_add = target_count - keyword_count
            
            if to_add > 0:
                # Find sentences that don't contain the keyword
                sentences = re.split(r'(?<=[.!?])\s+', content)
                eligible_sentences = [s for s in sentences if keyword.lower() not in s.lower()]
                
                # If we have eligible sentences, insert keyword
                if eligible_sentences and to_add <= len(eligible_sentences):
                    for i in range(min(to_add, len(eligible_sentences))):
                        # Replace the sentence with one containing the keyword
                        sentence = eligible_sentences[i]
                        words = sentence.split()
                        if len(words) > 5:  # Only modify sentences with at least 5 words
                            insert_pos = random.randint(1, len(words) - 1)
                            words.insert(insert_pos, keyword)
                            modified_sentence = ' '.join(words)
                            content = content.replace(sentence, modified_sentence)
        
        # If density is too high, remove some instances
        elif current_density > target_density:
            # Calculate how many to remove
            target_count = int((target_density * word_count) / 100)
            to_remove = keyword_count - target_count
            
            if to_remove > 0:
                # Find all occurrences of the keyword
                pattern = re.compile(r'\b' + re.escape(keyword) + r'\b', re.IGNORECASE)
                matches = list(pattern.finditer(content))
                
                # Randomly select instances to remove (excluding those in titles/headers)
                if matches:
                    # Filter out matches in headers (after # or ##)
                    non_header_matches = [m for m in matches if content[max(0, m.start() - 2):m.start()].strip() not in ['# ', '##']]
                    
                    # Select random instances to remove
                    to_remove = min(to_remove, len(non_header_matches) - 1)  # Keep at least one instance
                    if to_remove > 0 and non_header_matches:
                        remove_indices = random.sample(range(len(non_header_matches)), to_remove)
                        
                        # Replace with synonyms or alternative phrasing
                        synonyms = [
                            "it", "this product", "this item", "this option", 
                            "this solution", "this choice", "this selection"
                        ]
                        
                        # Create a new content string, replacing the selected instances
                        for idx in sorted(remove_indices, reverse=True):
                            match = non_header_matches[idx]
                            replacement = random.choice(synonyms)
                            content = content[:match.start()] + replacement + content[match.end():]
        
        return content
    
    def _markdown_to_html(self, markdown_content):
        """
        Convert markdown content to HTML.
        
        Args:
            markdown_content (str): Content in markdown format
            
        Returns:
            str: Content in HTML format
        """
        # This is a simplified conversion. In a real implementation, 
        # you would use a proper markdown to HTML converter library.
        
        # Convert headers
        html = re.sub(r'# (.*?)$', r'<h1>\1</h1>', markdown_content, flags=re.MULTILINE)
        html = re.sub(r'## (.*?)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
        html = re.sub(r'### (.*?)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
        
        # Convert paragraphs
        html = re.sub(r'(?<!\n)\n(?!\n)(?!<h|<p|<ul|<li|<a|<strong|<em)', ' ', html)
        html = re.sub(r'\n\n([^<].*?)(?:\n\n|$)', r'<p>\1</p>\n', html, flags=re.DOTALL)
        
        # Convert bold and italic
        html = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', html)
        html = re.sub(r'\*(.*?)\*', r'<em>\1</em>', html)
        
        # Convert lists
        html = re.sub(r'- (.*?)$', r'<li>\1</li>', html, flags=re.MULTILINE)
        html = re.sub(r'(<li>.*?</li>)\n(<li>.*?</li>)', r'\1\2', html, flags=re.DOTALL)
        html = re.sub(r'(<li>.*?</li>)+', r'<ul>\g<0></ul>', html, flags=re.DOTALL)
        
        # Convert links
        html = re.sub(r'\[(.*?)\]\((.*?)\)', r'<a href="\2">\1</a>', html)
        
        # Convert images
        html = re.sub(r'!\[(.*?)\]\((.*?)\)', r'<img src="\2" alt="\1">', html)
        
        # Add basic HTML structure
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{re.search(r'<h1>(.*?)</h1>', html).group(1) if re.search(r'<h1>(.*?)</h1>', html) else 'Blog Post'}</title>
</head>
<body>
    <article>
        {html}
    </article>
</body>
</html>"""
        
        return html
    
    def _get_product_attribute(self, product, attribute, default=None):
        """
        Safely get a product attribute with fallback to default value.
        
        Args:
            product (dict): Product dictionary
            attribute (str): Attribute name to retrieve
            default: Default value if attribute is not found or is None/empty
            
        Returns:
            The attribute value or default
        """
        value = product.get(attribute)
        
        # Check if value exists and is not empty
        if value is None:
            return default
        
        # For string attributes, check if empty
        if isinstance(value, str) and not value.strip():
            return default
        
        # For list attributes, check if empty
        if isinstance(value, list) and not value:
            return default
        
        return value 