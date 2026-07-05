import DashboardCard from '../../components/DashboardCard';
import { getRecords } from '../../storage/LocalStorage';
import { monthKey, today } from '../../utils/date';

function formatSignedNumber(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

function StatisticsPage() {
  const currentMonth = monthKey(today());
  const monthlyRecords = getRecords().filter((record) => monthKey(record.date) === currentMonth);
  const productTotal = monthlyRecords.reduce((total, record) => total + record.productPoint, 0);
  const carTotal = monthlyRecords.reduce((total, record) => total + record.carPoint, 0);
  const unhyuIncrease = monthlyRecords
    .filter((record) => record.difference > 0)
    .reduce((total, record) => total + record.difference, 0);
  const unhyuDecrease = Math.abs(
    monthlyRecords
      .filter((record) => record.difference < 0)
      .reduce((total, record) => total + record.difference, 0),
  );
  const netUnhyu = unhyuIncrease - unhyuDecrease;

  return (
    <main className="app-shell statistics-page">
      <header className="statistics-header">
        <p className="eyebrow">월 통계</p>
        <h1>{currentMonth}</h1>
        <p>{monthlyRecords.length}개 기록 기준</p>
      </header>

      <section className="dashboard-grid" aria-label="현재 월 통계">
        <DashboardCard title="제품 합계" value={productTotal} description="productPoint 합" />
        <DashboardCard title="자동차 합계" value={carTotal} description="carPoint 합" />
        <DashboardCard title="운휴 증가" value={`+${unhyuIncrease}`} description="difference 양수" />
        <DashboardCard title="운휴 감소" value={`-${unhyuDecrease}`} description="difference 음수" />
        <DashboardCard title="순 운휴" value={formatSignedNumber(netUnhyu)} description="증가 - 감소" />
      </section>
    </main>
  );
}

export default StatisticsPage;
