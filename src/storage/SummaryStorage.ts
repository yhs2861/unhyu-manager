import type { MonthlySummary } from '../types/monthlySummary';

const STORAGE_KEY = 'unhyu-manager-monthly-summaries';

function readSummaries(): MonthlySummary[] {
  let storedValue: string | null;

  try {
    storedValue = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.error('[Storage] Unable to read summaries:', error);
    return [];
  }

  if (!storedValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(storedValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
}

function writeSummaries(summaries: MonthlySummary[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(summaries));
}

export function getSummaries() {
  return readSummaries();
}

export function getSummaryByMonth(month: string) {
  return readSummaries().find((summary) => summary.month === month);
}

export function saveMonthlySummary(summary: MonthlySummary) {
  const summaries = readSummaries();

  if (summaries.some((currentSummary) => currentSummary.month === summary.month)) {
    return summary;
  }

  writeSummaries([...summaries, summary]);
  return summary;
}

export function replaceSummaries(summaries: MonthlySummary[]) {
  writeSummaries(summaries);
  return summaries;
}
