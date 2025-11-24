/**
 * Application Constants
 */

export const USER_ROLES = {
  ADMIN: 'admin',
  COMPANY: 'company',
  STUDENT: 'student',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const APP_NAME = 'Supabase Nexus Explorer';

export const BOOKING_PHASES = {
  CLOSED: 0,
  PHASE_1: 1,
  PHASE_2: 2,
} as const;