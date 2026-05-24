const pad2 = (value) => String(value).padStart(2, "0");

export function toDateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function toMonthKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

export function normalizeScheduleDays(raw) {
  if (!raw) return [];
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];

  const numericDays = value
    .map((item) => {
      if (typeof item === "number") return item;
      const key = String(item).trim().toLowerCase();
      return (
        {
          sunday: 0,
          cn: 0,
          monday: 1,
          mon: 1,
          t2: 1,
          tuesday: 2,
          tue: 2,
          t3: 2,
          wednesday: 3,
          wed: 3,
          t4: 3,
          thursday: 4,
          thu: 4,
          t5: 4,
          friday: 5,
          fri: 5,
          t6: 5,
          saturday: 6,
          sat: 6,
          t7: 6,
        }[key] ?? Number.NaN
      );
    })
    .filter((item) => Number.isInteger(item));

  const usesJsConvention = numericDays.includes(0);
  return [
    ...new Set(
      numericDays
        .map((day) => (usesJsConvention ? day : day >= 1 && day <= 7 ? day - 1 : day))
        .filter((day) => day >= 0 && day <= 6)
    ),
  ].sort((a, b) => a - b);
}

export function countCalendarRowsInMonth(year, monthIndex) {
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  return Math.ceil((firstWeekday + daysInMonth) / 7);
}

export function countScheduleDaysInMonth(year, monthIndex, scheduleDays) {
  if (!scheduleDays.length) return 0;
  const wanted = new Set(scheduleDays);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  let count = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    if (wanted.has(new Date(year, monthIndex, day).getDay())) count += 1;
  }
  return count;
}
