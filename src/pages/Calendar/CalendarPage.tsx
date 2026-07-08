import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRecords } from '../../storage/LocalStorage';
import type { DailyRecord } from '../../types/dailyRecord';
import { today } from '../../utils/date';

const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

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

type CalendarDay = {
  date: string;
  day: number;
  dayOfWeek: number;
  isCurrentMonth: boolean;
};

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getMonthLabel(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

function formatSignedNumber(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

function getCalendarDays(currentMonth: Date): CalendarDay[] {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDate = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0);
  const startDate = new Date(year, month, 1 - firstDate.getDay());
  const dayCount = Math.ceil((firstDate.getDay() + lastDate.getDate()) / 7) * 7;

  return Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    return {
      date: toDateString(date),
      day: date.getDate(),
      dayOfWeek: date.getDay(),
      isCurrentMonth: date.getMonth() === month,
    };
  });
}

function getRecordChange(record: DailyRecord) {
  if (record.absence) {
    return {
      label: '결근',
      tone: 'absence',
    };
  }

  if (record.difference > 0) {
    return {
      label: `운휴 ${formatSignedNumber(record.difference)}`,
      tone: 'positive',
    };
  }

  if (record.difference < 0) {
    const vacationLabel =
      record.vacationType === 'none' ? '운휴' : vacationLabels[record.vacationType];

    return {
      label: `${vacationLabel} ${formatSignedNumber(record.difference)}`,
      tone: 'negative',
    };
  }

  return {
    label: '운휴 0',
    tone: 'neutral',
  };
}

function getRecordAriaLabel(date: string, record: DailyRecord) {
  const change = getRecordChange(record);

  return `${date} 기록, ${productWorkLabels[record.productWork]}, ${
    carWorkLabels[record.carWork]
  }, ${change.label}`;
}

function CalendarPage() {
  const navigate = useNavigate();
  const records = getRecords();
  const todayDate = today();
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => `${new Date().getFullYear()}`);
  const [pickerMonth, setPickerMonth] = useState(() => `${new Date().getMonth() + 1}`);
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const recordsByDate = new Map(records.map((record) => [record.date, record]));
  const calendarDays = getCalendarDays(currentMonth);
  const recordYears = records
    .map((record) => Number(record.date.slice(0, 4)))
    .filter((year) => Number.isFinite(year));
  const baseYear = new Date().getFullYear();
  const minYear = Math.min(baseYear - 10, currentMonth.getFullYear(), ...recordYears);
  const maxYear = Math.max(baseYear + 5, currentMonth.getFullYear(), ...recordYears);
  const yearOptions = Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index);
  const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1);

  const moveMonth = (monthOffset: number) => {
    setCurrentMonth((previousMonth) => {
      const nextMonth = new Date(
        previousMonth.getFullYear(),
        previousMonth.getMonth() + monthOffset,
        1,
      );
      setPickerYear(`${nextMonth.getFullYear()}`);
      setPickerMonth(`${nextMonth.getMonth() + 1}`);

      return nextMonth;
    });
  };

  const toggleMonthPicker = () => {
    setPickerYear(`${currentMonth.getFullYear()}`);
    setPickerMonth(`${currentMonth.getMonth() + 1}`);
    setIsMonthPickerOpen((isOpen) => !isOpen);
  };

  const moveToSelectedMonth = (yearValue: string, monthValue: string) => {
    const selectedYear = Number(yearValue);
    const selectedMonth = Number(monthValue);

    if (!selectedYear || !selectedMonth) {
      return;
    }

    setCurrentMonth(new Date(selectedYear, selectedMonth - 1, 1));
  };

  const handleYearSelect = (yearValue: string) => {
    setPickerYear(yearValue);
    moveToSelectedMonth(yearValue, pickerMonth);
  };

  const handleMonthSelect = (monthValue: string) => {
    setPickerMonth(monthValue);
    moveToSelectedMonth(pickerYear, monthValue);
  };

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    navigate(`/input?date=${date}`);
  };

  return (
    <main className="app-shell calendar-page">
      <section className="calendar-header" aria-label="달력 월 이동">
        <button className="calendar-nav-button" type="button" onClick={() => moveMonth(-1)}>
          이전달
        </button>
        <div>
          <p className="eyebrow">기록 달력</p>
          <button
            aria-expanded={isMonthPickerOpen}
            className="calendar-title-button"
            type="button"
            onClick={toggleMonthPicker}
          >
            <h1>{getMonthLabel(currentMonth)}</h1>
            <span>월 바로 이동</span>
          </button>
        </div>
        <button className="calendar-nav-button" type="button" onClick={() => moveMonth(1)}>
          다음달
        </button>
      </section>

      {isMonthPickerOpen ? (
        <section className="calendar-jump-panel" aria-label="연도와 월 선택">
          <div className="calendar-select-grid">
            <label>
              <span>연도</span>
              <select
                value={pickerYear}
                onChange={(event) => handleYearSelect(event.target.value)}
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}년
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>월</span>
              <select
                value={pickerMonth}
                onChange={(event) => handleMonthSelect(event.target.value)}
              >
                {monthOptions.map((month) => (
                  <option key={month} value={month}>
                    {month}월
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      ) : null}

      <section className="calendar-panel" aria-label="월간 달력">
        <div className="calendar-weekdays">
          {weekDays.map((weekDay, index) => (
            <span
              className={index === 0 ? 'sunday' : index === 6 ? 'saturday' : 'weekday'}
              key={weekDay}
            >
              {weekDay}
            </span>
          ))}
        </div>

        <div className="calendar-grid">
          {calendarDays.map((calendarDay) => {
            const record = recordsByDate.get(calendarDay.date);
            const recordChange = record ? getRecordChange(record) : null;
            const isToday = calendarDay.date === todayDate;
            const isSelected = calendarDay.date === selectedDate;
            const className = [
              'calendar-day',
              record ? 'has-record' : '',
              calendarDay.dayOfWeek === 0 ? 'sunday' : '',
              calendarDay.dayOfWeek === 6 ? 'saturday' : '',
              calendarDay.isCurrentMonth ? '' : 'muted',
              isToday ? 'today' : '',
              isSelected ? 'selected' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <button
                className={className}
                key={calendarDay.date}
                type="button"
                aria-label={record ? getRecordAriaLabel(calendarDay.date, record) : calendarDay.date}
                onClick={() => handleDateClick(calendarDay.date)}
              >
                <span className="calendar-day-number">{calendarDay.day}</span>
                {record && recordChange ? (
                  <span className="calendar-record-lines" aria-hidden="true">
                    <span>{productWorkLabels[record.productWork]}</span>
                    <span>{carWorkLabels[record.carWork]}</span>
                    <strong className={`calendar-record-change ${recordChange.tone}`}>
                      {recordChange.label}
                    </strong>
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default CalendarPage;
