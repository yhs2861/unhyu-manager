import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MonthNavigator from '../../components/MonthNavigator';
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

function getProductBadge(productWork: DailyRecord['productWork']) {
  if (productWork === 'day') {
    return { label: '주간', tone: 'product-day' };
  }

  if (productWork === 'night') {
    return { label: '야간', tone: 'product-night' };
  }

  if (productWork === 'dayNight') {
    return { label: '주야', tone: 'product-day-night' };
  }

  return { label: '없음', tone: 'product-none' };
}

function getCarBadge(carWork: DailyRecord['carWork']) {
  if (carWork === 'day') {
    return { label: '주간', tone: 'car-day' };
  }

  if (carWork === 'overtime') {
    return { label: '연장', tone: 'car-overtime' };
  }

  return { label: '없음', tone: 'car-none' };
}

function getChangeBadge(record: DailyRecord) {
  if (record.absence) {
    return { label: '결근', tone: 'absence' };
  }

  if (record.difference > 0) {
    return { label: formatSignedNumber(record.difference), tone: 'positive' };
  }

  if (record.difference === 0) {
    return null;
  }

  if (record.vacationType === 'ilhyu') {
    return { label: '일휴', tone: 'annual' };
  }

  if (record.vacationType === 'special') {
    return { label: '특휴', tone: 'special' };
  }

  if (record.vacationType === 'birthday') {
    return { label: '생휴', tone: 'birthday' };
  }

  if (record.vacationType === 'unhyu') {
    return { label: formatSignedNumber(record.difference), tone: 'negative' };
  }

  return { label: formatSignedNumber(record.difference), tone: 'negative' };
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
      <MonthNavigator
        helperText="월 바로 이동"
        isPickerOpen={isMonthPickerOpen}
        label="기록 달력"
        month={currentMonth.getMonth() + 1}
        monthOptions={monthOptions}
        year={currentMonth.getFullYear()}
        yearOptions={yearOptions}
        onMonthChange={handleMonthSelect}
        onNext={() => moveMonth(1)}
        onPrevious={() => moveMonth(-1)}
        onTogglePicker={toggleMonthPicker}
        onYearChange={handleYearSelect}
      />

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
            const productBadge = record ? getProductBadge(record.productWork) : null;
            const carBadge = record ? getCarBadge(record.carWork) : null;
            const changeBadge = record ? getChangeBadge(record) : null;
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
                {productBadge && carBadge ? (
                  <span className="calendar-record-lines" aria-hidden="true">
                    <span className={`calendar-record-pill ${productBadge.tone}`}>
                      {productBadge.label}
                    </span>
                    <span className={`calendar-record-pill ${carBadge.tone}`}>
                      {carBadge.label}
                    </span>
                    {changeBadge ? (
                      <strong className={`calendar-record-pill change ${changeBadge.tone}`}>
                        {changeBadge.label}
                      </strong>
                    ) : null}
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
