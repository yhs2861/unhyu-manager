import type { DailyRecord } from '../types/dailyRecord';
import type { AppSettings } from '../types/settings';
import { monthKey } from './date';
import { hasVacationUsage } from './vacationUsage';

export function isBirthdayVacationMonth(settings: AppSettings, date: string) {
  const month = Number(date.slice(5, 7));
  return settings.birthdayMonth >= 1 && settings.birthdayMonth <= 12 && month === settings.birthdayMonth;
}

export function hasBirthdayVacationRecord(
  records: DailyRecord[],
  date: string,
  excludedRecordId?: string,
) {
  const targetMonth = monthKey(date);

  return records.some((record) => {
    return (
      record.id !== excludedRecordId &&
      hasVacationUsage(record, 'birthday') &&
      monthKey(record.date) === targetMonth
    );
  });
}

export function getBirthdayVacationRemaining(
  settings: AppSettings,
  records: DailyRecord[],
  date: string,
) {
  if (!isBirthdayVacationMonth(settings, date)) {
    return 0;
  }

  return hasBirthdayVacationRecord(records, date) ? 0 : 1;
}

export function formatBirthdaySetting(settings: AppSettings) {
  if (settings.birthdayMonth < 1 || settings.birthdayMonth > 12) {
    return '생일 미설정';
  }

  if (settings.birthdayDay < 1 || settings.birthdayDay > 31) {
    return `${settings.birthdayMonth}월`;
  }

  return `${settings.birthdayMonth}월 ${settings.birthdayDay}일`;
}
