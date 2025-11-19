import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

/**
 * EventCompanies - Redirects to unified Companies page with eventId query parameter
 * This component exists for backward compatibility with existing routes
 */
export default function EventCompanies() {
  const navigate = useNavigate()
  const { id: eventId } = useParams<{ id: string }>()

  useEffect(() => {
    if (eventId) {
      navigate(`/admin/companies?eventId=${eventId}`, { replace: true })
    } else {
      navigate('/admin/companies', { replace: true })
    }
  }, [eventId, navigate])

  return null
}
