import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { calculate } from '../../engine/WorkCalculator';
import { getRecordByDate, getRecords, saveRecord, updateRecord } from '../../storage/LocalStorage';
import { getSettings, saveSettings } from '../../storage/SettingsStorage';
import type { DailyRecord } from '../../types/dailyRecord';
import type { AppSettings } from '../../types/settings';
import type { CarWork, ProductWork, VacationType } from '../../types/work';
import { hasBirthdayVacationRecord, isBirthdayVacationMonth } from '../../utils/birthdayVacation';
import { today } from '../../utils/date';

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
  { label: '생휴', value: 'birthday' },
];

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

function getAnnualTarget(): 'firstHalfAnnual' | 'secondHalfAnnual' {
  const month = Number(today().slice(5, 7));
  return month <= 6 ? 'firstHalfAnnual' : 'secondHalfAnnual';
}

function showTemporaryMessage(message: string, setMessage: (message: string) => void) {
  setMessage(message);
  window.setTimeout(() => setMessage(''), 2200);
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
    const target = getAnnualTarget();
    nextSettings[target] -= Math.ceil(requiredVacation) * direction;
  }

  if (record.vacationType === 'special') {
    nextSettings.specialVacation -= 1 * direction;
  }

  return nextSettings;
}

function validateVacationBalance(
  settings: AppSettings,
  record: DailyRecord,
  records: DailyRecord[],
) {
  if (record.difference >= 0) {
    return '';
  }

  const requiredVacation = Math.abs(record.difference);

  if (record.vacationType === 'unhyu' && settings.currentUnhyu < requiredVacation) {
    return '운휴가 부족합니다.';
  }

  if (record.vacationType === 'special' && settings.specialVacation <= 0) {
    return '특휴가 없습니다.';
  }

  if (record.vacationType === 'ilhyu') {
    const target = getAnnualTarget();

    if (settings[target] <= 0) {
      return '일휴가 없습니다.';
    }
  }

  if (record.vacationType === 'birthday') {
    if (!isBirthdayVacationMonth(settings, record.date)) {
      return '생휴는 생일이 있는 달에만 사용할 수 있습니다.';
    }

    if (hasBirthdayVacationRecord(records, record.date, record.id)) {
      return '이번 달 생휴를 이미 사용했습니다.';
    }
  }

  return '';
}

function WorkInputPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const date = searchParams.get('date') || today();
  const [existingRecord, setExistingRecord] = useState<DailyRecord | undefined>(() =>
    getRecordByDate(date),
  );
  const [productWork, setProductWork] = useState<ProductWork>('none');
  const [carWork, setCarWork] = useState<CarWork>('none');
  const [vacationType, setVacationType] = useState<VacationType>('none');
  const [memo, setMemo] = useState('');
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    setExistingRecord(getRecordByDate(date));
  }, [date]);

  useEffect(() => {
    setProductWork(existingRecord?.productWork ?? 'none');
    setCarWork(existingRecord?.carWork ?? 'none');
    setVacationType(existingRecord?.vacationType ?? 'none');
    setMemo(existingRecord?.memo ?? '');
  }, [existingRecord]);

  const calculation = useMemo(() => calculate(productWork, carWork), [productWork, carWork]);
  const needsVacation = calculation.difference < 0;

  useEffect(() => {
    if (!needsVacation) {
      setVacationType('none');
    }
  }, [needsVacation]);

  const handleSave = () => {
    if (needsVacation && vacationType === 'none') {
      showTemporaryMessage('휴가처리를 선택하세요.', setSnackbarMessage);
      return;
    }

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

    const currentSettings = getSettings();
    const records = getRecords();
    const revertedSettings = existingRecord
      ? applyRecordToSettings(currentSettings, existingRecord, -1)
      : currentSettings;
    const validationMessage = validateVacationBalance(revertedSettings, record, records);

    if (validationMessage) {
      showTemporaryMessage(validationMessage, setSnackbarMessage);
      return;
    }

    const nextSettings = applyRecordToSettings(revertedSettings, record, 1);

    if (existingRecord) {
      updateRecord(record);
    } else {
      saveRecord(record);
    }

    saveSettings(nextSettings);
    setExistingRecord(record);

    setSnackbarMessage('저장되었습니다.');
    window.setTimeout(() => {
      setSnackbarMessage('');
      navigate('/');
    }, 700);
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

      {snackbarMessage ? (
        <div className="snackbar" role="status">
          {snackbarMessage}
        </div>
      ) : null}
    </main>
  );
}

export default WorkInputPage;
