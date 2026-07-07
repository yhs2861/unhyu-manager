import DashboardCard from '../../components/DashboardCard';
import { getRecords } from '../../storage/LocalStorage';
import { getSettings } from '../../storage/SettingsStorage';
import type { DailyRecord } from '../../types/dailyRecord';
import {
  formatBirthdaySetting,
  getBirthdayVacationRemaining,
  isBirthdayVacationMonth,
} from '../../utils/birthdayVacation';
import { monthKey, today } from '../../utils/date';

function formatSignedNumber(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

function sortRecentRecords(records: DailyRecord[]) {
  return [...records]
    .sort((firstRecord, secondRecord) => {
      return secondRecord.createdAt.localeCompare(firstRecord.createdAt);
    })
    .slice(0, 5);
}

function HomePage() {
  const records = getRecords();
  const settings = getSettings();
  const todayDate = today();
  const currentMonth = monthKey(todayDate);
  const hasTodayRecord = records.some((record) => record.date === todayDate);
  const monthlyChange = records
    .filter((record) => monthKey(record.date) === currentMonth)
    .reduce((total, record) => total + record.difference, 0);
  const annualVacation = settings.firstHalfAnnual + settings.secondHalfAnnual;
  const isBirthdayMonth = isBirthdayVacationMonth(settings, todayDate);
  const birthdayVacationRemaining = getBirthdayVacationRemaining(settings, records, todayDate);
  const recentRecords = sortRecentRecords(records);

  return (
    <main className="app-shell home-page">
      <section className="home-hero" aria-label="오늘 요약">
        <div>
          <p className="eyebrow">오늘 날짜</p>
          <h1>{todayDate}</h1>
        </div>
        <strong className={hasTodayRecord ? 'today-status done' : 'today-status needed'}>
          {hasTodayRecord ? '🟢 오늘 입력 완료' : '🔴 오늘 입력 필요'}
        </strong>
      </section>

      <section className="dashboard-grid" aria-label="대시보드 요약">
        <DashboardCard
          title="현재 운휴"
          value={formatSignedNumber(settings.currentUnhyu)}
          description={`이월 ${formatSignedNumber(settings.carryOverUnhyu)}`}
        />
        <DashboardCard
          title="이번달 운휴 변화"
          value={formatSignedNumber(monthlyChange)}
          description={currentMonth}
        />
        <DashboardCard
          title="일휴 잔여"
          value={annualVacation}
          description={`상반기 ${settings.firstHalfAnnual} / 하반기 ${settings.secondHalfAnnual}`}
        />
        <DashboardCard title="특휴 잔여" value={settings.specialVacation} description="특별휴가" />
        {isBirthdayMonth ? (
          <DashboardCard
            title="생휴 잔여"
            value={birthdayVacationRemaining}
            description={formatBirthdaySetting(settings)}
          />
        ) : null}
      </section>

      <section className="recent-section" aria-label="최근 기록 5개">
        <div className="section-heading">
          <h2>최근 기록 5개</h2>
        </div>

        {recentRecords.length > 0 ? (
          <div className="recent-list">
            {recentRecords.map((record) => (
              <article className="recent-record" key={record.id}>
                <div>
                  <h3>{record.date}</h3>
                  <p>
                    제품 {record.productPoint} / 자동차 {record.carPoint}
                  </p>
                </div>
                <strong className={record.difference > 0 ? 'text-positive' : record.difference < 0 ? 'text-negative' : 'text-neutral'}>
                  {formatSignedNumber(record.difference)}
                </strong>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-message">아직 저장된 기록이 없습니다.</p>
        )}
      </section>
    </main>
  );
}

export default HomePage;
