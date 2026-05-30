/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Helper to parse "YYYY-MM-DD" safely in local timezone
export const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Helper to format Date back to "YYYY-MM-DD"
export const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get today's date formatted as YYYY-MM-DD in local time
export const getTodayStr = (): string => {
  return formatLocalDate(new Date());
};

// Add days to standard YYYY-MM-DD string
export const addDays = (dateStr: string, days: number): string => {
  const date = parseLocalDate(dateStr);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
};

// Calculate difference in days between two YYYY-MM-DD strings (inclusive or exclusive)
export const getDaysDiff = (startStr: string, endStr: string): number => {
  const start = parseLocalDate(startStr);
  const end = parseLocalDate(endStr);
  const diffTime = end.getTime() - start.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

// Standard month names
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Get formatted date string (e.g. "May 25, 2026")
export const formatHumanDate = (dateStr: string): string => {
  const date = parseLocalDate(dateStr);
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

// Determine the pxPerDay configuration based on zoom level
export const getPxPerDay = (zoom: 'day' | 'week' | 'month'): number => {
  switch (zoom) {
    case 'day': return 48;   // 1 day = 48px
    case 'week': return 12;  // 1 week (7 days) = 84px
    case 'month': return 4;  // 1 month (30 days) = 120px
    default: return 48;
  }
};

// Calculate timeline boundaries given an array of tasks
export interface TimelineBounds {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  totalDays: number;
}

export const calculateTimelineBounds = (
  tasks: { startDate: string; endDate: string }[],
  zoom: 'day' | 'week' | 'month'
): TimelineBounds => {
  const todayStr = getTodayStr(); // Dynamic "today" matching context
  let minDate = parseLocalDate(todayStr);
  let maxDate = parseLocalDate(todayStr);

  if (tasks.length > 0) {
    let rawMin = tasks[0].startDate;
    let rawMax = tasks[0].endDate;

    tasks.forEach(task => {
      if (getDaysDiff(task.startDate, rawMin) > 0) {
        rawMin = task.startDate;
      }
      if (getDaysDiff(rawMax, task.endDate) > 0) {
        rawMax = task.endDate;
      }
    });

    minDate = parseLocalDate(rawMin);
    maxDate = parseLocalDate(rawMax);
  }

  // Padding based on zoom settings
  if (zoom === 'day') {
    // No padding before or after the first/last tasks for day view
  } else if (zoom === 'week') {
    // Align minDate to Sunday to keep week grid clean, no extra padding weeks
    const day = minDate.getDay();
    minDate.setDate(minDate.getDate() - day);

    // Align maxDate to Saturday
    const maxDay = maxDate.getDay();
    maxDate.setDate(maxDate.getDate() + (6 - maxDay));
  } else {
    // Align minDate to start of month to keep month grid clean, no extra padding months
    minDate.setDate(1); 
    
    // Align maxDate to end of month
    maxDate.setMonth(maxDate.getMonth() + 1);
    maxDate.setDate(0); 
  }

  const startDateStr = formatLocalDate(minDate);
  const endDateStr = formatLocalDate(maxDate);
  const totalDays = getDaysDiff(startDateStr, endDateStr) + 1;

  return {
    startDate: startDateStr,
    endDate: endDateStr,
    totalDays,
  };
};

/**
 * Timeline Column Headers Model
 */
export interface HeaderCell {
  key: string;
  label: string;
  subLabel?: string;
  width: number;
  dateStr?: string;
  isToday?: boolean;
}

export const generateHeaderCells = (
  bounds: TimelineBounds,
  zoom: 'day' | 'week' | 'month'
): { primaryHeaders: HeaderCell[]; secondaryHeaders: HeaderCell[] } => {
  const primaryHeaders: HeaderCell[] = [];
  const secondaryHeaders: HeaderCell[] = [];

  const start = parseLocalDate(bounds.startDate);
  const end = parseLocalDate(bounds.endDate);
  const todayStr = getTodayStr();

  if (zoom === 'day') {
    const pxPerDay = getPxPerDay('day');
    
    // Primary Headers: Months
    // Secondary Headers: Days
    let current = new Date(start);
    let currentMonthStr = '';
    let currentMonthWidth = 0;
    let currentMonthStart: Date | null = null;

    while (current <= end) {
      const dateStr = formatLocalDate(current);
      const isToday = dateStr === todayStr;

      // Primary header consolidation
      const monthLabel = `${FULL_MONTH_NAMES[current.getMonth()]} ${current.getFullYear()}`;
      if (monthLabel !== currentMonthStr) {
        if (currentMonthStart) {
          primaryHeaders.push({
            key: `month-${currentMonthStart.getTime()}`,
            label: currentMonthStr,
            width: currentMonthWidth,
          });
        }
        currentMonthStr = monthLabel;
        currentMonthWidth = 0;
        currentMonthStart = new Date(current);
      }
      currentMonthWidth += pxPerDay;

      // Secondary header (individal days)
      secondaryHeaders.push({
        key: `day-${dateStr}`,
        label: String(current.getDate()),
        subLabel: WEEK_DAYS[current.getDay()],
        width: pxPerDay,
        dateStr,
        isToday,
      });

      current.setDate(current.getDate() + 1);
    }
    // Polish last month entry
    if (currentMonthStart) {
      primaryHeaders.push({
        key: `month-${currentMonthStart.getTime()}`,
        label: currentMonthStr,
        width: currentMonthWidth,
      });
    }

  } else if (zoom === 'week') {
    const pxPerDay = getPxPerDay('week');
    const pxPerWeek = pxPerDay * 7;

    let current = new Date(start);
    // Align starting date to Sunday to keep weeks clean
    const startDay = current.getDay();
    current.setDate(current.getDate() - startDay);

    let currentMonthStr = '';
    let currentMonthWidth = 0;
    let currentMonthStart: Date | null = null;
    let weekIndex = 1;

    while (current <= end) {
      const weekStartStr = formatLocalDate(current);
      const currentWeekEnd = new Date(current);
      currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);
      const weekEndStr = formatLocalDate(currentWeekEnd);

      const monthLabel = `${FULL_MONTH_NAMES[current.getMonth()]} ${current.getFullYear()}`;
      
      // Accumulate parent month columns
      if (monthLabel !== currentMonthStr) {
        if (currentMonthStart) {
          primaryHeaders.push({
            key: `month-week-${currentMonthStart.getTime()}`,
            label: currentMonthStr,
            width: currentMonthWidth,
          });
        }
        currentMonthStr = monthLabel;
        currentMonthWidth = 0;
        currentMonthStart = new Date(current);
      }
      currentMonthWidth += pxPerWeek;

      // Secondary Header: Week Number & Date Range
      const formattedRange = `${current.getDate()} ${MONTH_NAMES[current.getMonth()]} - ${currentWeekEnd.getDate()} ${MONTH_NAMES[currentWeekEnd.getMonth()]}`;
      const isTodayInThisWeek = (parseLocalDate(todayStr) >= current && parseLocalDate(todayStr) <= currentWeekEnd);

      secondaryHeaders.push({
        key: `week-${weekStartStr}`,
        label: `W${weekIndex++}`,
        subLabel: formattedRange,
        width: pxPerWeek,
        dateStr: weekStartStr,
        isToday: isTodayInThisWeek,
      });

      current.setDate(current.getDate() + 7);
    }
    
    if (currentMonthStart) {
      primaryHeaders.push({
        key: `month-week-${currentMonthStart.getTime()}`,
        label: currentMonthStr,
        width: currentMonthWidth,
      });
    }

  } else if (zoom === 'month') {
    const pxPerDay = getPxPerDay('month');

    let current = new Date(start);
    current.setDate(1); // Set to start of month

    let currentYearStr = '';
    let currentYearWidth = 0;
    let currentYearStart: Date | null = null;

    while (current <= end) {
      const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
      const monthWidth = daysInMonth * pxPerDay;

      // Primary header: Year
      const yearLabel = String(current.getFullYear());
      if (yearLabel !== currentYearStr) {
        if (currentYearStart) {
          primaryHeaders.push({
            key: `year-${currentYearStart.getTime()}`,
            label: currentYearStr,
            width: currentYearWidth,
          });
        }
        currentYearStr = yearLabel;
        currentYearWidth = 0;
        currentYearStart = new Date(current);
      }
      currentYearWidth += monthWidth;

      // Secondary header: Month Name
      const monthDateStr = formatLocalDate(current);
      const today = parseLocalDate(todayStr);
      const isTodayInThisMonth = (today.getFullYear() === current.getFullYear() && today.getMonth() === current.getMonth());

      secondaryHeaders.push({
        key: `month-${monthDateStr}`,
        label: FULL_MONTH_NAMES[current.getMonth()],
        subLabel: yearLabel,
        width: monthWidth,
        dateStr: monthDateStr,
        isToday: isTodayInThisMonth,
      });

      current.setMonth(current.getMonth() + 1);
    }

    if (currentYearStart) {
      primaryHeaders.push({
        key: `year-${currentYearStart.getTime()}`,
        label: currentYearStr,
        width: currentYearWidth,
      });
    }
  }

  return { primaryHeaders, secondaryHeaders };
};
