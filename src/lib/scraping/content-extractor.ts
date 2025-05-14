// src/lib/scraping/content-extractor.ts
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import fetch from 'node-fetch'; // Using node-fetch for server-side consistency

interface ExtractedWebPageContent {
  title: string;
  textContent: string;
  excerpt?: string;
  url: string;
  error?: string; // To capture any errors during fetching or parsing
}

// Function to fetch and parse robots.txt
async function isUrlScrapingAllowed(targetUrl: string, userAgent: string = 'SkolrBot/1.0'): Promise<boolean> {
  try {
    const urlObj = new URL(targetUrl);
    const robotsUrl = `${urlObj.protocol}//${urlObj.hostname}/robots.txt`;
    console.log(`[ContentExtractor] Fetching robots.txt from: ${robotsUrl}`);

    const response = await fetch(robotsUrl, {
      headers: { 'User-Agent': userAgent },
    });

    if (!response.ok) {
      console.log(`[ContentExtractor] robots.txt not found or non-200 status (${response.status}) for ${urlObj.hostname}. Assuming allowed.`);
      return true; // If robots.txt is missing or inaccessible, often implies scraping is allowed
    }

    const robotsTxt = await response.text();
    const lines = robotsTxt.split('\n');
    let specificAgentRules = false;
    let generalAgentRules = false;
    let relevantRules: string[] = [];

    // Check for rules specific to our user agent
    for (const line of lines) {
      if (line.toLowerCase().startsWith(`user-agent: ${userAgent.toLowerCase()}`)) {
        specificAgentRules = true;
        relevantRules = []; // Start collecting rules for this agent
        continue;
      }
      if (line.toLowerCase().startsWith('user-agent: *')) {
        generalAgentRules = true;
        if (!specificAgentRules) relevantRules = []; // Start collecting rules for general agent if no specific ones yet
        continue;
      }
      if (specificAgentRules && line.toLowerCase().startsWith('disallow:')) {
        relevantRules.push(line.substring('disallow:'.length).trim());
      } else if (generalAgentRules && !specificAgentRules && line.toLowerCase().startsWith('disallow:')) {
        relevantRules.push(line.substring('disallow:'.length).trim());
      }
    }
    
    // If User-agent: * is present but no User-agent: SkolrBot/1.0, then User-agent: * rules apply.
    // If both are present, User-agent: SkolrBot/1.0 rules take precedence.

    const path = urlObj.pathname || '/';
    for (const rule of relevantRules) {
      if (rule === '/') { // Disallows everything
          if (path.startsWith(rule)) {
            console.log(`[ContentExtractor] Scraping disallowed by rule: Disallow: ${rule} for path: ${path}`);
            return false;
          }
      } else if (rule && path.startsWith(rule)) {
        console.log(`[ContentExtractor] Scraping disallowed by rule: Disallow: ${rule} for path: ${path}`);
        return false;
      }
    }
    console.log(`[ContentExtractor] Scraping allowed for ${targetUrl} based on robots.txt rules.`);
    return true;
  } catch (error) {
    console.error(`[ContentExtractor] Error fetching or parsing robots.txt for ${targetUrl}:`, error);
    return true; // Fail open: if robots.txt can't be processed, assume allowed but log error
  }
}


export async function extractContentFromUrl(url: string): Promise<ExtractedWebPageContent> {
  console.log(`[ContentExtractor] Attempting to extract content from URL: ${url}`);
  try {
    // 1. Check robots.txt
    const allowed = await isUrlScrapingAllowed(url);
    if (!allowed) {
      const errorMessage = `Scraping disallowed by robots.txt for ${url}`;
      console.warn(`[ContentExtractor] ${errorMessage}`);
      return {
        title: url,
        textContent: '',
        url: url,
        error: errorMessage,
      };
    }

    // 2. Fetch the webpage with timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout

    let response;
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': 'SkolrBot/1.0 (+https://skolr.com/bot)', // Be a good bot citizen
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorMessage = `Failed to fetch URL: ${url}. Status: ${response.status} ${response.statusText}`;
      console.error(`[ContentExtractor] ${errorMessage}`);
      return { title: url, textContent: '', url, error: errorMessage };
    }

    const html = await response.text();
    console.log(`[ContentExtractor] Successfully fetched HTML for ${url}. Length: ${html.length}`);

    // 3. Parse HTML with JSDOM
    const dom = new JSDOM(html, { url }); // Providing the URL helps Readability resolve relative links if needed
    const document = dom.window.document;

    // 4. Use Readability to extract main content
    const reader = new Readability(document);
    const article = reader.parse();

    if (!article || !article.textContent) {
      console.warn(`[ContentExtractor] Readability could not parse main content for ${url}. Falling back to body.textContent.`);
      // Fallback: try to get all text content if Readability fails
      const bodyText = document.body?.textContent?.replace(/\s\s+/g, ' ').trim() || '';
      const titleFromTag = document.title || url;
      if (!bodyText) {
        const errorMessage = `Failed to extract any meaningful text content from ${url}.`;
        console.error(`[ContentExtractor] ${errorMessage}`);
        return { title: titleFromTag, textContent: '', url, error: errorMessage };
      }
      console.log(`[ContentExtractor] Using fallback text content for ${url}. Length: ${bodyText.length}`);
      return {
        title: titleFromTag,
        textContent: bodyText,
        url: url,
      };
    }

    console.log(`[ContentExtractor] Successfully extracted content using Readability for ${url}. Title: ${article.title}`);
    return {
      title: article.title || url, // Use URL as fallback title
      textContent: article.textContent.replace(/\s\s+/g, ' ').trim(), // Clean up whitespace
      excerpt: article.excerpt ?? undefined,
      url: url,
    };

  } catch (error) {
    const errorMessage = `Error processing URL ${url}: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`[ContentExtractor] ${errorMessage}`, error);
    return {
      title: url,
      textContent: '',
      url: url,
      error: errorMessage,
    };
  }
}