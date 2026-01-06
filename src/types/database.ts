/**
 * Database type definitions
 * 
 * TypeScript types matching the Supabase database schema.
 * These types are used throughout the application for type safety.
 */

/**
 * User roles in the system
 */
export type UserRole = 'student' | 'company' | 'admin';

/**
 * Event configuration settings
 */
export type EventConfig = {
  id: number;
  event_date: string;
  phase1_start: string;
  phase1_end: string;
  phase2_start: string;
  phase2_end: string;
  current_phase: number;
  phase1_booking_limit: number;
  phase2_booking_limit: number;
};

/**
 * User profile information
 * Extends Supabase auth.users with additional fields
 */
export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  is_deprioritized: boolean;
  account_approved: boolean;
  created_at: string;
};

/**
 * Company information
 */
export type Company = {
  id: string;
  profile_id: string | null;
  company_name: string;
  company_code: string | null;
  industry?: string | null;
  description?: string | null;
  website?: string | null;
  logo_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: string | null;
  company_size?: string | null;
  is_verified: boolean;
  verified_at?: string | null;
  created_at: string;
};

/**
 * Recruitment event
 */
export type Event = {
  id: string;
  name: string;
  date: string;
  location: string | null;
  description?: string | null;
  is_active: boolean;
  created_at: string;
};

/**
 * Job/internship offer
 */
export type Offer = {
  id: string;
  company_id: string;
  event_id: string;
  title: string;
  description: string;
  interest_tag: 'Opérationnel' | 'Administratif';
  is_active: boolean;
  created_at: string;
};

/**
 * Interview time slot
 */
export type EventSlot = {
  id: string;
  event_id: string;
  company_id: string;
  offer_id: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  is_booked: boolean;
  created_at: string;
};

/**
 * Student booking for an interview slot
 */
export type Booking = {
  id: string;
  slot_id: string;
  student_id: string;
  status: 'confirmed' | 'cancelled';
  booking_phase: number;
  created_at: string;
  cancelled_at?: string;
};

/**
 * Event slot with related company and offer details
 */
export type SlotWithDetails = EventSlot & {
  company: Company;
  offer: Offer;
};

/**
 * Booking with related slot and details
 */
export type BookingWithDetails = Booking & {
  slot: SlotWithDetails;
};

/**
 * Statistics response for booking limits
 */
export type StatsResponse = {
  current_bookings: number;
  max_bookings: number;
  remaining_bookings: number;
};
