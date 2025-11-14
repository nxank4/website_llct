/**
 * Format full name to Title Case
 * 
 * This function formats names to a consistent Title Case format,
 * handling both Vietnamese and English names.
 * 
 * Examples:
 * - "nguyễn văn a" → "Nguyễn Văn A"
 * - "john f kennedy" → "John F Kennedy"
 * - "TRẦN THỊ B" → "Trần Thị B"
 * - "tôn nữ thị c" → "Tôn Nữ Thị C"
 * - "mary-jane watson" → "Mary-Jane Watson"
 * 
 * @param name - The name to format (can be in any case)
 * @returns The formatted name in Title Case
 */
export function formatFullName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  // Trim and normalize whitespace
  let formatted = name.trim().replace(/\s+/g, ' ');

  if (formatted.length === 0) {
    return '';
  }

  // Split by spaces and hyphens (preserve hyphens for compound names like "Mary-Jane")
  // Use a regex that captures both spaces and hyphens as separators
  const parts = formatted.split(/([\s-]+)/);

  // Format each part
  const formattedParts = parts.map((part) => {
    // Preserve separators (spaces and hyphens) as-is
    if (part.match(/^[\s-]+$/)) {
      return part;
    }

    // Skip empty strings
    if (part.length === 0) {
      return part;
    }

    // Convert to lowercase first
    const lowerPart = part.toLowerCase();

    // Handle single letters (like "F" in "John F Kennedy")
    if (lowerPart.length === 1) {
      return lowerPart.toUpperCase();
    }

    // Handle Vietnamese characters and English letters
    // Capitalize first character, keep rest lowercase
    const firstChar = lowerPart.charAt(0).toUpperCase();
    const restChars = lowerPart.slice(1);

    return firstChar + restChars;
  });

  // Join parts back together
  formatted = formattedParts.join('');

  // Final cleanup: normalize multiple spaces to single space, but preserve hyphens
  formatted = formatted.replace(/\s+/g, ' ').trim();

  return formatted;
}

/**
 * Test cases for formatFullName
 * Uncomment to test:
 * 
 * console.log(formatFullName("nguyễn văn a")); // "Nguyễn Văn A"
 * console.log(formatFullName("john f kennedy")); // "John F Kennedy"
 * console.log(formatFullName("TRẦN THỊ B")); // "Trần Thị B"
 * console.log(formatFullName("tôn nữ thị c")); // "Tôn Nữ Thị C"
 * console.log(formatFullName("mary-jane watson")); // "Mary-Jane Watson"
 * console.log(formatFullName("  nguyễn   văn   a  ")); // "Nguyễn Văn A"
 * console.log(formatFullName("a")); // "A"
 */

