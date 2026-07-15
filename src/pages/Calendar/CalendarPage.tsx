import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MonthNavigator from '../../components/MonthNavigator';
import { getRecords } from '../../storage/LocalStorage';
import type { DailyRecord } from '../../types/dailyRecord';
import { today } from '../../utils/date';
import { getActualUnhyuChange, getRecordVacationUsages } from '../../utils/vacationUsage';

const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

const productWorkLabels: Record<DailyRecord['productWork'], string> = {
  none: '제품 없음',
  day: '제품 주간',
  night: '제품 야간',
  dayNight: '제품 주야',
};

const carWorkLabels: Record<DailyRecord['carWork'], string> = {
  none: '자동차 없음',
  product: '자동차 제품',
  day: '자동차 주간',
  overtime: '자동차 연장',
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
  const formattedValue = Number.isInteger(value) ? `${value}` : value.toFixed(1);

  return value > 0 ? `+${formattedValue}` : formattedValue;
}

function formatUsageCount(value: number) {
  return value > 1 ? ` ${Number.isInteger(value) ? value : value.toFixed(1)}` : '';
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

  const badges = getCalendarDisplayBadges(record).filter(
    (badge) =>
      badge.type !== 'productDay' &&
      badge.type !== 'productNight' &&
      badge.type !== 'productDayNight' &&
      badge.type !== 'carWork',
  );

  if (badges.length > 0) {
    return {
      label: badges.map((badge) => badge.label).join(', '),
      tone: badges.some((badge) => badge.type === 'unhyuDecrease')
        ? 'unhyuDecrease'
        : badges[0].type,
    };
  }

  return {
    label: '운휴 0',
    tone: 'neutral',
  };
}

type CalendarBadgeType =
  | 'productDay'
  | 'productNight'
  | 'productDayNight'
  | 'carWork'
  | 'unhyu'
  | 'annual'
  | 'special'
  | 'birthday'
  | 'unhyuIncrease'
  | 'unhyuDecrease'
  | 'absence'
  | 'neutral';

type CalendarDisplayBadge = {
  label: string;
  type: CalendarBadgeType;
  isChange?: boolean;
};

function getProductBadge(productWork: DailyRecord['productWork']): CalendarDisplayBadge | null {
  if (productWork === 'day') {
    return { label: '주간', type: 'productDay' };
  }

  if (productWork === 'night') {
    return { label: '야간', type: 'productNight' };
  }

  if (productWork === 'dayNight') {
    return { label: '주야', type: 'productDayNight' };
  }

  return null;
}

function getCarBadge(carWork: DailyRecord['carWork']): CalendarDisplayBadge | null {
  if (carWork === 'product') {
    return { label: '제품', type: 'carWork' };
  }

  if (carWork === 'day') {
    return { label: '주간', type: 'carWork' };
  }

  if (carWork === 'overtime') {
    return { label: '연장', type: 'carWork' };
  }

  return null;
}

function getVacationBadges(record: DailyRecord) {
  const badges: CalendarDisplayBadge[] = [];
  const usages = getRecordVacationUsages(record);
  const hasNonUnhyuVacation = usages.ilhyu > 0 || usages.special > 0 || usages.birthday > 0;

  if (record.carWork === 'none' && usages.unhyu > 0 && !hasNonUnhyuVacation) {
    badges.push({ label: '운휴', type: 'unhyu' });
  }

  if (usages.ilhyu > 0) {
    badges.push({ label: `일휴${formatUsageCount(usages.ilhyu)}`, type: 'annual' });
  }

  if (usages.special > 0) {
    badges.push({ label: `특휴${formatUsageCount(usages.special)}`, type: 'special' });
  }

  if (usages.birthday > 0) {
    badges.push({ label: `생휴${formatUsageCount(usages.birthday)}`, type: 'birthday' });
  }

  return badges;
}

function getUnhyuChangeBadge(record: DailyRecord): CalendarDisplayBadge | null {
  const actualUnhyuChange = getActualUnhyuChange(record);

  if (actualUnhyuChange === 0) {
    return null;
  }

  return {
    label: formatSignedNumber(actualUnhyuChange),
    type: actualUnhyuChange > 0 ? 'unhyuIncrease' : 'unhyuDecrease',
    isChange: true,
  };
}

function getCalendarDisplayBadges(record: DailyRecord): CalendarDisplayBadge[] {
  if (record.absence) {
    return [{ label: '결근', type: 'absence' }];
  }

  const badges: CalendarDisplayBadge[] = [];
  const productBadge = getProductBadge(record.productWork);
  const carBadge = getCarBadge(record.carWork);
  const unhyuChangeBadge = getUnhyuChangeBadge(record);

  if (productBadge) {
    badges.push(productBadge);
  }

  if (carBadge) {
    badges.push(carBadge);
  }

  badges.push(...getVacationBadges(record));

  if (unhyuChangeBadge) {
    badges.push(unhyuChangeBadge);
  }

  return badges;
}

function getChangeBadges(record: DailyRecord) {
  return getCalendarDisplayBadges(record).filter(
    (badge) => badge.isChange || badge.type === 'absence',
  );
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
            const displayBadges = record ? getCalendarDisplayBadges(record) : [];
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
                {displayBadges.length > 0 ? (
                  <span className="calendar-record-lines" aria-hidden="true">
                    {displayBadges.map((badge) => {
                      const className = badge.isChange
                        ? `calendar-record-pill change ${badge.type}`
                        : `calendar-record-pill ${badge.type}`;

                      return badge.isChange ? (
                        <strong className={className} key={`${badge.type}-${badge.label}`}>
                          {badge.label}
                        </strong>
                      ) : (
                        <span className={className} key={`${badge.type}-${badge.label}`}>
                          {badge.label}
                        </span>
                      );
                    })}
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
