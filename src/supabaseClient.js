import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://otijertgeuklhtclyutm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90aWplcnRnZXVrbGh0Y2x5dXRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3OTI2MTksImV4cCI6MjA2NzM2ODYxOX0.75nbhui02I-hqRVAcamrmMeMnY-g_Sx2gcx8Q4smEJA';
export const supabase = createClient(supabaseUrl, supabaseKey); 