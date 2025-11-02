export type UserRole = 'student' | 'company' | 'admin'
export type BookingStatus = 'confirmed' | 'cancelled'
export type InterestTag = 'Opérationnel' | 'Administratif'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  is_deprioritized: boolean
  phone: string | null
  created_at: string
  updated_at: string
}

export interface Company {
  id: string
  profile_id: string
  company_name: string
  description: string | null
  logo_url: string | null
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface Offer {
  id: string
  company_id: string
  title: string
  description: string
  interest_tag: InterestTag
  requirements: string | null
  created_at: string
  updated_at: string
}

export interface EventConfig {
  id: number
  event_date: string
  phase1_start: string
  phase1_end: string
  phase2_start: string
  phase2_end: string
  current_phase: 0 | 1 | 2
  phase1_booking_limit: number
  phase2_booking_limit: number
  slot_duration_minutes: number
  slot_buffer_minutes: number
  slot_capacity: number
  created_at: string
  updated_at: string
}

export interface EventSlot {
  id: string
  company_id: string
  offer_id: string
  start_time: string
  end_time: string
  capacity: number
  created_at: string
}

export interface Booking {
  id: string
  student_id: string
  slot_id: string
  status: BookingStatus
  booking_phase: 1 | 2
  created_at: string
  cancelled_at: string | null
}

export interface BookingAttempt {
  id: string
  student_id: string | null
  slot_id: string | null
  success: boolean
  error_code: string | null
  error_message: string | null
  ip_address: string | null
  user_agent: string | null
  response_time_ms: number | null
  created_at: string
}

// Extended types with joins
export interface SlotWithDetails extends EventSlot {
  company: Company
  offer: Offer
  bookings_count?: number
}

export interface BookingWithDetails extends Booking {
  slot: SlotWithDetails
}

// Function response types
export interface BookingResponse {
  success: boolean
  booking_id?: string
  error_code?: string
  error_message?: string
  message?: string
}

export interface StatsResponse {
  success: boolean
  current_bookings?: number
  max_bookings?: number
  remaining_bookings?: number
  current_phase?: number
  error_code?: string
}
