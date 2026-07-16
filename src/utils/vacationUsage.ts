import type { DailyRecord } from '../types/dailyRecord';
import type { VacationType, VacationUsages } from '../types/work';

export const vacationUsageTypes = ['unhyu', 'ilhyu', 'special', 'birthday'] as const;

export type VacationUsageType = (typeof vacationUsageTypes)[number];

export function createEmptyVacationUsages(): Required<VacationUsages> {
  return {
    unhyu: 0,
    ilhyu: 0,
    special: 0,
    birthday: 0,
  };
}

export function normalizeVacationUsages(usages?: VacationUsages): Required<VacationUsages> {
  const normalizedUsages = createEmptyVacationUsages();

  if (!usages) {
    return normalizedUsages;
  }

  vacationUsageTypes.forEach((type) => {
    const value = Number(usages[type] ?? 0);
    normalizedUsages[type] = Number.isFinite(value) && value > 0 ? value : 0;
  });

  return normalizedUsages;
}

export function getVacationUsageTotal(usages: VacationUsages) {
  const normalizedUsages = normalizeVacationUsages(usages);

  return vacationUsageTypes.reduce((total, type) => total + normalizedUsages[type], 0);
}

export function getRecordVacationUsages(record: DailyRecord): Required<VacationUsages> {
  const usages = createEmptyVacationUsages();

  if (record.difference >= 0) {
    return usages;
  }

  const normalizedSavedUsages = normalizeVacationUsages(record.vacationUsages);

  if (getVacationUsageTotal(normalizedSavedUsages) > 0) {
    return normalizedSavedUsages;
  }

  // Legacy absence-only records never consumed vacation. Composite records carry
  // explicit vacationUsages, handled above.
  if (record.absence) {
    return usages;
  }

  const requiredVacation = Math.abs(record.difference);

  if (record.vacationType === 'none') {
    usages.unhyu = requiredVacation;
    return usages;
  }

  if (record.vacationType === 'unhyu') {
    usages.unhyu = requiredVacation;
    return usages;
  }

  if (record.vacationType === 'ilhyu') {
    usages.ilhyu = Math.ceil(requiredVacation);
    return usages;
  }

  // Legacy special/birthday records were applied as one available vacation day even if
  // the underlying difference was -2, so keep that interpretation for old backups.
  usages[record.vacationType] = 1;
  return usages;
}

export function getActualUnhyuChange(record: DailyRecord) {
  if (record.difference > 0) {
    return record.difference;
  }

  if (record.difference === 0) {
    return 0;
  }

  return -getRecordVacationUsages(record).unhyu;
}

export function isHalfDayAutomaticUnhyu(record: DailyRecord) {
  return (
    record.productWork === 'dayNight' &&
    record.carWork === 'overtime' &&
    record.difference === -0.5
  );
}

export function isFullDayAutomaticUnhyu(record: DailyRecord) {
  return record.productWork === 'dayNight' && record.carWork === 'day' && record.difference === -1;
}

export function hasVacationUsage(record: DailyRecord, type: VacationUsageType) {
  return getRecordVacationUsages(record)[type] > 0;
}

export function hasCountableUnhyuUsage(record: DailyRecord) {
  return hasVacationUsage(record, 'unhyu') && !isHalfDayAutomaticUnhyu(record);
}

export function getPrimaryVacationType(usages: VacationUsages): VacationType {
  const normalizedUsages = normalizeVacationUsages(usages);
  const primaryType = vacationUsageTypes.find((type) => normalizedUsages[type] > 0);

  return primaryType ?? 'none';
}

export function compactVacationUsages(usages?: VacationUsages): VacationUsages | undefined {
  const normalizedUsages = normalizeVacationUsages(usages);
  const compactedUsages: VacationUsages = {};

  vacationUsageTypes.forEach((type) => {
    if (normalizedUsages[type] > 0) {
      compactedUsages[type] = normalizedUsages[type];
    }
  });

  return Object.keys(compactedUsages).length > 0 ? compactedUsages : undefined;
}
