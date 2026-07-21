export interface AppSettings {
  isSetupCompleted: boolean;
  carryOverUnhyu: number;
  currentUnhyu: number;
  firstHalfAnnual: number;
  secondHalfAnnual: number;
  specialVacation: number;
  birthdayCalendarType: 'solar' | 'lunar';
  birthdayMonth: number;
  birthdayDay: number;
  birthdayLeapMonth: boolean;
}
