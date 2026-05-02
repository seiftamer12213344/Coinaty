import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// This exports the 'supabase' object so you can use it in other files
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
