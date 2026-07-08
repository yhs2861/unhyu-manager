import { useState } from 'react';
import MonthNavigator from '../../components/MonthNavigator';
import { getRecords } from '../../storage/LocalStorage';
import type { DailyRecord } from '../../types/dailyRecord';
import { monthKey, today } from '../../utils/date';

const productWorkLabels: Record<DailyRecord['productWork'], string> = {
  none: '제품 없음',
  day: '제품 주간',
  night: '제품 야간',
  dayNight: '제품 주야',
};

const carWorkLabels: Record<DailyRecord['carWork'], string> = {
  none: '자동차 없음',
  day: '자동차 주간',
  overtime: '자동차 연장',
};

const vacationLabels: Record<Exclude<DailyRecord['vacationType'], 'none'>, string> = {
  unhyu: '운휴',
  ilhyu: '일휴',
  special: '특휴',
  birthday: '생휴',
};

function createMonthDate(month: string) {
  return new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1);
}

function formatMonth(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function formatSignedNumber(value: number) {
  return value > 0 ? `+${formatNumber(value)}` : formatNumber(value);
}

function formatDayValue(value: number) {
  return `${formatNumber(value)}일`;
}

function formatSignedDayValue(value: number) {
  return `${formatSignedNumber(value)}일`;
}

function getToneClassName(value: number) {
  if (value > 0) {
    return 'text-positive';
  }

  if (value < 0) {
    return 'text-negative';
  }

  return 'text-neutral';
}

function getRecordChangeLabel(record: DailyRecord) {
  if (record.absence) {
    return '결근';
  }

  if (record.difference > 0) {
    return `운휴 ${formatSignedNumber(record.difference)}`;
  }

  if (record.difference < 0) {
    const vacationLabel =
      record.vacationType === 'none' ? '운휴' : vacationLabels[record.vacationType];

    return `${vacationLabel} ${formatSignedNumber(record.difference)}`;
  }

  return '운휴 0';
}

function StatisticsPage() {
  const records = getRecords();
  const todayMonth = monthKey(today());
  const [selectedMonth, setSelectedMonth] = useState(todayMonth);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const selectedDate = createMonthDate(selectedMonth);
  const selectedYear = selectedDate.getFullYear();
  const selectedMonthNumber = selectedDate.getMonth() + 1;
  const recordYears = records
    .map((record) => Number(record.date.slice(0, 4)))
    .filter((year) => Number.isFinite(year));
  const baseYear = new Date().getFullYear();
  const minYear = Math.min(baseYear - 10, selectedYear, ...recordYears);
  const maxYear = Math.max(baseYear + 5, selectedYear, ...recordYears);
  const yearOptions = Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index);
  const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1);
  const monthlyRecords = records
    .filter((record) => monthKey(record.date) === selectedMonth)
    .sort((firstRecord, secondRecord) => secondRecord.date.localeCompare(firstRecord.date));
  const productTotal = monthlyRecords.reduce((total, record) => total + record.productPoint, 0);
  const carTotal = monthlyRecords.reduce((total, record) => total + record.carPoint, 0);
  const absenceRecords = monthlyRecords.filter((record) => record.absence);
  const unhyuIncrease = monthlyRecords
    .filter((record) => record.difference > 0)
    .reduce((total, record) => total + record.difference, 0);
  const unhyuDecrease = Math.abs(
    monthlyRecords
      .filter((record) => record.difference < 0)
      .reduce((total, record) => total + record.difference, 0),
  );
  const netUnhyu = unhyuIncrease - unhyuDecrease;
  const unhyuUseRecords = monthlyRecords.filter(
    (record) => record.vacationType === 'unhyu' && record.difference < 0,
  );
  const unhyuUseDays = unhyuUseRecords.reduce(
    (total, record) => total + Math.abs(record.difference),
    0,
  );
  const annualUseCount = monthlyRecords.filter((record) => record.vacationType === 'ilhyu').length;
  const specialUseCount = monthlyRecords.filter(
    (record) => record.vacationType === 'special',
  ).length;
  const birthdayUseCount = monthlyRecords.filter(
    (record) => record.vacationType === 'birthday',
  ).length;

  const moveMonth = (monthOffset: number) => {
    const nextMonth = new Date(selectedYear, selectedMonthNumber - 1 + monthOffset, 1);
    setSelectedMonth(formatMonth(nextMonth.getFullYear(), nextMonth.getMonth() + 1));
  };

  const handleYearSelect = (year: string) => {
    setSelectedMonth(formatMonth(Number(year), selectedMonthNumber));
  };

  const handleMonthSelect = (month: string) => {
    setSelectedMonth(formatMonth(selectedYear, Number(month)));
  };

  return (
    <main className="app-shell statistics-page statistics-v2-page">
      <MonthNavigator
        helperText={`${monthlyRecords.length}개 기록 기준`}
        isPickerOpen={isMonthPickerOpen}
        label="월 통계"
        month={selectedMonthNumber}
        monthOptions={monthOptions}
        year={selectedYear}
        yearOptions={yearOptions}
        onMonthChange={handleMonthSelect}
        onNext={() => moveMonth(1)}
        onPrevious={() => moveMonth(-1)}
        onTogglePicker={() => setIsMonthPickerOpen((isOpen) => !isOpen)}
        onYearChange={handleYearSelect}
      />

      <section className="statistics-card" aria-label="이번 달 요약">
        <div className="statistics-card-heading">
          <span className="section-icon-badge month" aria-hidden="true">
            📆
          </span>
          <div>
            <span>이번 달 요약</span>
            <strong className={getToneClassName(netUnhyu)}>
              순 운휴 {formatSignedDayValue(netUnhyu)}
            </strong>
          </div>
        </div>
        <dl className="statistics-summary-grid">
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
            <dd>{absenceRecords.length}회</dd>
          </div>
          <div className={getToneClassName(netUnhyu)}>
            <dt>순 운휴</dt>
            <dd>{formatSignedDayValue(netUnhyu)}</dd>
          </div>
        </dl>
      </section>

      <section className="statistics-card" aria-label="운휴 변화">
        <div className="statistics-card-heading">
          <span className="section-icon-badge balance" aria-hidden="true">
            🌿
          </span>
          <div>
            <span>운휴 변화</span>
            <strong className={getToneClassName(netUnhyu)}>
              {formatSignedDayValue(netUnhyu)}
            </strong>
          </div>
        </div>
        <dl className="statistics-line-list">
          <div>
            <dt>운휴 증가</dt>
            <dd className="text-positive">+{formatDayValue(unhyuIncrease)}</dd>
          </div>
          <div>
            <dt>운휴 감소</dt>
            <dd className="text-negative">-{formatDayValue(unhyuDecrease)}</dd>
          </div>
          <div>
            <dt>순 운휴</dt>
            <dd className={getToneClassName(netUnhyu)}>{formatSignedDayValue(netUnhyu)}</dd>
          </div>
        </dl>
      </section>

      <section className="statistics-card" aria-label="휴가 사용">
        <div className="statistics-card-heading">
          <span className="section-icon-badge vacation" aria-hidden="true">
            🏖️
          </span>
          <div>
            <span>휴가 사용</span>
            <strong>{unhyuUseRecords.length + annualUseCount + specialUseCount + birthdayUseCount}회</strong>
          </div>
        </div>
        <dl className="statistics-line-list">
          <div>
            <dt>운휴 사용</dt>
            <dd>
              {unhyuUseRecords.length}회 / {formatNumber(unhyuUseDays)}일
            </dd>
          </div>
          <div>
            <dt>일휴 사용</dt>
            <dd>{annualUseCount}회</dd>
          </div>
          <div>
            <dt>특휴 사용</dt>
            <dd>{specialUseCount}회</dd>
          </div>
          <div>
            <dt>생휴 사용</dt>
            <dd>{birthdayUseCount}회</dd>
          </div>
          <div>
            <dt>결근</dt>
            <dd>{absenceRecords.length}회</dd>
          </div>
        </dl>
      </section>

      <section className="statistics-card" aria-label="최근 기록">
        <div className="statistics-card-heading">
          <span className="section-icon-badge records" aria-hidden="true">
            🧾
          </span>
          <div>
            <span>최근 기록</span>
            <strong>{monthlyRecords.length}건</strong>
          </div>
        </div>
        {monthlyRecords.length > 0 ? (
          <ol className="statistics-record-list">
            {monthlyRecords.map((record) => (
              <li key={record.id}>
                <div>
                  <time dateTime={record.date}>{record.date.slice(5)}</time>
                  <strong className={record.absence ? 'record-pill absence' : 'record-pill'}>
                    {record.absence ? '결근' : getRecordChangeLabel(record)}
                  </strong>
                </div>
                <p>
                  {productWorkLabels[record.productWork]} /{' '}
                  {record.absence ? '자동차 없음' : carWorkLabels[record.carWork]}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="statistics-empty-message">선택한 월의 기록이 없습니다.</p>
        )}
      </section>
    </main>
  );
}

export default StatisticsPage;
