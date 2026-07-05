import { useState } from 'react';
import DashboardCard from '../../components/DashboardCard';
import { getRecords } from '../../storage/LocalStorage';
import { getSettings, saveSettings } from '../../storage/SettingsStorage';
import { getSummaryByMonth, saveMonthlySummary } from '../../storage/SummaryStorage';
import { monthKey, today } from '../../utils/date';

function formatSignedNumber(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

function StatisticsPage() {
  const currentMonth = monthKey(today());
  const [closedSummary, setClosedSummary] = useState(() => getSummaryByMonth(currentMonth));
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
  const isClosed = Boolean(closedSummary);

  const handleCloseMonth = () => {
    if (isClosed) {
      return;
    }

    const shouldClose = window.confirm('이번 달을 마감하시겠습니까?');

    if (!shouldClose) {
      return;
    }

    const summary = saveMonthlySummary({
      month: currentMonth,
      productTotal,
      carTotal,
      differenceTotal: netUnhyu,
      recordCount: monthlyRecords.length,
      closedAt: new Date().toISOString(),
    });

    if (netUnhyu > 0) {
      const settings = getSettings();
      saveSettings({
        ...settings,
        currentUnhyu: settings.currentUnhyu + netUnhyu,
      });
    }

    setClosedSummary(summary);
  };

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

      <section className="month-close-panel" aria-label="월 마감">
        <div>
          <h2>월 마감</h2>
          <p>{isClosed ? `${currentMonth} 마감 완료` : `${currentMonth} 마감 전`}</p>
          {closedSummary ? <span>마감일: {closedSummary.closedAt.slice(0, 10)}</span> : null}
        </div>
        <button type="button" disabled={isClosed} onClick={handleCloseMonth}>
          월 마감
        </button>
      </section>
    </main>
  );
}

export default StatisticsPage;
