const axios = require('axios');

async function firecrawlSearch(query, limit = 5) {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return null;
  try {
    const { data } = await axios.post('https://api.firecrawl.dev/v1/search',
      { query, limit, scrapeOptions: { formats: ['markdown'] } },
      { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    return data.data || data.results || [];
  } catch (e) {
    console.error('Firecrawl search error:', e.response?.data || e.message);
    return null;
  }
}

async function firecrawlScrape(url) {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return null;
  try {
    const { data } = await axios.post('https://api.firecrawl.dev/v1/scrape',
      { url, formats: ['extract'], extract: { prompt: 'Extract: full name, job title, company, bio/about, location, follower count, following count, post count, email if visible. Return as JSON.' } },
      { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 20000 }
    );
    return data.extract || data.data?.extract || null;
  } catch (e) {
    console.error('Firecrawl scrape error:', e.response?.data || e.message);
    return null;
  }
}

module.exports = { firecrawlSearch, firecrawlScrape };
