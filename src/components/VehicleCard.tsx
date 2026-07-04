import type { Vehicle } from '../types/vehicle';

const statusClassName: Record<Vehicle['status'], string> = {
  '운행 가능': 'status status-ready',
  '점검 중': 'status status-checking',
  운휴: 'status status-paused',
};

type VehicleCardProps = {
  vehicle: Vehicle;
};

function VehicleCard({ vehicle }: VehicleCardProps) {
  return (
    <article className="vehicle-card">
      <div>
        <h3>{vehicle.name}</h3>
        <p>{vehicle.route}</p>
      </div>
      <div className="vehicle-meta">
        <span className={statusClassName[vehicle.status]}>{vehicle.status}</span>
        <time>{vehicle.updatedAt}</time>
      </div>
    </article>
  );
}

export default VehicleCard;
