/**
 * Format a number as currency
 * @param {number} amount - The amount to format
 * @param {boolean} compact - Use compact notation for large numbers
 * @param {string} currency - Currency code (default: EUR)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, compact = false, currency = 'EUR') {
  if (compact) {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount);
  }
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency
  }).format(amount);
}
