import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

// IMPORTANT: Backend uses SERVICE_ROLE_KEY to bypass RLS and validate JWTs server-side.
// This key must NEVER be exposed to the client-side (mobile app).
export const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY
);
