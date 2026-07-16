import type { DailyRecord } from '../types/dailyRecord';

export function normalizeAbsenceUnits(value: unknown) {
  const units = Number(value);
  return Number.isFinite(units) && units >= 0 ? units : undefined;
}

export function getRecordAbsenceUnits(record: Pick<DailyRecord, 'absence' | 'absenceUnits'>) {
  return normalizeAbsenceUnits(record.absenceUnits) ?? (record.absence === true ? 1 : 0);
}
