export type VehicleStatus = '운행 가능' | '점검 중' | '운휴';

export type Vehicle = {
  id: number;
  name: string;
  route: string;
  status: VehicleStatus;
  updatedAt: string;
};
