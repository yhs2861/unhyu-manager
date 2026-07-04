import type { CarWork, ProductWork, WorkCalculationResult } from '../types/work';

const productDockPoints: Record<ProductWork, number> = {
  none: 0,
  day: 1,
  night: 1,
  dayNight: 2,
};

const carDockPoints: Record<CarWork, number> = {
  none: 0,
  day: 1,
  overtime: 1.5,
};

export function calculate(product: ProductWork, car: CarWork): WorkCalculationResult {
  const productPoint = productDockPoints[product];
  const carPoint = carDockPoints[car];

  return {
    productPoint,
    carPoint,
    difference: carPoint - productPoint,
  };
}

export { carDockPoints, productDockPoints };
