# Additional Houston Event Sources

This document lists additional Houston event sources that can be added to the `HOUSTON_EVENTS_SOURCES` configuration.

## Currently Configured Sources

1. **Visit Houston Texas**: https://www.visithoustontexas.com/events/events-this-weekend/
   - Status: ⚠️ May have timeout issues due to site structure changes
   - Content: Official Houston tourism events

2. **HouCalendar**: https://www.houcalendar.com/
   - Status: ✅ Working well (358 events found)
   - Content: Comprehensive Houston event listings

## Additional Sources to Consider

### Music & Concerts
- **Houston Press Events**: https://www.houstonpress.com/events
- **Space City Rock**: https://spacecityrock.com/shows/
- **Bayou Music Center**: https://www.livenation.com/venue/KovZpZAE6klA/bayou-music-center-events
- **White Oak Music Hall**: https://whiteoakmusichall.com/events/

### Arts & Culture
- **Houston Theater District**: https://www.houstontheaterdistrict.org/events/
- **Museum District**: https://www.houstonmuseumdistrict.org/events/
- **Houston Ballet**: https://www.houstonballet.org/season/
- **Houston Symphony**: https://houstonsymphony.org/concerts-tickets/

### Family & Community
- **Houston Parks & Recreation**: https://www.houstontx.gov/parks/events.html
- **Discovery Green**: https://www.discoverygreen.com/events
- **Hermann Park**: https://www.hermannpark.org/events/
- **Buffalo Bayou Partnership**: https://buffalobayou.org/events/

### Food & Dining
- **Houston Food Finder**: https://www.houstonfoodfinder.com/events/
- **Eater Houston**: https://houston.eater.com/events
- **Houston Chronicle Dining**: https://www.houstonchronicle.com/entertainment/restaurants/

### Sports
- **Houston Astros**: https://www.mlb.com/astros/schedule
- **Houston Rockets**: https://www.nba.com/rockets/schedule
- **Houston Texans**: https://www.houstontexans.com/schedule/
- **Houston Dynamo**: https://www.houstondynamo.com/schedule

## How to Add New Sources

1. **Update .env file**:
   ```bash
   HOUSTON_EVENTS_SOURCES=https://www.visithoustontexas.com/events/events-this-weekend/,https://www.houcalendar.com/,https://new-source.com/events
   ```

2. **Add source-specific logic** in `houston_events_scraper.py`:
   ```python
   elif 'new-source.com' in source_url:
       events = await self.scrape_new_source()
   ```

3. **Implement scraping method**:
   ```python
   async def scrape_new_source(self) -> List[HoustonEvent]:
       # Implementation for new source
       pass
   ```

## Testing New Sources

Use the test script to verify new sources work:

```bash
python test_houston_events.py
```

## Source Selection Criteria

When adding new sources, consider:

- **Reliability**: Site should be consistently available
- **Content Quality**: Events should have good metadata (date, venue, description)
- **Update Frequency**: Site should be regularly updated with new events
- **Anti-Bot Measures**: Site should allow reasonable scraping
- **Content Relevance**: Focus on Houston-area events

## Troubleshooting Sources

If a source stops working:

1. **Check site structure**: Websites often change their HTML structure
2. **Update selectors**: Modify CSS selectors in the scraper
3. **Add delays**: Some sites require longer wait times
4. **Check robots.txt**: Ensure scraping is allowed
5. **Consider API alternatives**: Some sites offer event APIs

## Rate Limiting

To be respectful to event websites:

- **2-second delay** between source requests (currently implemented)
- **30-second timeout** for page loads (currently implemented)
- **Headless browsing** to reduce server load (currently implemented)
- **User-agent rotation** (can be added if needed)

## Legal Considerations

- Only scrape **publicly available** event information
- Respect **robots.txt** files
- Don't overload servers with **excessive requests**
- Consider **terms of service** for each website
- Provide **attribution** when appropriate in blog posts 