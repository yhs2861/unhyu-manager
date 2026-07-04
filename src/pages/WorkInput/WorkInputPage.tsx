import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { calculate } from '../../engine/WorkCalculator';
import { getRecordByDate, saveRecord, updateRecord } from '../../storage/LocalStorage';
import { getSettings, saveSettings } from '../../storage/SettingsStorage';
import type { DailyRecord } from '../../types/dailyRecord';
import type { AppSettings } from '../../types/settings';
import type { CarWork, ProductWork, VacationType } from '../../types/work';

type Option<T> = {
  label: string;
  value: T;
};

const productOptions: Option<ProductWork>[] = [
  { label: '없음', value: 'none' },
  { label: '주간', value: 'day' },
  { label: '야간', value: 'night' },
  { label: '주간+야간', value: 'dayNight' },
];

const carOptions: Option<CarWork>[] = [
  { label: '없음', value: 'none' },
  { label: '주간', value: 'day' },
  { label: '연장', value: 'overtime' },
];

const vacationOptions: Option<Exclude<VacationType, 'none'>>[] = [
  { label: '운휴', value: 'unhyu' },
  { label: '일휴', value: 'ilhyu' },
  { label: '특휴', value: 'special' },
];

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function createRecordId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDifference(difference: number) {
  return difference > 0 ? `+${difference}` : `${difference}`;
}

function getResultClassName(difference: number) {
  if (difference > 0) {
    return 'work-result result-positive';
  }

  if (difference < 0) {
    return 'work-result result-negative';
  }

  return 'work-result result-neutral';
}

function getAnnualTarget(date: string): 'firstHalfAnnual' | 'secondHalfAnnual' {
  const month = Number(date.slice(5, 7));
  return month <= 6 ? 'firstHalfAnnual' : 'secondHalfAnnual';
}

function applyRecordToSettings(settings: AppSettings, record: DailyRecord, direction: 1 | -1) {
  const nextSettings = { ...settings };

  if (record.difference > 0) {
    nextSettings.currentUnhyu += record.difference * direction;
    return nextSettings;
  }

  if (record.difference >= 0) {
    return nextSettings;
  }

  const requiredVacation = Math.abs(record.difference);

  if (record.vacationType === 'unhyu') {
    nextSettings.currentUnhyu -= requiredVacation * direction;
  }

  if (record.vacationType === 'ilhyu') {
    const target = getAnnualTarget(record.date);
    nextSettings[target] -= Math.ceil(requiredVacation) * direction;
  }

  if (record.vacationType === 'special') {
    nextSettings.specialVacation -= 1 * direction;
  }

  return nextSettings;
}

function WorkInputPage() {
  const [searchParams] = useSearchParams();
  const date = searchParams.get('date') || getToday();
  const [existingRecord, setExistingRecord] = useState<DailyRecord | undefined>(() =>
    getRecordByDate(date),
  );
  const [productWork, setProductWork] = useState<ProductWork>('none');
  const [carWork, setCarWork] = useState<CarWork>('none');
  const [vacationType, setVacationType] = useState<Exclude<VacationType, 'none'>>('unhyu');
  const [memo, setMemo] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);

  useEffect(() => {
    setExistingRecord(getRecordByDate(date));
  }, [date]);

  useEffect(() => {
    setProductWork(existingRecord?.productWork ?? 'none');
    setCarWork(existingRecord?.carWork ?? 'none');
    setVacationType(
      existingRecord?.vacationType && existingRecord.vacationType !== 'none'
        ? existingRecord.vacationType
        : 'unhyu',
    );
    setMemo(existingRecord?.memo ?? '');
  }, [existingRecord]);

  const calculation = useMemo(() => calculate(productWork, carWork), [productWork, carWork]);
  const needsVacation = calculation.difference < 0;

  const handleSave = () => {
    const now = new Date().toISOString();
    const record: DailyRecord = {
      id: existingRecord?.id ?? createRecordId(),
      date,
      productWork,
      carWork,
      productPoint: calculation.productPoint,
      carPoint: calculation.carPoint,
      difference: calculation.difference,
      vacationType: needsVacation ? vacationType : 'none',
      memo,
      createdAt: existingRecord?.createdAt ?? now,
      updatedAt: now,
    };

    if (existingRecord) {
      updateRecord(record);
    } else {
      saveRecord(record);
    }

    const currentSettings = getSettings();
    const revertedSettings = existingRecord
      ? applyRecordToSettings(currentSettings, existingRecord, -1)
      : currentSettings;
    const nextSettings = applyRecordToSettings(revertedSettings, record, 1);

    saveSettings(nextSettings);
    setExistingRecord(record);

    setShowSnackbar(true);
    window.setTimeout(() => setShowSnackbar(false), 2200);
  };

  return (
    <main className="app-shell work-input-page">
      <header className="work-input-header">
        <p className="eyebrow">오늘 입력</p>
        <h1>운휴매니저</h1>
        <p>{date}</p>
      </header>

      <section className="work-section" aria-labelledby="product-work-title">
        <h2 id="product-work-title">제품부두</h2>
        <div className="work-option-grid product-grid">
          {productOptions.map((option) => (
            <button
              aria-pressed={productWork === option.value}
              className={productWork === option.value ? 'work-option selected' : 'work-option'}
              key={option.value}
              type="button"
              onClick={() => setProductWork(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="work-section" aria-labelledby="car-work-title">
        <h2 id="car-work-title">자동차부두</h2>
        <div className="work-option-grid">
          {carOptions.map((option) => (
            <button
              aria-pressed={carWork === option.value}
              className={carWork === option.value ? 'work-option selected' : 'work-option'}
              key={option.value}
              type="button"
              onClick={() => setCarWork(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className={getResultClassName(calculation.difference)} aria-live="polite">
        <p>계산 결과</p>
        <strong>{formatDifference(calculation.difference)}</strong>
        <span>
          제품 {calculation.productPoint} / 자동차 {calculation.carPoint}
        </span>
      </section>

      {needsVacation ? (
        <section className="work-section" aria-labelledby="vacation-title">
          <h2 id="vacation-title">휴가처리</h2>
          <div className="work-option-grid">
            {vacationOptions.map((option) => (
              <button
                aria-pressed={vacationType === option.value}
                className={vacationType === option.value ? 'work-option selected' : 'work-option'}
                key={option.value}
                type="button"
                onClick={() => setVacationType(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="work-section" aria-labelledby="memo-title">
        <label htmlFor="work-memo" id="memo-title">
          메모
        </label>
        <textarea
          id="work-memo"
          placeholder="메모를 입력하세요."
          rows={5}
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
        />
      </section>

      <button className="work-save-button" type="button" onClick={handleSave}>
        저장
      </button>

      {showSnackbar ? (
        <div className="snackbar" role="status">
          저장되었습니다.
        </div>
      ) : null}
    </main>
  );
}

export default WorkInputPage;
