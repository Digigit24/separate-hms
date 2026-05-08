/**
 * Extract and format error messages from API responses
 * Handles various error response structures
 */
export function extractErrorMessage(error: any): string {
  // Handle axios error responses
  if (error?.response?.data) {
    const data = error.response.data;

    // Check for details field with nested errors (e.g., from field validation)
    if (data.details && typeof data.details === 'string') {
      // Extract actual field errors from details string
      // Format: "Failed to create user: {'phone': [ErrorDetail(string='...', code='...')]}"
      const fieldErrorMatch = data.details.match(/'([^']+)':\s*\[ErrorDetail\(string='([^']+)',/);
      if (fieldErrorMatch) {
        const fieldName = fieldErrorMatch[1];
        const errorMessage = fieldErrorMatch[2];
        return `${fieldName}: ${errorMessage}`;
      }
      return data.details;
    }

    // Check for nested field errors (Django REST Framework style)
    if (typeof data === 'object' && !data.error && !data.message) {
      const fieldErrors: string[] = [];
      for (const [field, errors] of Object.entries(data)) {
        if (Array.isArray(errors)) {
          errors.forEach((err: any) => {
            const msg = typeof err === 'string' ? err : err.message || err.detail || String(err);
            fieldErrors.push(`${field}: ${msg}`);
          });
        } else if (typeof errors === 'string') {
          fieldErrors.push(`${field}: ${errors}`);
        }
      }
      if (fieldErrors.length > 0) {
        return fieldErrors.join('\n');
      }
    }

    // Check for error field
    if (data.error && typeof data.error === 'string') {
      return data.error;
    }

    // Check for message field
    if (data.message && typeof data.message === 'string') {
      return data.message;
    }

    // Check for response_data with nested error
    if (data.response_data?.error) {
      return data.response_data.error;
    }

    // Check for non_field_errors
    if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
      return data.non_field_errors
        .map((err: any) => (typeof err === 'string' ? err : err.message || String(err)))
        .join('\n');
    }
  }

  // Handle string error messages
  if (error?.message) {
    return error.message;
  }

  // Default error message
  return 'An unexpected error occurred';
}

/**
 * Parse and format error messages for display in UI
 * Returns an array of error messages (one per line)
 */
export function parseErrorMessages(error: any): string[] {
  const message = extractErrorMessage(error);
  return message.split('\n').filter(msg => msg.trim().length > 0);
}
