import type { AppSettings } from '../types/settings';

const STORAGE_KEY = 'unhyu-manager-settings';

const defaultSettings: AppSettings = {
  isSetupCompleted: false,
  carryOverUnhyu: 0,
  currentUnhyu: 0,
  firstHalfAnnual: 6,
  secondHalfAnnual: 6,
  specialVacation: 1,
  birthdayCalendarType: 'solar',
  birthdayMonth: 1,
  birthdayDay: 1,
  birthdayLeapMonth: false,
};

function normalizeNumber(value: number | undefined, fallback: number) {
  const numberValue = Number(value ?? fallback);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeSettings(value: Partial<AppSettings>): AppSettings {
  return {
    isSetupCompleted: value.isSetupCompleted === true,
    carryOverUnhyu: normalizeNumber(value.carryOverUnhyu, defaultSettings.carryOverUnhyu),
    currentUnhyu: normalizeNumber(value.currentUnhyu, defaultSettings.currentUnhyu),
    firstHalfAnnual: normalizeNumber(value.firstHalfAnnual, defaultSettings.firstHalfAnnual),
    secondHalfAnnual: normalizeNumber(value.secondHalfAnnual, defaultSettings.secondHalfAnnual),
    specialVacation: normalizeNumber(value.specialVacation, defaultSettings.specialVacation),
    birthdayCalendarType: value.birthdayCalendarType === 'lunar' ? 'lunar' : 'solar',
    birthdayMonth: clamp(normalizeNumber(value.birthdayMonth, defaultSettings.birthdayMonth), 0, 12),
    birthdayDay: clamp(normalizeNumber(value.birthdayDay, defaultSettings.birthdayDay), 0, 31),
    birthdayLeapMonth: value.birthdayLeapMonth === true,
  };
}

export function getSettings() {
  let storedValue: string | null;

  try {
    storedValue = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.error('[Storage] Unable to read settings:', error);
    return defaultSettings;
  }

  if (!storedValue) {
    return defaultSettings;
  }

  try {
    const parsedValue = JSON.parse(storedValue);
    if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
      return defaultSettings;
    }
    return normalizeSettings(parsedValue as Partial<AppSettings>);
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
