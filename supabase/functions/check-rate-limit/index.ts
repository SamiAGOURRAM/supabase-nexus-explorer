// Supabase Edge Function for Server-Side Rate Limiting
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RateLimitRequest {
  email: string;
  action: 'signup' | 'login' | 'check';
}

interface RateLimitResponse {
  allowed: boolean;
  remainingAttempts?: number;
  waitTimeMinutes?: number;
  message?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { email, action }: RateLimitRequest = await req.json()

    // Get client IP address
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                      req.headers.get('x-real-ip') || 
                      'unknown'

    // Rate limit configuration
    const MAX_ATTEMPTS = 5
    const WINDOW_MINUTES = 15

    // Check rate limit using the database function
    const { data: rateLimitCheck, error: rateLimitError } = await supabaseClient
      .rpc('fn_check_rate_limit', {
        p_email: email,
        p_ip_address: ipAddress,
        p_max_attempts: MAX_ATTEMPTS,
        p_window_minutes: WINDOW_MINUTES,
      })

    if (rateLimitError) {
      throw rateLimitError
    }

    // If action is 'check', just return the current status
    if (action === 'check') {
      return new Response(
        JSON.stringify({
          allowed: rateLimitCheck,
          message: rateLimitCheck 
            ? 'Rate limit check passed' 
            : `Too many attempts. Please wait ${WINDOW_MINUTES} minutes.`,
        } as RateLimitResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // If rate limit exceeded, return error
    if (!rateLimitCheck) {
      // Get time until rate limit resets
      const { data: oldestAttempt } = await supabaseClient
        .from('failed_login_attempts')
        .select('attempt_time')
        .or(`email.eq.${email},ip_address.eq.${ipAddress}`)
        .order('attempt_time', { ascending: true })
        .limit(1)
        .single()

      let waitTimeMinutes = WINDOW_MINUTES
      if (oldestAttempt?.attempt_time) {
        const oldestTime = new Date(oldestAttempt.attempt_time).getTime()
        const now = Date.now()
        const elapsedMs = now - oldestTime
        const windowMs = WINDOW_MINUTES * 60 * 1000
        waitTimeMinutes = Math.ceil((windowMs - elapsedMs) / 60000)
      }

      return new Response(
        JSON.stringify({
          allowed: false,
          waitTimeMinutes,
          message: `Too many ${action} attempts. Please try again in ${waitTimeMinutes} minute(s).`,
        } as RateLimitResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429, // Too Many Requests
        }
      )
    }

    // Rate limit check passed
    const { data: attemptCount } = await supabaseClient
      .from('failed_login_attempts')
      .select('id', { count: 'exact', head: true })
      .or(`email.eq.${email},ip_address.eq.${ipAddress}`)
      .gte('attempt_time', new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString())

    const remainingAttempts = MAX_ATTEMPTS - (attemptCount || 0)

    return new Response(
      JSON.stringify({
        allowed: true,
        remainingAttempts: Math.max(0, remainingAttempts),
        message: 'Rate limit check passed',
      } as RateLimitResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Rate limit check error:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        allowed: true, // Fail open for better UX
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
