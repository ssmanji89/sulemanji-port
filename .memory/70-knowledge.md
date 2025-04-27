# Domain & Project Knowledge: Amazon Affiliate Blog Generator

## Key Terminology

### Amazon Affiliate Marketing Terms

1. **Amazon Associates Program**
   - Amazon's affiliate marketing program that allows website owners to earn commissions by promoting and linking to Amazon products.

2. **ASIN (Amazon Standard Identification Number)**
   - A unique 10-character alphanumeric identifier assigned by Amazon to each product in their catalog.
   - Format: Usually starts with "B" followed by 9 alphanumeric characters (e.g., B07PXGQC1Q).
   - Critical for generating direct product links.

3. **Affiliate Tag (Associate ID)**
   - A unique identifier that tracks affiliate referrals and credits commissions.
   - Format: Usually ends with "-20" for US store (e.g., "mywebsite-20").
   - Must be included in all affiliate links for tracking.

4. **Affiliate Link**
   - A URL that includes an associate ID to track referrals and attribute commissions.
   - Two main types: direct product links and search result links.

5. **Direct Product Link**
   - Links directly to a specific product using its ASIN.
   - Format: `https://www.amazon.com/dp/{ASIN}?tag={affiliate-tag}`
   - Higher conversion rate than search links.

6. **Search Result Link**
   - Links to Amazon search results for a specific term.
   - Format: `https://www.amazon.com/s?k={search-term}&tag={affiliate-tag}`
   - Used when an ASIN is not available.

7. **Commission Rates**
   - Percentage of sale amount paid to affiliates, varying by product category.
   - Ranges from 1% to 10% depending on product category.

8. **Cookie Duration**
   - The time period during which a referral can result in a commission.
   - Amazon's standard cookie duration is 24 hours.

9. **Earnings Per Click (EPC)**
   - Average earnings generated per click on affiliate links.
   - Important metric for measuring affiliate performance.

### Content Generation Terms

1. **SEO (Search Engine Optimization)**
   - The practice of optimizing content to rank higher in search engine results.
   - Critical for driving organic traffic to affiliate content.

2. **Keyword Density**
   - The percentage of times a keyword appears in content compared to total word count.
   - Optimal range is generally 1-2% to avoid keyword stuffing.

3. **Front Matter**
   - Metadata at the beginning of a Markdown or Jekyll file, enclosed between triple-dashes.
   - Contains information like title, date, categories, and tags.

4. **Rich Snippets**
   - Enhanced search result displays that show additional information like ratings, prices, etc.
   - Can be extracted from Google Search results or generated with structured data.

5. **Claude AI**
   - Large language model by Anthropic used for content generation.
   - Integrated via API to create natural, engaging blog content.

6. **Content Template**
   - Predefined structure for blog posts with placeholders for dynamic content.
   - Ensures consistency across generated articles.

### Technical Terms

1. **Google Custom Search API**
   - Google service that provides programmatic access to search results.
   - Used for trend discovery and product discovery in the system.
   - Has rate limits (100 queries/day for free tier).

2. **GitHub Pages**
   - Static site hosting service by GitHub.
   - Target platform for publishing generated blog content.

3. **Jekyll**
   - Static site generator that GitHub Pages uses to convert Markdown files to HTML.
   - Supports front matter for page metadata.

4. **JSON Storage**
   - Simple file-based storage using JSON format.
   - Used for persistence rather than a database.

5. **Pipeline Architecture**
   - System design where data flows through sequential processing stages.
   - Core structure of the affiliate blog generator.

6. **Webhook**
   - HTTP callback that delivers data to other applications in real-time.
   - Used for notifications in the monitoring module.

## Amazon Affiliate Program Rules & Best Practices

### Official Requirements

1. **Disclosure Requirements**
   - Must clearly disclose Amazon Associate relationship to site visitors.
   - Standard disclosure: "As an Amazon Associate, I earn from qualifying purchases."
   - Disclosure should be visible and easily accessible.

2. **Link Format Requirements**
   - Links must include the Associate ID parameter.
   - Cannot use link shorteners or cloaking that hide Amazon as the destination.
   - JavaScript-generated links are allowed if properly formatted.

3. **Content Guidelines**
   - Cannot make false claims about products.
   - Cannot copy product descriptions verbatim from Amazon.
   - Cannot use excessive or irrelevant keywords.
   - Cannot promote products on excluded categories (prescription drugs, etc.).

4. **Technical Requirements**
   - Cannot fetch real-time pricing from Amazon (violates API terms).
   - Can use "Check Price on Amazon" or similar CTA.
   - Cannot automatically update content based on price changes.
   - Must target content to the correct locale (US links for US visitors).

### Best Practices

1. **Product Selection**
   - Select products with at least 4+ star ratings.
   - Prefer products with substantial review counts (100+).
   - Focus on products with good commission rates.
   - Consider price points that balance commission potential with conversion rate.

2. **Link Placement**
   - Include links naturally within content, not just at the end.
   - Use call-to-action buttons or highlighted text.
   - Place important links above the fold when possible.
   - Use images with linked buttons for better click-through rates.

3. **Content Structure**
   - Include comprehensive product information.
   - Address product benefits and potential drawbacks.
   - Compare with alternatives for more helpful content.
   - Use clear headings and structured format (H2, H3, etc.).

4. **SEO Optimization**
   - Include target keywords in title, headings, and content.
   - Write meta descriptions with clear value proposition.
   - Use product-specific keywords (model numbers, features).
   - Include structured data when possible for rich snippets.

## Google Search API Knowledge

### Understanding Google Custom Search

1. **API Basics**
   - Programmatic access to Google Search results.
   - Requires API Key and Custom Search Engine ID.
   - Returns structured JSON data with search results.

2. **Rate Limits**
   - Free tier: 100 queries per day.
   - Paid tier: $5 per 1000 queries, up to 10,000 per day.
   - Limits are reset at midnight Pacific Time.

3. **Query Optimization**
   - Use site-specific queries for Amazon products: `site:amazon.com product name`.
   - Use quotes for exact match: `"product name"`.
   - Add qualifiers like "best," "review," or "top" for product-focused results.

4. **Result Structure**
   - Each result includes:
     - Title
     - Link
     - Snippet (description)
     - Additional attributes when available

5. **Extracting Product Information**
   - Product names typically appear in the title.
   - Prices often appear in snippets, usually with "$" symbol.
   - Ratings sometimes appear as "X.X out of 5 stars" in snippets.
   - ASINs can be extracted from Amazon URLs.

### ASIN Extraction Patterns

1. **Common URL Patterns**

   Format 1: `/dp/{ASIN}`
   ```
   https://www.amazon.com/dp/B07PXGQC1Q
   ```

   Format 2: `/gp/product/{ASIN}`
   ```
   https://www.amazon.com/gp/product/B07PXGQC1Q
   ```

   Format 3: `/product-name/dp/{ASIN}`
   ```
   https://www.amazon.com/Echo-Dot-5th-Gen-2022/dp/B09B8V1LZ3
   ```

2. **Extraction Regex Patterns**

   Basic Pattern:
   ```
   /(?:dp|gp\/product)\/([A-Z0-9]{10})/
   ```

   Comprehensive Pattern:
   ```
   /(?:\/dp\/|\/gp\/product\/|\/product\/[^\/]+\/dp\/)([A-Z0-9]{10})/
   ```

3. **Validation Rules**
   - Must be 10 characters long
   - Usually starts with "B" followed by digits or uppercase letters
   - Contains only alphanumeric characters (A-Z, 0-9)

## Frequently Asked Questions

### Project Structure FAQs

1. **Q: What's the difference between content_generator.py and content_generation.py?**
   
   A: They represent two different implementations of content generation:
   - `content_generator.py` uses a template-based approach with random selection for various content parts, designed as a class.
   - `content_generation.py` uses the Claude AI API for more natural language generation, implemented as functions.

2. **Q: How do I choose between using app.py and main.py?**

   A: Use `app.py` for scheduled, automated content generation with the full pipeline from trend discovery to publishing. Use `main.py` for manual content generation when you want to specify topics and have more control over the output files.

3. **Q: Where is data stored in the system?**

   A: All data is stored in JSON files in the `data/` directory. This includes trending topics, selected products, generated content, and metrics.

### Amazon Affiliate FAQs

1. **Q: Do both direct product links and search links generate commissions?**

   A: Yes, both types of affiliate links can generate commissions. Direct product links typically have higher conversion rates because they take users directly to a product page.

2. **Q: Can I use the same affiliate tag across multiple websites?**

   A: Yes, you can use the same Amazon Associates tag across multiple websites you own. However, each domain should be registered in your Amazon Associates account.

3. **Q: How do I track which links are performing best?**

   A: Amazon's Associate Central provides reporting tools. You can also use link parameters like `&linkId=` to track specific links within your Associate account.

### Technical Implementation FAQs

1. **Q: How do I configure the system to use my affiliate tag?**

   A: Set the `AMAZON_ASSOCIATES_TAG` environment variable with your affiliate tag, either directly or in a `.env` file.

2. **Q: How do I set up Google Custom Search for product discovery?**

   A: You need to:
   1. Create a Google API project and get an API key
   2. Create a Custom Search Engine and get a search engine ID (cx)
   3. Set the `GOOGLE_API_KEY` and `GOOGLE_CSE_ID` environment variables

3. **Q: What should I do if Google Search API rate limits are exceeded?**

   A: Implement aggressive caching and batch processing. Consider upgrading to the paid tier or splitting searches across multiple days based on priority.

4. **Q: How do I publish to my own GitHub Pages site?**

   A: Set the `GITHUB_TOKEN` and `GITHUB_REPO` environment variables with your personal access token and repository (in the format `username/repo`).

### Troubleshooting FAQs

1. **Q: Why are ASIN extractions sometimes failing?**

   A: Amazon URLs can vary in format. Check that the extraction regex patterns account for all common patterns and add logging to identify which patterns are being missed.

2. **Q: Why is content generation failing?**

   A: Common causes include:
   - Missing API keys or environment variables
   - Claude API rate limits or quota exceeded
   - Insufficient product data for template completion
   - Errors in prompt templates

3. **Q: Why are generated affiliate links not tracking?**

   A: Verify that:
   - Your affiliate tag is correctly formatted
   - Links include the tag parameter with proper URL encoding
   - Your Amazon Associates account is active and in good standing
   - You're not violating any Amazon terms of service

4. **Q: How can I improve the quality of product discovery?**

   A: Optimize your search queries by:
   - Using site-specific search (`site:amazon.com`)
   - Adding terms like "best," "top rated," etc.
   - Including category qualifiers
   - Using more specific product terms
   - Filtering results with price ranges or other qualifiers 