/**
 * Formats a full patient name to show only first and last name (no middle name).
 * Handles edge cases like "None" parts from the backend.
 *
 * Examples:
 *   "John Michael Smith" → "John Smith"
 *   "John Smith" → "John Smith"
 *   "John" → "John"
 *   "John None Smith" → "John Smith"
 *   "John Smith None" → "John Smith"
 */
export function formatPatientName(fullName?: string | null): string {
  if (!fullName) return 'N/A';

  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter((part) => part.toLowerCase() !== 'none');

  if (parts.length === 0) return 'N/A';
  if (parts.length <= 2) return parts.join(' ');

  // Return first name + last name only
  return `${parts[0]} ${parts[parts.length - 1]}`;
}
