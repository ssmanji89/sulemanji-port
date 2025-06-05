#!/usr/bin/env python3
"""
Test script to verify the blog automation system works correctly.
This script tests the system with mock data to ensure all components function properly.
"""

import asyncio
import sys
from datetime import datetime
from blog_automation.models import TrendingTopic, BlogPost, Product
from blog_automation.modules.content_assembler import ContentAssembler


async def test_content_assembly():
    """Test the content assembly functionality."""
    print("🧪 Testing Content Assembly...")
    
    # Create test blog post
    test_post = BlogPost(
        title="AI-Powered Automation Tools for Modern Development",
        content="""# Introduction

Artificial intelligence is revolutionizing how we approach software development and automation. In this comprehensive guide, we'll explore the latest AI-powered tools that are transforming the development landscape.

## The Rise of AI in Development

Modern development teams are increasingly turning to AI-powered solutions to streamline their workflows and improve productivity. These tools leverage machine learning algorithms to automate repetitive tasks, optimize code, and enhance the overall development experience.

## Key Benefits of AI Automation

1. **Increased Productivity**: AI tools can handle routine tasks, allowing developers to focus on more complex problems
2. **Improved Code Quality**: Automated code review and optimization tools help maintain high standards
3. **Faster Deployment**: AI-driven CI/CD pipelines can significantly reduce deployment times

## Popular AI Development Tools

Several AI-powered tools have gained popularity among development teams:

### Code Generation Tools
AI-powered code generators can create boilerplate code, suggest implementations, and even write entire functions based on natural language descriptions.

### Automated Testing
AI testing tools can generate test cases, identify edge cases, and optimize test coverage automatically.

### Performance Optimization
Machine learning algorithms can analyze application performance and suggest optimizations for better efficiency.

## Implementation Best Practices

When implementing AI automation tools in your development workflow, consider these best practices:

1. Start with small, well-defined tasks
2. Gradually expand AI integration as your team becomes comfortable
3. Maintain human oversight for critical decisions
4. Regularly evaluate and update your AI tools

## Future Outlook

The future of AI in development looks promising, with emerging technologies like GPT-4, advanced code analysis, and intelligent deployment systems leading the way.

## Conclusion

AI-powered automation tools are no longer a luxury but a necessity for modern development teams. By embracing these technologies, teams can achieve higher productivity, better code quality, and faster time-to-market.""",
        excerpt="Discover how AI-powered automation tools are transforming modern software development workflows and boosting team productivity.",
        category="AI",
        tags=["AI", "Automation", "Development", "Productivity", "Tools"]
    )
    
    # Create test products
    test_products = [
        Product(
            title="Clean Code: A Handbook of Agile Software Craftsmanship",
            asin="B001GSTOAM",
            price="$29.99",
            rating=4.7
        ),
        Product(
            title="The Pragmatic Programmer: Your Journey To Mastery",
            asin="B003GCTQAE",
            price="$34.99",
            rating=4.8
        ),
        Product(
            title="Artificial Intelligence: A Modern Approach",
            asin="B07MYLGQZX",
            price="$89.99",
            rating=4.5
        )
    ]
    
    # Test content assembly
    assembler = ContentAssembler()
    
    try:
        # Assemble the blog post
        final_content = assembler.assemble_blog_post(test_post, test_products)
        filename = assembler.generate_filename(test_post)
        
        print(f"✅ Content assembly successful!")
        print(f"📝 Title: {test_post.title}")
        print(f"📊 Word count: {test_post.word_count}")
        print(f"📁 Filename: {filename}")
        print(f"🔗 Products integrated: {len(test_products)}")
        
        # Save test output
        with open("test_blog_post.md", "w") as f:
            f.write(final_content)
        
        print(f"💾 Test output saved to: test_blog_post.md")
        
        return True
        
    except Exception as e:
        print(f"❌ Content assembly failed: {e}")
        return False


async def test_models():
    """Test the data models."""
    print("🧪 Testing Data Models...")
    
    try:
        # Test TrendingTopic
        topic = TrendingTopic(
            keyword="artificial intelligence automation",
            trend_score=0.8,
            search_volume=5000,
            related_terms=["AI", "automation", "machine learning"],
            timestamp=datetime.now(),
            source="test"
        )
        
        assert topic.final_score > 0, "Final score should be calculated"
        print(f"✅ TrendingTopic model working (score: {topic.final_score:.2f})")
        
        # Test Product
        product = Product(
            title="Test Product",
            asin="B123456789",
            price="$29.99",
            rating=4.5
        )
        
        expected_link = "https://www.amazon.com/dp/B123456789?tag=sghpgs-20"
        assert product.affiliate_link == expected_link, "Affiliate link should be generated correctly"
        print(f"✅ Product model working (link: {product.affiliate_link})")
        
        # Test BlogPost
        post = BlogPost(
            title="Test Post",
            content="This is a test post with some content to verify word counting works properly.",
            excerpt="Test excerpt",
            category="AI",
            tags=["test", "ai"]
        )
        
        assert post.word_count > 0, "Word count should be calculated"
        assert post.author == "Suleman Anji", "Default author should be set"
        print(f"✅ BlogPost model working (words: {post.word_count}, author: {post.author})")
        
        return True
        
    except Exception as e:
        print(f"❌ Model testing failed: {e}")
        return False


async def main():
    """Run all tests."""
    print("🚀 Starting Blog Automation System Tests\n")
    
    tests = [
        ("Data Models", test_models()),
        ("Content Assembly", test_content_assembly()),
    ]
    
    results = []
    for test_name, test_coro in tests:
        print(f"\n{'='*50}")
        print(f"Testing: {test_name}")
        print('='*50)
        
        try:
            result = await test_coro
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    print(f"\n{'='*50}")
    print("TEST SUMMARY")
    print('='*50)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nTotal: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("\n🎉 All tests passed! The blog automation system is working correctly.")
        print("\n📋 Next steps:")
        print("1. Set up your environment variables in .env file")
        print("2. Configure your API keys (OpenAI, Reddit, GitHub)")
        print("3. Run: python -m blog_automation.cli generate --topic 'your topic'")
    else:
        print("\n⚠️  Some tests failed. Please check the errors above.")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())