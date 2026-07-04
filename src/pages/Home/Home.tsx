import SummaryPanel from '../../components/SummaryPanel';
import VehicleCard from '../../components/VehicleCard';
import { calculate } from '../../engine/WorkCalculator';
import { vehicles } from '../../utils/sampleVehicles';

function Home() {
  const pausedCount = vehicles.filter((vehicle) => vehicle.status === '운휴').length;
  const checkingCount = vehicles.filter((vehicle) => vehicle.status === '점검 중').length;
  const calculationTest = calculate('dayNight', 'overtime');

  return (
    <main className="app-shell">
      <section className="top-bar" aria-label="앱 요약">
        <div>
          <p className="eyebrow">오늘의 운휴 현황</p>
          <h1>운휴매니저</h1>
        </div>
        <button className="icon-button" type="button" aria-label="알림 확인">
          <span aria-hidden="true">!</span>
        </button>
      </section>

      <SummaryPanel
        pausedCount={pausedCount}
        checkingCount={checkingCount}
        totalCount={vehicles.length}
      />

      <section className="quick-action" aria-label="빠른 등록">
        <div>
          <h2>새 운휴 등록</h2>
          <p>차량, 사유, 예상 복귀 시간을 빠르게 남겨보세요.</p>
        </div>
        <button type="button">등록</button>
      </section>

      <section className="calculation-test" aria-label="계산엔진 테스트">
        <h2>계산 테스트</h2>
        <dl>
          <div>
            <dt>제품</dt>
            <dd>주간+야간 = {calculationTest.productPoint}</dd>
          </div>
          <div>
            <dt>자동차</dt>
            <dd>연장 = {calculationTest.carPoint}</dd>
          </div>
          <div>
            <dt>결과</dt>
            <dd>{calculationTest.difference}</dd>
          </div>
        </dl>
      </section>

      <section className="vehicle-section" aria-label="차량 목록">
        <div className="section-heading">
          <h2>차량 상태</h2>
          <a href="#all">전체 보기</a>
        </div>

        <div className="vehicle-list">
          {vehicles.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      </section>
    </main>
  );
}

export default Home;
