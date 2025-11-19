/**
 * Application constants
 */

/**
 * User roles in the system
 */
export const USER_ROLES = {
  STUDENT: 'student',
  COMPANY: 'company',
  ADMIN: 'admin',
} as const;

/**
 * Booking phases
 */
export const BOOKING_PHASES = {
  CLOSED: 0,
  PHASE_1: 1,
  PHASE_2: 2,
} as const;

/**
 * Booking phase labels
 */
export const PHASE_LABELS = {
  [BOOKING_PHASES.CLOSED]: 'Bookings Closed',
  [BOOKING_PHASES.PHASE_1]: 'Priority Phase',
  [BOOKING_PHASES.PHASE_2]: 'Open Phase',
} as const;

/**
 * Booking status values
 */
export const BOOKING_STATUS = {
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
} as const;



