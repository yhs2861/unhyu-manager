type DashboardCardProps = {
  title: string;
  value: string | number;
  description?: string;
};

function DashboardCard({ title, value, description }: DashboardCardProps) {
  return (
    <article className="dashboard-card">
      <p>{title}</p>
      <strong>{value}</strong>
      {description ? <span>{description}</span> : null}
    </article>
  );
}

export default DashboardCard;
