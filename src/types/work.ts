export type ProductWork = 'none' | 'day' | 'night' | 'dayNight';

export type CarWork = 'none' | 'product' | 'day' | 'overtime';

export type VacationType = 'none' | 'unhyu' | 'ilhyu' | 'special' | 'birthday';

export type VacationUsages = Partial<Record<Exclude<VacationType, 'none'>, number>>;

export type WorkCalculationResult = {
  productPoint: number;
  carPoint: number;
  difference: number;
};
