import type { DailyRecord } from '../types/dailyRecord';

const STORAGE_KEY = 'unhyu-manager-records';

function readRecords(): DailyRecord[] {
  const storedValue = localStorage.getItem(STORAGE_KEY);

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
