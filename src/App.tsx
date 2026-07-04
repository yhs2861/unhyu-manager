type Vehicle = {
  id: number;
  name: string;
  route: string;
  status: '운행 가능' | '점검 중' | '운휴';
  updatedAt: string;
};

const vehicles: Vehicle[] = [
  {
    id: 1,
    name: '서울 72바 1834',
    route: '강남 순환',
    status: '운행 가능',
    updatedAt: '방금 전',
  },
  {
    id: 2,
    name: '경기 80아 2190',
    route: '성수 물류',
    status: '점검 중',
    updatedAt: '12분 전',
  },
  {
    id: 3,
    name: '인천 91사 4402',
    route: '공항 대기',
    status: '운휴',
    updatedAt: '오늘 08:30',
  },
];

const statusClassName: Record<Vehicle['status'], string> = {
  '운행 가능': 'status status-ready',
  '점검 중': 'status status-checking',
  운휴: 'status status-paused',
};

function App() {
  const pausedCount = vehicles.filter((vehicle) => vehicle.status === '운휴').length;
  const checkingCount = vehicles.filter((vehicle) => vehicle.status === '점검 중').length;

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

      <section className="summary-panel" aria-label="운휴 요약">
        <div>
          <p>운휴 차량</p>
          <strong>{pausedCount}</strong>
        </div>
        <div>
          <p>점검 중</p>
          <strong>{checkingCount}</strong>
        </div>
        <div>
          <p>전체 등록</p>
          <strong>{vehicles.length}</strong>
        </div>
      </section>

      <section className="quick-action" aria-label="빠른 등록">
        <div>
          <h2>새 운휴 등록</h2>
          <p>차량, 사유, 예상 복귀 시간을 빠르게 남겨보세요.</p>
        </div>
        <button type="button">등록</button>
      </section>

      <section className="vehicle-section" aria-label="차량 목록">
        <div className="section-heading">
          <h2>차량 상태</h2>
          <a href="#all">전체 보기</a>
        </div>

        <div className="vehicle-list">
          {vehicles.map((vehicle) => (
            <article className="vehicle-card" key={vehicle.id}>
              <div>
                <h3>{vehicle.name}</h3>
                <p>{vehicle.route}</p>
              </div>
              <div className="vehicle-meta">
                <span className={statusClassName[vehicle.status]}>{vehicle.status}</span>
                <time>{vehicle.updatedAt}</time>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
