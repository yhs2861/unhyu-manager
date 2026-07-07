import type { CarWork, ProductWork, VacationType } from './work';

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
  memo: string;
  createdAt: string;
  updatedAt: string;
}
