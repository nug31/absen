import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kshlsenwwkxkqoknydoj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzaGxzZW53d2t4a3Fva255ZG9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNjE3NTIsImV4cCI6MjA5OTgzNzc1Mn0.ddPKI9Fv4YntQ16m7WNOuLhuyNRAYB7c5GFLj5UxeOY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
