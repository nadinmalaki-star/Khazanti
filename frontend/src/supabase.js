// supabase.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://nygfcqlvxogxytwwgbjt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55Z2ZjcWx2eG9neHl0d3dnYmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyNTEyNTksImV4cCI6MjEwMjgyNzI1OX0.8siHLjdgPREeCDKM2ggHW_JrMmalh2n9Qlz4XuWnGRI";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);