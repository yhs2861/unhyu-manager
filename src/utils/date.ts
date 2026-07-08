export function today() {
  return new Date().toLocaleDateString('sv-SE');
}

export function monthKey(date: string) {
  return date.slice(0, 7);
}

const koreanWeekdays = ['일', '월', '화', '수', '목', '금', '토'];

export function dateFromString(date: string) {
  const [year, month, day] = date.split('-').map(Number);

  return new Date(year, month - 1, day);
}

export function formatDateWithWeekday(date: string) {
  const weekday = koreanWeekdays[dateFromString(date).getDay()];

  return `${date} (${weekday})`;
}

export function addDays(date: string, dayOffset: number) {
  const nextDate = dateFromString(date);
  nextDate.setDate(nextDate.getDate() + dayOffset);

  return nextDate.toLocaleDateString('sv-SE');
}

export function formatKoreanMonth(year: number, month: number) {
  return `${year}년 ${month}월`;
}
