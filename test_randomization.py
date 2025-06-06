#!/usr/bin/env python3

import asyncio
import sys
sys.path.append('.')

from blog_automation.modules.trend_discovery import TrendDiscovery

async def test_randomization():
    discovery = TrendDiscovery()
    
    print('Testing randomized topic discovery...')
    
    # Run discovery multiple times to see randomization
    for i in range(3):
        print(f'\n--- Run {i+1} ---')
        topics = await discovery.discover_trending_topics(max_topics=3)
        for j, topic in enumerate(topics, 1):
            print(f'{j}. {topic.keyword[:60]}...')
            print(f'   Source: {topic.source}')
            if topic.source_url:
                print(f'   URL: {topic.source_url}')
            print(f'   Score: {topic.final_score:.3f}')

if __name__ == "__main__":
    asyncio.run(test_randomization()) 