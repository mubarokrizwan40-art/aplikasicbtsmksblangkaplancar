import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xepalivbcxdshtfjvglj.supabase.co'

// Ganti teks di bawah ini dengan kunci 'eyJ...' yang baru saja kamu copy!
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlcGFsaXZiY3hkc2h0Zmp2Z2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MzMzNjksImV4cCI6MjA5NjUwOTM2OX0.MstQPFgjeEuGBYscyMiEtykh-8vOOEEioi5GBrHIf74'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)