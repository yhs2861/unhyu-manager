import { useNavigate } from 'react-router-dom';
import { getRecords } from '../../storage/LocalStorage';
import { getSettings } from '../../storage/SettingsStorage';
import type { CarWork, ProductWork } from '../../types/work';
import {
  getCurrentAnnualVacationLabel,
  getCurrentAnnualVacationRemaining,
} from '../../utils/annualVacation';
import {
  formatBirthdaySetting,
  getBirthdayVacationRemaining,
  isBirthdayVacationMonth,
} from '../../utils/birthdayVacation';
import { monthKey, today } from '../../utils/date';

const productWorkLabels: Record<ProductWork, string> = {
  none: '없음',
  day: '주간',
  night: '야간',
  dayNight: '주간+야간',
};

const carWorkLabels: Record<CarWork, string> = {
  none: '없음',
  day: '주간',
  overtime: '연장',
};

function formatSignedNumber(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

function HomePage() {
  const navigate = useNavigate();
  const records = getRecords();
  const settings = getSettings();
  const todayDate = today();
  const currentMonth = monthKey(todayDate);
  const todayRecord = records.find((record) => record.date === todayDate);
  const monthlyRecords = records.filter((record) => monthKey(record.date) === currentMonth);
  const productTotal = monthlyRecords
    .filter((record) => !record.absence)
    .reduce((total, record) => total + record.productPoint, 0);
  const carTotal = monthlyRecords.reduce((total, record) => total + record.carPoint, 0);
  const absenceCount = monthlyRecords.filter((record) => record.absence).length;
  const netUnhyu = monthlyRecords.reduce((total, record) => total + record.difference, 0);
  const annualVacation = getCurrentAnnualVacationRemaining(settings, todayDate);
  const isBirthdayMonth = isBirthdayVacationMonth(settings, todayDate);
  const birthdayVacationRemaining = getBirthdayVacationRemaining(settings, records, todayDate);
  const birthdayVacationStatus = isBirthdayMonth
    ? birthdayVacationRemaining > 0
      ? '사용 가능'
      : '사용 완료'
    : '해당 없음';

  return (
    <main className="app-shell home-page home-v2-page">
      <header className="home-v2-header">
        <p className="eyebrow">운휴매니저</p>
        <h1>오늘의 운휴</h1>
        <span>{todayDate}</span>
      </header>

      <button
        className="home-card home-primary-card"
        type="button"
        onClick={() => navigate('/statistics')}
      >
        <span className="home-card-label">현재 운휴</span>
        <strong>{settings.currentUnhyu}일</strong>
        <span>이월 {formatSignedNumber(settings.carryOverUnhyu)}일 포함</span>
      </button>

      <button
        className={todayRecord ? 'home-card home-today-card complete' : 'home-card home-today-card missing'}
        type="button"
        onClick={() => navigate(`/input?date=${todayDate}`)}
      >
        <span className="home-card-label">오늘 입력</span>
        {todayRecord ? (
          <>
            <strong>입력 완료</strong>
            <dl>
              <div>
                <dt>제품</dt>
                <dd>{productWorkLabels[todayRecord.productWork]}</dd>
              </div>
              <div>
                <dt>자동차</dt>
                <dd>{todayRecord.absence ? '결근' : carWorkLabels[todayRecord.carWork]}</dd>
              </div>
            </dl>
            <span className="home-card-action">오늘 기록 수정</span>
          </>
        ) : (
          <>
            <strong>오늘 입력이 없습니다.</strong>
            <span className="home-card-action">입력하기</span>
          </>
        )}
      </button>

      <button className="home-card home-month-card" type="button" onClick={() => navigate('/statistics')}>
        <span className="home-card-label">이번 달</span>
        <strong>{currentMonth}</strong>
        <dl className="home-metric-grid">
          <div>
            <dt>제품</dt>
            <dd>{productTotal}</dd>
          </div>
          <div>
            <dt>자동차</dt>
            <dd>{carTotal}</dd>
          </div>
          <div>
            <dt>결근</dt>
            <dd>{absenceCount}회</dd>
          </div>
          <div>
            <dt>순 운휴</dt>
            <dd>{formatSignedNumber(netUnhyu)}</dd>
          </div>
        </dl>
      </button>

      <button className="home-card home-vacation-card" type="button" onClick={() => navigate('/settings')}>
        <span className="home-card-label">휴가 현황</span>
        <strong>잔여 휴가</strong>
        <dl className="home-metric-grid">
          <div>
            <dt>운휴</dt>
            <dd>{settings.currentUnhyu}</dd>
          </div>
          <div>
            <dt>일휴</dt>
            <dd>{annualVacation}</dd>
          </div>
          <div>
            <dt>특휴</dt>
            <dd>{settings.specialVacation}</dd>
          </div>
          <div>
            <dt>생휴</dt>
            <dd>{birthdayVacationStatus}</dd>
          </div>
        </dl>
        <span>
          일휴 {getCurrentAnnualVacationLabel(todayDate)} / 생휴 {formatBirthdaySetting(settings)}
        </span>
      </button>
    </main>
  );
}

export default HomePage;
