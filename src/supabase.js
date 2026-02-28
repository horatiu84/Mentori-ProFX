import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables! Check .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    // Keep Supabase REST requests on project anon/publishable key.
    // App JWT is only for custom edge functions authorization.
    fetch: (url, options = {}) => fetch(url, options)
  }
});
