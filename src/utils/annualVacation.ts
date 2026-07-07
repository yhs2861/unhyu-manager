import type { AppSettings } from '../types/settings';
import { today } from './date';

export function getCurrentAnnualVacationTarget(
  date = today(),
): 'firstHalfAnnual' | 'secondHalfAnnual' {
  const month = Number(date.slice(5, 7));
  return month <= 6 ? 'firstHalfAnnual' : 'secondHalfAnnual';
}

export function getCurrentAnnualVacationRemaining(settings: AppSettings, date = today()) {
  return settings[getCurrentAnnualVacationTarget(date)];
}

export function getCurrentAnnualVacationLabel(date = today()) {
  const month = Number(date.slice(5, 7));
  return month <= 6 ? '1월~6월 기준' : '7월~12월 기준';
}
