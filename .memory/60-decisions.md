# Decision Log: Amazon Affiliate Blog Generator

## Core Architectural Decisions

### ADR-001: Modular Pipeline Architecture

**Date:** Initial Design Phase

**Decision:** Implement the system as a modular pipeline with distinct components for each major function: trend discovery, product selection, content generation, and publishing.

**Context:** The system needs to handle several complex tasks that may evolve independently over time. A modular approach allows for easier maintenance, testing, and potential replacement of individual components.

**Alternatives Considered:**
1. Monolithic application with integrated functions
2. Microservice architecture with API interfaces between components
3. Event-driven architecture with message queues

**Rationale:**
- Modular pipeline provides a balance between separation of concerns and operational simplicity
- Components can be developed and tested independently
- Pipeline execution can be monitored at each stage
- Simplified error handling and recovery

**Consequences:**
- More explicit interfaces between components required
- Need for consistent data formats between pipeline stages
- Slightly increased complexity compared to monolithic design

**Status:** Implemented and validated

---

### ADR-002: Local JSON for Data Persistence

**Date:** Initial Design Phase

**Decision:** Use local JSON files for data persistence rather than a database.

**Context:** The system needs to store various types of data including trends, products, and operation history. While databases offer more features, they add complexity and external dependencies.

**Alternatives Considered:**
1. SQL database (PostgreSQL, SQLite)
2. NoSQL database (MongoDB)
3. Cloud storage (S3, Firebase)

**Rationale:**
- Simplified deployment without database setup
- Sufficient performance for expected data volumes
- Easy backup and version control integration
- Reduced external dependencies

**Consequences:**
- Limited query capabilities
- Potential scaling issues with very large datasets
- Need for custom concurrency handling

**Status:** Implemented and validated

---

### ADR-003: Dual Execution Models (CLI and Scheduled Job)

**Date:** Initial Design Phase

**Decision:** Support two execution models - command-line interface (main.py) for manual operation and scheduled job (app.py) for automated execution.

**Context:** Different users have different operational needs. Some prefer manual control over topic selection and execution, while others want automated, scheduled content generation.

**Alternatives Considered:**
1. CLI-only with external scheduling
2. Scheduled-only with configuration files
3. Web interface with manual and scheduled options

**Rationale:**
- CLI provides flexibility for development and testing
- Scheduled job enables set-and-forget operation
- Both use the same core modules with different entry points
- Accommodates different user preferences

**Consequences:**
- Need to maintain two entry point implementations
- Increased testing matrix
- Potential for configuration drift between modes

**Status:** Implemented and validated

---

## Technical Implementation Decisions

### ADR-004: Mock Product Generation for Initial Development

**Date:** Early Development Phase

**Decision:** Implement a mock product generation system that creates realistic-looking product data for development and testing.

**Context:** Initial development needed to proceed without finalized Amazon API integration. A system was needed to generate plausible product data for testing the content generation pipeline.

**Alternatives Considered:**
1. Delay development until API integration was available
2. Use static product data samples
3. Implement partial pipeline excluding product selection

**Rationale:**
- Allowed parallel development of all system components
- Created realistic test data for content generation
- Enabled end-to-end testing without API dependencies
- Provided fallback mechanism if API issues occurred

**Consequences:**
- Additional development effort for mock system
- Risk of differences between mock and real data formats
- Need to eventually replace with real implementation

**Status:** Implemented, to be adapted for Google Search integration

---

### ADR-005: Claude AI Integration for Content Generation

**Date:** Content Enhancement Phase

**Decision:** Use Claude AI (Anthropic) for natural language generation rather than template-based or self-developed generation.

**Context:** High-quality, engaging content is critical for SEO performance and user engagement. Template-based approaches can be repetitive and unnatural.

**Alternatives Considered:**
1. Template-based generation with variables
2. OpenAI's GPT models
3. Self-developed NLG system
4. Human writers with automation support

**Rationale:**
- Claude produces high-quality, natural-sounding content
- More cost-effective than human writers
- Better content variation than template-based approaches
- Good control over output format and structure
- Reasonable pricing model for expected usage

**Consequences:**
- External API dependency
- Ongoing operational costs
- Potential for occasional unexpected outputs
- Need for prompt engineering and validation

**Status:** Implemented and validated

---

### ADR-006: GitHub Pages for Content Hosting

**Date:** Early Development Phase

**Decision:** Use GitHub Pages as the primary publishing platform for generated content.

**Context:** The system needs to publish content to a website accessible to users and search engines. Various hosting options exist with different trade-offs.

**Alternatives Considered:**
1. Custom web hosting
2. WordPress or other CMS
3. Static site generators with alternative hosting
4. Medium or other content platforms

**Rationale:**
- Free hosting for public repositories
- Simple integration with version control
- Jekyll support for static site generation
- Easy automation through GitHub API
- No server maintenance required

**Consequences:**
- Limited to static content
- Subject to GitHub Pages limitations
- Need for Jekyll-compatible formatting
- Potential repository size constraints over time

**Status:** Implemented and validated

---

## Recent Adaptation Decisions

### ADR-007: Google Search-Based Product Discovery

**Date:** Current Adaptation Phase

**Decision:** Replace Amazon API dependency with Google Search-based product discovery.

**Context:** Direct access to Amazon's Product Advertising API is not available, requiring an alternative approach to discover products and generate affiliate links.

**Alternatives Considered:**
1. Web scraping Amazon directly (legal/ToS concerns)
2. Third-party product data providers
3. Manual product list curation
4. Product discovery via alternate retailers

**Rationale:**
- Google Search API is accessible and established
- Can target search queries to find Amazon products
- Existing trend_discovery module already uses similar approach
- Can extract product details from search snippets
- Compatible with existing affiliate link generation

**Consequences:**
- Limited product data compared to direct API
- Additional processing required to extract ASINs
- Inconsistent data quality across search results
- API rate limits and associated costs
- Need for more robust fallback mechanisms

**Status:** In implementation

---

### ADR-008: Hybrid Direct/Search Affiliate Links

**Date:** Current Adaptation Phase

**Decision:** Implement a hybrid approach for affiliate links that uses direct product links when ASINs can be extracted, and search result links when they cannot.

**Context:** Amazon affiliate links are more effective when they link directly to products, but extracting ASINs from Google Search results is not always reliable.

**Alternatives Considered:**
1. Direct product links only (fail when ASINs unavailable)
2. Search result links only (simpler but less effective)
3. Alternative affiliate programs

**Rationale:**
- Direct links provide better user experience and conversion rates
- Search links provide reliable fallback when ASINs unavailable
- Both link types are valid for affiliate tracking
- Maximizes product coverage while optimizing for conversions

**Consequences:**
- More complex link generation logic
- Varied user experience depending on link type
- Different conversion metrics for different link types
- Need for link validation and testing

**Status:** In implementation

---

### ADR-009: Product Data Enrichment from Search Snippets

**Date:** Current Adaptation Phase

**Decision:** Implement product data enrichment by extracting additional details (price, rating, etc.) from Google Search result snippets when available.

**Context:** Google Search results often include rich snippets with product details, but the format and availability are inconsistent.

**Alternatives Considered:**
1. Use only basic product information (title, link)
2. Secondary API calls for additional data
3. Generate plausible details for missing attributes

**Rationale:**
- Improves content quality when data is available
- No additional API costs or rate limits
- Graceful degradation when data is missing
- Potential for improved content relevance

**Consequences:**
- Inconsistent data availability across products
- Complex parsing logic to extract from unstructured text
- Need for robust validation and fallbacks
- Potential for occasional extraction errors

**Status:** In implementation

---

### ADR-010: Shared Utilities for Dual Execution Paths

**Date:** Current Adaptation Phase

**Decision:** Create shared utility modules for Google Search integration to ensure consistency between CLI (main.py) and scheduled job (app.py) execution paths.

**Context:** The system has two primary execution paths that need to maintain consistent behavior with the new Google Search integration.

**Alternatives Considered:**
1. Focus on one execution path initially
2. Duplicate implementation with path-specific optimizations
3. Refactor to eliminate one execution path

**Rationale:**
- Reduces code duplication and maintenance burden
- Ensures consistent behavior across execution modes
- Centralizes complex logic for better testing
- Simplified updates for future changes

**Consequences:**
- More abstract interfaces required
- Potentially more complex utility implementations
- Additional integration testing needed
- Possible compromises to support both paths

**Status:** In implementation 