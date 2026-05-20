/**
 * Pregnancy clinical calculation utilities.
 */

/**
 * Calculates the Estimated Due Date (EDD) from the Last Menstrual Period (LMP) date
 * using Naegele's rule (LMP + 280 days / 40 weeks).
 * 
 * @param lmpDateStr Last Menstrual Period date in YYYY-MM-DD format
 * @returns Estimated Due Date in YYYY-MM-DD format
 */
export function calculateEDD(lmpDateStr: string): string {
  if (!lmpDateStr) return '';
  const lmp = new Date(lmpDateStr);
  if (isNaN(lmp.getTime())) return '';
  
  // Naegele's rule: LMP + 280 days
  const edd = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000);
  
  // Format as YYYY-MM-DD in local time
  const year = edd.getFullYear();
  const month = String(edd.getMonth() + 1).padStart(2, '0');
  const day = String(edd.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Calculates current week of pregnancy from Last Menstrual Period (LMP) date.
 * 
 * @param lmpDateStr Last Menstrual Period date in YYYY-MM-DD format
 * @returns Complete weeks elapsed (gestational age)
 */
export function calculateWeeks(lmpDateStr: string): number {
  if (!lmpDateStr) return 0;
  const lmp = new Date(lmpDateStr);
  if (isNaN(lmp.getTime())) return 0;
  
  const now = new Date();
  
  // Build UTC dates to ignore daylight saving variations of different time zones
  const lmpUtc = Date.UTC(lmp.getFullYear(), lmp.getMonth(), lmp.getDate());
  const nowUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffTime = nowUtc - lmpUtc;
  if (diffTime < 0) return 0; // Future date
  
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(diffDays / 7);
  
  // Typically pregnancies are capped at 42-45 weeks, let's clamp at a reasonable limit (e.g., 44)
  return Math.min(Math.max(0, weeks), 44);
}
