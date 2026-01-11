/**
 * Get today's date in ISO format (YYYY-MM-DD)
 * @returns {string}
 */
export function getTodayISO() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get the start and end dates for a given month
 * @param {number} year
 * @param {number} month - 1-12
 * @returns {{ startDate: string, endDate: string }}
 */
export function getMonthDateRange(year, month) {
  const lastDay = new Date(year, month, 0).getDate();
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
  return { startDate, endDate };
}

/**
 * Get current year and month
 * @returns {{ year: number, month: number }}
 */
export function getCurrentYearMonth() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1
  };
}

/**
 * Get previous month's year and month
 * @param {number} year
 * @param {number} month - 1-12
 * @returns {{ year: number, month: number }}
 */
export function getPreviousMonth(year, month) {
  if (month === 1) {
    return { year: year - 1, month: 12 };
  }
  return { year, month: month - 1 };
}
