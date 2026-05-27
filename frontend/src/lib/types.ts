export interface Venue {
  id: number;
  name: string;
  address: string | null;
  website_url: string | null;
  source_type: 'public' | 'personal';
  created_at: string;
}

export interface Event {
  id: number;
  venue_id: number;
  title: string;
  start_time: string;
  duration: string | null;
  event_url: string | null;
  created_at: string;
  venue?: Venue;
}
