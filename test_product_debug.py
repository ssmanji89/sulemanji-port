#!/usr/bin/env python3

import asyncio
import sys
sys.path.append('.')

from blog_automation.modules.product_research import ProductResearcher
from blog_automation.models import TrendingTopic
from datetime import datetime

async def test_product_research():
    test_topic = TrendingTopic(
        keyword='AI automation',
        trend_score=0.8,
        search_volume=5000,
        related_terms=['machine learning', 'automation tools'],
        timestamp=datetime.now(),
        source='test'
    )
    
    print("Testing product research...")
    
    async with ProductResearcher() as researcher:
        products = await researcher.find_relevant_products(test_topic, max_products=3)
        print(f"Found {len(products)} products:")
        
        for i, product in enumerate(products, 1):
            print(f"\n{i}. Title: {product.title}")
            print(f"   ASIN: {product.asin}")
            print(f"   Price: {product.price}")
            print(f"   Rating: {product.rating}")
            print(f"   Affiliate Link: {product.affiliate_link}")
            if product.title == "Unknown Product":
                print("   ⚠️  WARNING: Unknown Product detected!")
            else:
                print("   ✅ Product title extracted successfully!")

if __name__ == "__main__":
    asyncio.run(test_product_research()) 