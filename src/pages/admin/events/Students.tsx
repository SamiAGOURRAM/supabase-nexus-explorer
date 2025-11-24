import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

/**
 * EventStudents - Redirects to unified Students page with eventId query parameter
 * This component exists for backward compatibility with existing routes
 */
export default function EventStudents() {
  const navigate = useNavigate()
  const { id: eventId } = useParams<{ id: string }>()

  useEffect(() => {
    if (eventId) {
      navigate(`/admin/students?eventId=${eventId}`, { replace: true })
    } else {
      navigate('/admin/students', { replace: true })
    }
  }, [eventId, navigate])

  return null
}
