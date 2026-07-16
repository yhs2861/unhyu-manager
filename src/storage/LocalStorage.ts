import type { DailyRecord } from '../types/dailyRecord';
import { compactVacationUsages } from '../utils/vacationUsage';
import { normalizeAbsenceUnits } from '../utils/absence';

const STORAGE_KEY = 'unhyu-manager-records';

function readRecords(): DailyRecord[] {
  let storedValue: string | null;

  try {
    storedValue = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.error('[Storage] Unable to read records:', error);
    return [];
  }

  if (!storedValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(storedValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.map((record) => ({
      ...record,
      absence: record.absence === true,
      absenceUnits: normalizeAbsenceUnits(record.absenceUnits),
      vacationUsages: compactVacationUsages(record.vacationUsages),
    }));
  } catch {
    return [];
  }
}

function writeRecords(records: DailyRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function normalizeRecords(records: DailyRecord[]) {
  return records.map((record) => ({
    ...record,
    absence: record.absence === true,
    absenceUnits: normalizeAbsenceUnits(record.absenceUnits),
    vacationUsages: compactVacationUsages(record.vacationUsages),
  }));
}

export function saveRecord(record: DailyRecord) {
  const records = readRecords();
  writeRecords([...records, record]);
  return record;
}

export function getRecords() {
  return readRecords();
}

export function getRecordByDate(date: string) {
  return readRecords().find((record) => record.date === date);
}

export function updateRecord(record: DailyRecord) {
  const records = readRecords();
  const nextRecords = records.map((currentRecord) =>
    currentRecord.id === record.id ? record : currentRecord,
  );

  writeRecords(nextRecords);
  return record;
}

export function deleteRecord(id: string) {
  const records = readRecords();
  writeRecords(records.filter((record) => record.id !== id));
}

export function replaceRecords(records: DailyRecord[]) {
  const nextRecords = normalizeRecords(records);
  writeRecords(nextRecords);
  return nextRecords;
}
