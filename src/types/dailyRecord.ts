import type { CarWork, ProductWork, VacationType, VacationUsages } from './work';

export interface DailyRecord {
  id: string;
  date: string;
  productWork: ProductWork;
  carWork: CarWork;
  productPoint: number;
  carPoint: number;
  difference: number;
  absence: boolean;
  vacationType: VacationType;
  vacationUsages?: VacationUsages;
  memo: string;
  createdAt: string;
  updatedAt: string;
}
