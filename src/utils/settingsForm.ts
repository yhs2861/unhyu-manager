import type { AppSettings } from '../types/settings';

export type NumericSettingsKey = Exclude<
  keyof AppSettings,
  'isSetupCompleted' | 'birthdayCalendarType' | 'birthdayLeapMonth'
>;

export type SettingsFormState = Record<NumericSettingsKey, string>;

export function createSettingsForm(settings: AppSettings): SettingsFormState {
  return {
    carryOverUnhyu: String(settings.carryOverUnhyu),
    currentUnhyu: String(settings.currentUnhyu),
    firstHalfAnnual: String(settings.firstHalfAnnual),
    secondHalfAnnual: String(settings.secondHalfAnnual),
    specialVacation: String(settings.specialVacation),
    birthdayMonth: String(settings.birthdayMonth),
    birthdayDay: String(settings.birthdayDay),
  };
}

export function toSettingsNumber(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return 0;
  }

  const parsedValue = Number(trimmedValue);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

export function formToSettings(form: SettingsFormState, baseSettings: AppSettings): AppSettings {
  return {
    ...baseSettings,
    carryOverUnhyu: toSettingsNumber(form.carryOverUnhyu),
    currentUnhyu: toSettingsNumber(form.currentUnhyu),
    firstHalfAnnual: toSettingsNumber(form.firstHalfAnnual),
    secondHalfAnnual: toSettingsNumber(form.secondHalfAnnual),
    specialVacation: toSettingsNumber(form.specialVacation),
    birthdayMonth: toSettingsNumber(form.birthdayMonth),
    birthdayDay: toSettingsNumber(form.birthdayDay),
  };
}

export function clearZeroOnFocus(value: string) {
  return value === '0' ? '' : value;
}

export function restoreZeroOnBlur(value: string) {
  return value.trim() === '' ? '0' : value;
}
