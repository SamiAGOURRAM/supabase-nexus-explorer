import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  console.log('Auth callback triggered with code:', code ? 'present' : 'missing')

  if (code) {
    const supabase = await createClient()
    
    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    console.log('Exchange code result:', { 
      hasUser: !!data.user, 
      error: error?.message 
    })
    
    if (error) {
      console.error('Auth exchange error:', error)
      return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin))
    }
    
    if (data.user) {
      // Wait a bit for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      console.log('Profile check:', { 
        hasProfile: !!profile, 
        role: profile?.role,
        error: profileError?.message 
      })

      if (profile) {
        // Redirect based on role
        let redirectPath = '/offers'
        switch (profile.role) {
          case 'student':
            redirectPath = '/student'
            break
          case 'company':
            redirectPath = '/company'
            break
          case 'admin':
            redirectPath = '/admin'
            break
        }
        
        console.log('Redirecting to:', redirectPath)
        return NextResponse.redirect(new URL(redirectPath, requestUrl.origin))
      }

      // If no profile exists, redirect to offers
      console.log('No profile found, redirecting to /offers')
      return NextResponse.redirect(new URL('/offers', requestUrl.origin))
    }
  }

  // Return to login on error
  console.log('No code provided, redirecting to login')
  return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin))
}
