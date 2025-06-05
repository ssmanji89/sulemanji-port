# Automated Blog Content Generation System

A comprehensive system for generating high-quality technical blog content with Amazon affiliate integration and automated publishing to Jekyll-based GitHub Pages sites.

## Features

- **Trend Discovery**: Automatically discovers trending topics from Reddit and Google Trends
- **AI Content Generation**: Uses OpenAI GPT-4 to generate 1200-1500 word technical articles
- **Amazon Affiliate Integration**: Finds and integrates relevant products with affiliate links
- **SEO Optimization**: Generates SEO-friendly titles, meta descriptions, and tags
- **Automated Publishing**: Publishes directly to GitHub repository with Jekyll formatting
- **Comprehensive Error Handling**: Robust error handling and logging throughout
- **Rate Limiting**: Respects API rate limits and includes configurable delays

## System Architecture

```
┌─ Trend Discovery ─────────────────────────────────────────┐
│ • Reddit API (r/technology, r/programming)                │
│ • Google Trends API                                       │
│ • Keyword scoring and ranking                             │
└───────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─ Content Generation ──────────────────────────────────────┐
│ • OpenAI GPT-4 integration                               │
│ • Structured prompts for technical writing               │
│ • 1200-1500 word content generation                      │
└───────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─ Product Research ────────────────────────────────────────┐
│ • Amazon product scraping                                │
│ • Affiliate link generation (sghpgs-20)                  │
│ • Natural product integration                            │
└───────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─ Content Assembly ────────────────────────────────────────┐
│ • Jekyll front matter generation                         │
│ • SEO optimization                                       │
│ • Affiliate disclosure integration                       │
└───────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─ Publishing Pipeline ─────────────────────────────────────┐
│ • GitHub API integration                                 │
│ • Duplicate post checking                                │
│ • Automated commit and push                              │
└───────────────────────────────────────────────────────────┘
```

## Installation

1. **Install Dependencies**:
   ```bash
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

3. **Required Environment Variables**:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `REDDIT_CLIENT_ID`: Reddit API client ID
   - `REDDIT_CLIENT_SECRET`: Reddit API client secret
   - `GITHUB_TOKEN`: GitHub personal access token
   - `GITHUB_REPO`: Your repository (e.g., "username/repository")

## Usage

### Command Line Interface

1. **Generate a Single Post**:
   ```bash
   python -m blog_automation.cli generate
   ```

2. **Generate with Custom Topic**:
   ```bash
   python -m blog_automation.cli generate --topic "artificial intelligence automation"
   ```

3. **Run Daily Automation**:
   ```bash
   python -m blog_automation.cli daily
   ```

4. **Check Configuration**:
   ```bash
   python -m blog_automation.cli config
   ```

### Programmatic Usage

```python
import asyncio
from blog_automation.orchestrator import BlogAutomationOrchestrator

async def main():
    orchestrator = BlogAutomationOrchestrator()
    result = await orchestrator.generate_and_publish_post()
    
    if result["success"]:
        print(f"Published: {result['blog_post']['title']}")
    else:
        print(f"Failed: {result['error']}")

asyncio.run(main())
```

## Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `OPENAI_API_KEY` | OpenAI API key | Yes | - |
| `REDDIT_CLIENT_ID` | Reddit API client ID | Yes | - |
| `REDDIT_CLIENT_SECRET` | Reddit API client secret | Yes | - |
| `GITHUB_TOKEN` | GitHub personal access token | Yes | - |
| `GITHUB_REPO` | Target repository | Yes | - |
| `AMAZON_STORE_ID` | Amazon affiliate store ID | No | sghpgs-20 |
| `MIN_WORD_COUNT` | Minimum word count | No | 1200 |
| `MAX_WORD_COUNT` | Maximum word count | No | 1500 |
| `POSTS_PER_DAY` | Posts to generate daily | No | 1 |

### Content Configuration

The system generates content optimized for:
- **Target Audience**: Engineering professionals
- **Writing Style**: Technical but accessible
- **Topics**: AI, automation, optimization, emerging tech
- **SEO**: Optimized titles, meta descriptions, and tags
- **Affiliate Integration**: Natural product mentions with disclosure

## Testing

Run the test suite:

```bash
pytest blog_automation/tests/ -v --cov=blog_automation
```

## Security Considerations

- **API Keys**: All sensitive data stored in environment variables
- **Rate Limiting**: Respects API rate limits to avoid blocking
- **Input Validation**: Sanitizes all external data inputs
- **Error Handling**: Comprehensive error handling without exposing sensitive data

## Performance

- **Generation Time**: <5 minutes per complete post
- **Memory Usage**: <512MB (optimized for DigitalOcean constraints)
- **API Efficiency**: Batched operations where possible
- **Caching**: Trend data (1 hour), product data (24 hours)

## Monitoring and Logging

- **Structured Logging**: All operations logged with correlation IDs
- **Error Tracking**: Comprehensive error tracking and reporting
- **Metrics**: Generation time, API calls, success rates
- **Health Checks**: Configuration validation and system health

## Troubleshooting

### Common Issues

1. **API Rate Limiting**: Increase delays in configuration
2. **Content Quality**: Adjust OpenAI temperature and prompts
3. **Product Research Failures**: Check Amazon scraping headers
4. **GitHub Publishing Errors**: Verify repository permissions

### Debug Mode

Enable debug logging:
```bash
export LOG_LEVEL=DEBUG
python -m blog_automation.cli generate
```

## Contributing

1. Follow the established code patterns
2. Add comprehensive tests for new features
3. Update documentation for any changes
4. Ensure all tests pass before submitting

## License

This project is part of the sulemanji.com website automation system.