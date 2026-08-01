import type { DailyRecord } from '../types/dailyRecord';
import type { AppSettings } from '../types/settings';
import { getActualUnhyuChange } from './vacationUsage';

function normalizeUnhyu(value: number) {
  return Math.round(value * 10) / 10;
}

function getRecordNetUnhyu(records: DailyRecord[], matches: (record: DailyRecord) => boolean) {
  return normalizeUnhyu(
    records
      .filter(matches)
      .reduce((total, record) => total + getActualUnhyuChange(record), 0),
  );
}

function getNextMonthStart(month: string) {
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  const nextYear = monthNumber === 12 ? year + 1 : year;
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;

  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
}

export function getBaseUnhyu(settings: AppSettings, records: DailyRecord[]) {
  const allRecordNetUnhyu = getRecordNetUnhyu(records, () => true);
  const manualCurrentAdjustment = normalizeUnhyu(
    settings.currentUnhyu - allRecordNetUnhyu,
  );

  return normalizeUnhyu(settings.carryOverUnhyu + manualCurrentAdjustment);
}

export function getUnhyuBalanceAtDate(
  settings: AppSettings,
  records: DailyRecord[],
  referenceDate: string,
) {
  const recordNetUnhyu = getRecordNetUnhyu(
    records,
    (record) => record.date <= referenceDate,
  );

  return normalizeUnhyu(getBaseUnhyu(settings, records) + recordNetUnhyu);
}

export function getMonthOpeningUnhyu(
  settings: AppSettings,
  records: DailyRecord[],
  month: string,
) {
  const monthStart = `${month}-01`;
  const recordNetUnhyu = getRecordNetUnhyu(records, (record) => record.date < monthStart);

  return normalizeUnhyu(getBaseUnhyu(settings, records) + recordNetUnhyu);
}

export function getMonthClosingUnhyu(
  settings: AppSettings,
  records: DailyRecord[],
  month: string,
) {
  const nextMonthStart = getNextMonthStart(month);
  const recordNetUnhyu = getRecordNetUnhyu(
    records,
    (record) => record.date < nextMonthStart,
  );

  return normalizeUnhyu(getBaseUnhyu(settings, records) + recordNetUnhyu);
}
