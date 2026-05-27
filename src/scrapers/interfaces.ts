/**
 * 1. The Data Object Contract
 * This matches the exact schema columns we set up in our Supabase PostgreSQL database.
 * Every website scraper MUST clean and structure its data into this format.
 */
export interface NormalizedEvent {
    venue_id: number;      // The exact internal database ID of the venue (1, 2, 3, etc.)
    title: string;         // The clean name of the movie, concert, or performance
    start_time: string;    // Standardized ISO string timestamp (e.g., 2026-05-24T20:00:00Z)
    duration: string | null; // A text representation of time block matching Postgres intervals (e.g., '1 hour 30 mins')
    event_url: string;     // Direct link to the specific event booking page
}

/**
 * 2. The Behavioral Contract (The Adapter Pattern)
 * Any scraper we build must implement this interface. 
 * This ensures our main daily runner script can treat every single scraper exactly the same.
 */
export interface WebsiteAdapter {
    sourceName: string;    // For logging clarity (e.g., "Sinema Transtopia")
    venueId: number;       // Must map to the database primary key of that venue
    targetUrl: string;     // The exact page URL our headless browser needs to visit

    /**
     * The core engine execution block. It must open the page via Playwright,
     * extract the HTML information, and return a clean array of NormalizedEvents.
     */
    scrape(): Promise<NormalizedEvent[]>;
}