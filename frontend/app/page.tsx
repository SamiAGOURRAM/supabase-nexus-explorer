import { redirect } from 'next/navigation'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const params = await searchParams
  
  // If there's a confirmation code, redirect to auth callback
  if (params.code) {
    redirect(`/auth/callback?code=${params.code}`)
  }
  
  // Otherwise, redirect to offers page
  redirect('/offers')
}
