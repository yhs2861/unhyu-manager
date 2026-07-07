export type ProductWork = 'none' | 'day' | 'night' | 'dayNight';

export type CarWork = 'none' | 'day' | 'overtime';

export type VacationType = 'none' | 'unhyu' | 'ilhyu' | 'special' | 'birthday';

export type WorkCalculationResult = {
  productPoint: number;
  carPoint: number;
  difference: number;
};
