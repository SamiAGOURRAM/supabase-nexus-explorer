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

    // Get rate limit status using helper
    const { data: statusData, error: statusError } = await supabaseClient.rpc('fn_rate_limit_status', {
      p_email: email,
      p_ip_address: ipAddress,
      p_max_attempts: MAX_ATTEMPTS,
      p_window_minutes: WINDOW_MINUTES,
    })

    if (statusError) {
      throw statusError
    }

    const statusRecord = Array.isArray(statusData) ? statusData[0] : statusData
    const allowed = statusRecord?.allowed ?? true
    const remainingAttempts = statusRecord?.remaining_attempts ?? MAX_ATTEMPTS
    const waitTimeMinutes = statusRecord?.wait_time_minutes ?? 0

    // If action is 'check', just return the current status
    if (action === 'check') {
      return new Response(
        JSON.stringify({
          allowed,
          remainingAttempts,
          waitTimeMinutes,
          message: allowed
            ? 'Rate limit check passed'
            : `Too many attempts. Please wait ${waitTimeMinutes} minute(s).`,
        } as RateLimitResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // If rate limit exceeded, return error
    if (!allowed) {
      return new Response(
        JSON.stringify({
          allowed: false,
          remainingAttempts,
          waitTimeMinutes,
          message: `Too many ${action} attempts. Please try again in ${Math.max(waitTimeMinutes, 1)} minute(s).`,
        } as RateLimitResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429, // Too Many Requests
        }
      )
    }

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
