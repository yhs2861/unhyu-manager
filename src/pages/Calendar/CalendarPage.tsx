import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRecords } from '../../storage/LocalStorage';
import { today } from '../../utils/date';

const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

type CalendarDay = {
  date: string;
  day: number;
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

function getCalendarDays(currentMonth: Date): CalendarDay[] {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDate = new Date(year, month, 1);
  const startDate = new Date(year, month, 1 - firstDate.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    return {
      date: toDateString(date),
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
    };
  });
}

function CalendarPage() {
  const navigate = useNavigate();
  const records = getRecords();
  const todayDate = today();
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const recordDates = new Set(records.map((record) => record.date));
  const calendarDays = getCalendarDays(currentMonth);

  const moveMonth = (monthOffset: number) => {
    setCurrentMonth((previousMonth) => {
      return new Date(previousMonth.getFullYear(), previousMonth.getMonth() + monthOffset, 1);
    });
  };

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    navigate(`/input?date=${date}`);
  };

  return (
    <main className="app-shell calendar-page">
      <section className="calendar-header" aria-label="달력 월 이동">
        <button type="button" onClick={() => moveMonth(-1)}>
          이전달
        </button>
        <div>
          <p className="eyebrow">기록 달력</p>
          <h1>{getMonthLabel(currentMonth)}</h1>
        </div>
        <button type="button" onClick={() => moveMonth(1)}>
          다음달
        </button>
      </section>

      <section className="calendar-panel" aria-label="월간 달력">
        <div className="calendar-weekdays">
          {weekDays.map((weekDay) => (
            <span key={weekDay}>{weekDay}</span>
          ))}
        </div>

        <div className="calendar-grid">
          {calendarDays.map((calendarDay) => {
            const hasRecord = recordDates.has(calendarDay.date);
            const isToday = calendarDay.date === todayDate;
            const isSelected = calendarDay.date === selectedDate;
            const className = [
              'calendar-day',
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
                onClick={() => handleDateClick(calendarDay.date)}
              >
                <span>{calendarDay.day}</span>
                {hasRecord ? <strong aria-label="기록 있음">●</strong> : null}
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default CalendarPage;
