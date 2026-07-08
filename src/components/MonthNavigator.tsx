import { formatKoreanMonth } from '../utils/date';

type MonthNavigatorProps = {
  helperText?: string;
  isPickerOpen: boolean;
  label: string;
  month: number;
  monthOptions: number[];
  onMonthChange: (month: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  onTogglePicker: () => void;
  onYearChange: (year: string) => void;
  year: number;
  yearOptions: number[];
};

function MonthNavigator({
  helperText,
  isPickerOpen,
  label,
  month,
  monthOptions,
  onMonthChange,
  onNext,
  onPrevious,
  onTogglePicker,
  onYearChange,
  year,
  yearOptions,
}: MonthNavigatorProps) {
  return (
    <section className="month-navigator-card" aria-label={`${label} 월 이동`}>
      <div className="month-navigator-main">
        <button
          className="month-nav-arrow"
          type="button"
          aria-label="이전달"
          onClick={onPrevious}
        >
          ‹
        </button>
        <button
          aria-expanded={isPickerOpen}
          className="month-title-button"
          type="button"
          onClick={onTogglePicker}
        >
          <span>{label}</span>
          <strong>{formatKoreanMonth(year, month)}</strong>
          {helperText ? <em>{helperText}</em> : null}
        </button>
        <button className="month-nav-arrow" type="button" aria-label="다음달" onClick={onNext}>
          ›
        </button>
      </div>

      {isPickerOpen ? (
        <div className="month-select-grid">
          <label>
            <span>연도</span>
            <select value={year} onChange={(event) => onYearChange(event.target.value)}>
              {yearOptions.map((yearOption) => (
                <option key={yearOption} value={yearOption}>
                  {yearOption}년
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>월</span>
            <select value={month} onChange={(event) => onMonthChange(event.target.value)}>
              {monthOptions.map((monthOption) => (
                <option key={monthOption} value={monthOption}>
                  {monthOption}월
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
    </section>
  );
}

export default MonthNavigator;
