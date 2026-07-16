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
import { formatDateWithWeekday, monthKey, today } from '../../utils/date';
import { getTotalUnhyu } from '../../utils/unhyu';
import { getActualUnhyuChange } from '../../utils/vacationUsage';
import { getRecordAbsenceUnits } from '../../utils/absence';

const productWorkLabels: Record<ProductWork, string> = {
  none: '없음',
  day: '주간',
  night: '야간',
  dayNight: '주간+야간',
};

const carWorkLabels: Record<CarWork, string> = {
  none: '없음',
  product: '제품',
  day: '주간',
  overtime: '연장',
};

function formatSignedNumber(value: number) {
  const formattedValue = Number.isInteger(value) ? `${value}` : value.toFixed(1);

  return value > 0 ? `+${formattedValue}` : formattedValue;
}

function formatDayValue(value: number) {
  const formattedValue = Number.isInteger(value) ? `${value}` : value.toFixed(1);

  return `${formattedValue}일`;
}

function formatSignedDayValue(value: number) {
  return `${formatSignedNumber(value)}일`;
}

function getUnhyuToneClassName(value: number) {
  if (value > 0) {
    return 'positive';
  }

  if (value < 0) {
    return 'negative';
  }

  return 'neutral';
}

function HomePage() {
  const navigate = useNavigate();
  const records = getRecords();
  const settings = getSettings();
  const todayDate = today();
  const currentMonth = monthKey(todayDate);
  const todayRecord = records.find((record) => record.date === todayDate);
  const monthlyRecords = records.filter((record) => monthKey(record.date) === currentMonth);
  const totalUnhyu = getTotalUnhyu(settings);
  const productTotal = monthlyRecords.reduce((total, record) => total + record.productPoint, 0);
  const carTotal = monthlyRecords.reduce((total, record) => total + record.carPoint, 0);
  const absenceCount = monthlyRecords.reduce(
    (total, record) => total + getRecordAbsenceUnits(record),
    0,
  );
  const netUnhyu = monthlyRecords.reduce(
    (total, record) => total + getActualUnhyuChange(record),
    0,
  );
  const annualVacation = getCurrentAnnualVacationRemaining(settings, todayDate);
  const isBirthdayMonth = isBirthdayVacationMonth(settings, todayDate);
  const birthdayVacationRemaining = getBirthdayVacationRemaining(settings, records, todayDate);
  const birthdayVacationStatus = isBirthdayMonth
    ? birthdayVacationRemaining > 0
      ? '사용 가능'
      : '사용 완료'
    : '해당 없음';
  const todayRecordSummary = todayRecord
    ? `제품: ${productWorkLabels[todayRecord.productWork]} · 자동차: ${
        carWorkLabels[todayRecord.carWork]
      }${getRecordAbsenceUnits(todayRecord) > 0 ? ` · 결근 ${getRecordAbsenceUnits(todayRecord)}` : ''}`
    : '';
  const netUnhyuTone = getUnhyuToneClassName(netUnhyu);

  return (
    <main className="app-shell home-page home-v2-page">
      <header className="home-v2-header">
        <div>
          <h1>운휴매니저</h1>
          <p>오늘의 운휴</p>
        </div>
        <span>📅 {formatDateWithWeekday(todayDate)}</span>
      </header>

      <button
        className="home-card home-dashboard-card home-primary-card"
        type="button"
        onClick={() => navigate('/statistics')}
      >
        <span className="home-icon-badge balance" aria-hidden="true">
          🗓️
        </span>
        <span className="home-card-content">
          <span className="home-card-label">총 운휴</span>
          <strong>{formatDayValue(totalUnhyu)}</strong>
          <span>이월 {formatSignedDayValue(settings.carryOverUnhyu)} 포함</span>
        </span>
      </button>

      <button
        className={
          todayRecord
            ? 'home-card home-dashboard-card home-today-card complete'
            : 'home-card home-dashboard-card home-today-card missing'
        }
        type="button"
        onClick={() => navigate(`/input?date=${todayDate}`)}
      >
        <span className="home-icon-badge today" aria-hidden="true">
          ✅
        </span>
        {todayRecord ? (
          <span className="home-card-content">
            <span className="home-card-label">오늘 입력</span>
            <strong>입력 완료</strong>
            <span>{todayRecordSummary}</span>
          </span>
        ) : (
          <span className="home-card-content">
            <span className="home-card-label">오늘 입력</span>
            <strong>입력 필요</strong>
            <span>오늘 입력이 없습니다.</span>
          </span>
        )}
        <span className="home-card-action">{todayRecord ? '수정' : '입력하기'}</span>
      </button>

      <button
        className="home-card home-dashboard-card home-month-card"
        type="button"
        onClick={() => navigate('/statistics')}
      >
        <span className="home-icon-badge month" aria-hidden="true">
          📆
        </span>
        <span className="home-card-content">
          <span className="home-card-title-row">
            <span className="home-card-label">이번 달 요약</span>
            <span>{currentMonth}</span>
          </span>
        </span>
        <dl className="home-summary-grid">
          <div className="product">
            <dt>제품부두</dt>
            <dd>{formatDayValue(productTotal)}</dd>
          </div>
          <div className="car">
            <dt>자동차부두</dt>
            <dd>{formatDayValue(carTotal)}</dd>
          </div>
          <div className="absence">
            <dt>결근</dt>
            <dd>{absenceCount}회</dd>
          </div>
          <div className={netUnhyuTone}>
            <dt>순 운휴</dt>
            <dd>{formatSignedDayValue(netUnhyu)}</dd>
          </div>
        </dl>
      </button>

      <button
        className="home-card home-dashboard-card home-vacation-card"
        type="button"
        onClick={() => navigate('/settings')}
      >
        <span className="home-icon-badge vacation" aria-hidden="true">
          🌿
        </span>
        <span className="home-card-content">
          <span className="home-card-title-row">
            <span className="home-card-label">휴가 현황</span>
            <span>
              일휴 {getCurrentAnnualVacationLabel(todayDate)} · 생휴{' '}
              {formatBirthdaySetting(settings)}
            </span>
          </span>
        </span>
        <dl className="home-vacation-grid">
          <div>
            <dt>운휴</dt>
            <dd>{formatDayValue(totalUnhyu)}</dd>
          </div>
          <div>
            <dt>일휴</dt>
            <dd>{formatDayValue(annualVacation)}</dd>
          </div>
          <div>
            <dt>특휴</dt>
            <dd>{formatDayValue(settings.specialVacation)}</dd>
          </div>
          <div>
            <dt>생휴</dt>
            <dd>{birthdayVacationStatus}</dd>
          </div>
        </dl>
      </button>
    </main>
  );
}

export default HomePage;
