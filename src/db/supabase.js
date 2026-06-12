import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vtozkuoyptmjbacjlbxt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0b3prdW95cHRtamJhY2psYnh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMTc4NDIsImV4cCI6MjA5NjY5Mzg0Mn0.9QkYul2OwXjNa8q20t4G_ccffBoL1_nhffh9AMdTrhI'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)