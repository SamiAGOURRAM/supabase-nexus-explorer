/**
 * Utility functions for handling Supabase nested query types
 * 
 * Supabase's TypeScript types don't always correctly infer nested query results,
 * especially when using joins and nested selects. These utilities provide type-safe
 * ways to extract and transform nested data from Supabase queries.
 */

/**
 * Safely extracts a nested object from a Supabase query result.
 * 
 * Supabase nested queries can return objects, arrays, or null. This function
 * validates and extracts a single object from the result.
 * 
 * @template T - The expected type of the nested object
 * @param value - The value from Supabase query (could be object, array, or null)
 * @returns The extracted object, or null if invalid
 * 
 * @example
 * ```typescript
 * const event = extractNestedObject<CompanyEvent>(participation.events);
 * if (event) {
 *   // event is safely typed as CompanyEvent
 * }
 * ```
 */
export function extractNestedObject<T>(value: unknown): T | null {
  if (value === null || value === undefined) {
    return null;
  }
  
  if (typeof value !== 'object') {
    return null;
  }
  
  if (Array.isArray(value)) {
    return null;
  }
  
  return value as T;
}

/**
 * Safely extracts a nested array from a Supabase query result.
 * 
 * @template T - The expected type of array elements
 * @param value - The value from Supabase query
 * @returns The extracted array, or empty array if invalid
 * 
 * @example
 * ```typescript
 * const profiles = extractNestedArray<{ full_name: string }>(booking.profiles);
 * // profiles is safely typed as { full_name: string }[]
 * ```
 */
export function extractNestedArray<T>(value: unknown): T[] {
  if (!Array.isArray(value)) {
    return [];
  }
  
  return value as T[];
}

/**
 * Safely extracts the first element from a nested array or object.
 * Useful when Supabase returns an array but you expect a single object.
 * 
 * @template T - The expected type of the object
 * @param value - The value from Supabase query
 * @param fallback - Optional fallback value if extraction fails
 * @returns The extracted object, or fallback if invalid
 * 
 * @example
 * ```typescript
 * const profile = extractFirstFromNested<{ full_name: string }>(
 *   booking.profiles,
 *   { full_name: 'Unknown' }
 * );
 * ```
 */
export function extractFirstFromNested<T>(
  value: unknown,
  fallback: T
): T {
  if (Array.isArray(value) && value.length > 0) {
    return value[0] as T;
  }
  
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as T;
  }
  
  return fallback;
}

/**
 * Type-safe assertion for Supabase nested query results.
 * 
 * This is a helper for the common pattern of `as unknown as T` when dealing
 * with Supabase's type inference limitations. Use this when you're certain
 * about the runtime type but TypeScript can't infer it.
 * 
 * @template T - The target type
 * @param value - The value to assert
 * @returns The value typed as T
 * 
 * @example
 * ```typescript
 * const slot = assertSupabaseType<{ offer_id: string }>(booking.slot);
 * ```
 */
export function assertSupabaseType<T>(value: unknown): T {
  return value as unknown as T;
}

/**
 * Safely gets a value from a Map, converting undefined to null.
 * 
 * @template K - Map key type
 * @template V - Map value type
 * @param map - The Map to query
 * @param key - The key to look up
 * @returns The value or null if not found
 * 
 * @example
 * ```typescript
 * const offer = getFromMapOrNull(offersMap, offerId);
 * // offer is V | null (not V | undefined)
 * ```
 */
export function getFromMapOrNull<K, V>(
  map: Map<K, V>,
  key: K
): V | null {
  return map.get(key) ?? null;
}

/**
 * Type guard to check if a value is a non-null object (not an array).
 * 
 * @param value - The value to check
 * @returns True if value is a non-null, non-array object
 */
export function isNonNullObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

