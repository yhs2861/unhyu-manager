import type { AppSettings } from '../types/settings';

export function getTotalUnhyu(settings: AppSettings) {
  return settings.carryOverUnhyu + settings.currentUnhyu;
}
