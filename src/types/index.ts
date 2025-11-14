/**
 * Centralized type exports
 * 
 * This file re-exports all types from the database and other type files
 * for convenient importing throughout the application.
 */

// Re-export database types
export * from './database';

// Re-export hook types
export type { EventStats } from '@/hooks/useEventStats';
export type { CompanyStats, ScheduledStudent } from '@/hooks/useCompanyStats';
export type { Event } from '@/hooks/useEvents';
export type { CompanyEvent } from '@/hooks/useCompanyEvents';


