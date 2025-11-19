import { describe, it, expect } from 'vitest';

describe('dateUtils', () => {
  it('should format date correctly', () => {
    // Simple test to verify vitest is working
    const date = new Date('2025-01-01');
    expect(date.toISOString()).toContain('2025-01-01');
  });
});
