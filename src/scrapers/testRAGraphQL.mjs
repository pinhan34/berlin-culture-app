// Test RA GraphQL for individual event lookup by ID
// Same endpoint the ResidentAdvisor adapter already uses successfully
const RA_GRAPHQL_URL = 'https://ra.co/graphql';

const EVENT_QUERY = `
  query GET_EVENT($id: ID!) {
    event(id: $id) {
      title
      venue { name }
      date
      startTime
    }
  }
`;

// Also test the listing query with event ID filter (alternative)
const LISTING_QUERY = `query GET_DEFAULT_EVENTS_LISTING($indices: [IndexType!], $pageSize: Int, $page: Int, $aggregations: [ListingAggregationType!], $filters: [FilterInput]) {
    listing(indices: $indices, pageSize: $pageSize, page: $page, aggregations: $aggregations, filters: $filters) {
        data { ... on Event { id title contentUrl startTime date venue { id name } } }
        totalResults
    }
}`;

const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://ra.co/events/2426265',
    'Origin': 'https://ra.co',
};

const testIds = ['2426265', '2418171'];

for (const id of testIds) {
    console.log(`\n=== Testing event ID ${id} ===`);

    // Try direct event query
    try {
        const r = await fetch(RA_GRAPHQL_URL, {
            method: 'POST',
            headers,
            body: JSON.stringify({ operationName: 'GET_EVENT', query: EVENT_QUERY, variables: { id } }),
            signal: AbortSignal.timeout(8000),
        });
        const json = await r.json();
        const event = json.data?.event;
        if (event?.title) {
            console.log(`  GET_EVENT -> title: "${event.title}", venue: "${event.venue?.name ?? '—'}"`);
        } else {
            console.log(`  GET_EVENT -> HTTP ${r.status}, response:`, JSON.stringify(json).substring(0, 200));
        }
    } catch(e) { console.log('  GET_EVENT error:', e.message); }

    // Try listing query with EVENT_ID filter
    try {
        const r = await fetch(RA_GRAPHQL_URL, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                operationName: 'GET_DEFAULT_EVENTS_LISTING',
                query: LISTING_QUERY,
                variables: {
                    indices: ['EVENT'],
                    pageSize: 1,
                    page: 1,
                    aggregations: [],
                    filters: [{ type: 'EVENT', value: id }],
                },
            }),
            signal: AbortSignal.timeout(8000),
        });
        const json = await r.json();
        const events = json.data?.listing?.data ?? [];
        if (events.length > 0) {
            console.log(`  LISTING filter -> title: "${events[0].title}", venue: "${events[0].venue?.name ?? '—'}"`);
        } else {
            console.log(`  LISTING filter -> HTTP ${r.status}, response:`, JSON.stringify(json).substring(0, 200));
        }
    } catch(e) { console.log('  LISTING error:', e.message); }
}
