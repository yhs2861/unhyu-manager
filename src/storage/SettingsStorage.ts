import type { AppSettings } from '../types/settings';

const STORAGE_KEY = 'unhyu-manager-settings';

const defaultSettings: AppSettings = {
  carryOverUnhyu: 0,
  currentUnhyu: 0,
  firstHalfAnnual: 6,
  secondHalfAnnual: 6,
  specialVacation: 1,
};

function normalizeSettings(value: Partial<AppSettings>): AppSettings {
  return {
    carryOverUnhyu: Number(value.carryOverUnhyu ?? defaultSettings.carryOverUnhyu),
    currentUnhyu: Number(value.currentUnhyu ?? defaultSettings.currentUnhyu),
    firstHalfAnnual: Number(value.firstHalfAnnual ?? defaultSettings.firstHalfAnnual),
    secondHalfAnnual: Number(value.secondHalfAnnual ?? defaultSettings.secondHalfAnnual),
    specialVacation: Number(value.specialVacation ?? defaultSettings.specialVacation),
  };
}

export function getSettings() {
  const storedValue = localStorage.getItem(STORAGE_KEY);

  if (!storedValue) {
    return defaultSettings;
  }

  try {
    const parsedValue = JSON.parse(storedValue);
    return normalizeSettings(parsedValue);
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: AppSettings) {
  const nextSettings = normalizeSettings(settings);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
  return nextSettings;
}

export function resetSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSettings));
  return defaultSettings;
}
