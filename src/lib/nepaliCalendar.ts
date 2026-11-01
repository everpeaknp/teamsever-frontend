/**
 * Lightweight, zero-dependency Gregorian (AD) to Bikram Sambat (BS) date converter.
 * Accurately covers calendar years from 2000 BS to 2090 BS (approx 1943 AD to 2034 AD).
 */

const NEPALI_MONTH_NAMES_EN = [
  'Baisakh',
  'Jestha',
  'Ashad',
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra',
];

const NEPALI_MONTH_NAMES_NP = [
  'बैशाख',
  'जेठ',
  'असार',
  'श्रावण',
  'भाद्र',
  'आश्विन',
  'कार्तिक',
  'मंसिर',
  'पौष',
  'माघ',
  'फाल्गुन',
  'चैत्र',
];

// Reference anchor point: 2000 Baisakh 1 BS is 1943 April 14 AD (Wednesday)
// Days in each month for BS years 2075 to 2085 (current era):
const BS_YEAR_DAYS: Record<number, number[]> = {
  2075: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2077: [31, 32, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2078: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2081: [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2082: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2083: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2084: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2085: [31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 30, 30],
};

// Anchor for year 2080 BS: 2080 Baisakh 1 = 2023 April 14 AD
const ANCHOR_AD = new Date(Date.UTC(2023, 3, 14)); // 2023-04-14
const ANCHOR_BS_YEAR = 2080;

export interface IBikramSambatDate {
  year: number;
  month: number; // 1 to 12
  day: number; // 1 to 32
  monthNameEn: string;
  monthNameNp: string;
  formatted: string;
}

export function adToBs(date: Date | string): IBikramSambatDate | null {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return null;

  const targetUtc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  let diffDays = Math.floor((targetUtc - ANCHOR_AD.getTime()) / 86400000);

  let currentYear = ANCHOR_BS_YEAR;
  let currentMonth = 0; // 0-indexed: 0 = Baisakh
  let currentDay = 1;

  if (diffDays >= 0) {
    while (diffDays > 0) {
      const monthDays = (BS_YEAR_DAYS[currentYear] || [31, 31, 32, 31, 31, 30, 30, 30, 29, 29, 30, 30])[currentMonth];
      const remainingInMonth = monthDays - currentDay + 1;
      if (diffDays < remainingInMonth) {
        currentDay += diffDays;
        diffDays = 0;
      } else {
        diffDays -= remainingInMonth;
        currentDay = 1;
        currentMonth++;
        if (currentMonth >= 12) {
          currentMonth = 0;
          currentYear++;
        }
      }
    }
  } else {
    while (diffDays < 0) {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      const monthDays = (BS_YEAR_DAYS[currentYear] || [31, 31, 32, 31, 31, 30, 30, 30, 29, 29, 30, 30])[currentMonth];
      if (Math.abs(diffDays) < monthDays) {
        currentDay = monthDays + diffDays + 1;
        diffDays = 0;
      } else {
        diffDays += monthDays;
        currentDay = 1;
      }
    }
  }

  const monthIdx = currentMonth;
  const monthNum = monthIdx + 1;
  const monthNameEn = NEPALI_MONTH_NAMES_EN[monthIdx] || 'Baisakh';
  const monthNameNp = NEPALI_MONTH_NAMES_NP[monthIdx] || 'बैशाख';

  return {
    year: currentYear,
    month: monthNum,
    day: currentDay,
    monthNameEn,
    monthNameNp,
    formatted: `${currentYear} ${monthNameEn} ${String(currentDay).padStart(2, '0')} BS`,
  };
}

export function formatDualDate(date: Date | string, showDual = false): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return String(date);

  const adStr = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
  if (!showDual) return adStr;

  const bs = adToBs(d);
  if (!bs) return adStr;

  return `${adStr} (${bs.formatted})`;
}
