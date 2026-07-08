import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { calculate } from '../../engine/WorkCalculator';
import { getRecordByDate, getRecords, saveRecord, updateRecord } from '../../storage/LocalStorage';
import { getSettings, saveSettings } from '../../storage/SettingsStorage';
import type { DailyRecord } from '../../types/dailyRecord';
import type { AppSettings } from '../../types/settings';
import type { CarWork, ProductWork, VacationType } from '../../types/work';
import {
  getCurrentAnnualVacationRemaining,
  getCurrentAnnualVacationTarget,
} from '../../utils/annualVacation';
import { hasBirthdayVacationRecord, isBirthdayVacationMonth } from '../../utils/birthdayVacation';
import { today } from '../../utils/date';

type Option<T> = {
  icon?: string;
  label: string;
  value: T;
};

const productOptions: Option<ProductWork>[] = [
  { icon: '—', label: '없음', value: 'none' },
  { icon: '☀️', label: '주간', value: 'day' },
  { icon: '🌙', label: '야간', value: 'night' },
  { icon: '⏱️', label: '주간+야간', value: 'dayNight' },
];

const carOptions: Option<CarWork>[] = [
  { icon: '—', label: '없음', value: 'none' },
  { icon: '🚗', label: '주간', value: 'day' },
  { icon: '⏰', label: '연장', value: 'overtime' },
];

const vacationOptions: Option<Exclude<VacationType, 'none'>>[] = [
  { icon: '🌿', label: '운휴', value: 'unhyu' },
  { icon: '📘', label: '일휴', value: 'ilhyu' },
  { icon: '💜', label: '특휴', value: 'special' },
  { icon: '🎂', label: '생휴', value: 'birthday' },
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
    return 'work-result work-result-card result-positive';
  }

  if (difference < 0) {
    return 'work-result work-result-card result-negative';
  }

  return 'work-result work-result-card result-neutral';
}

function showTemporaryMessage(message: string, setMessage: (message: string) => void) {
  setMessage(message);
  window.setTimeout(() => setMessage(''), 2200);
}

function applyRecordToSettings(settings: AppSettings, record: DailyRecord, direction: 1 | -1) {
  const nextSettings = { ...settings };

  if (record.absence) {
    return nextSettings;
  }

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
    const target = getCurrentAnnualVacationTarget();
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
  if (record.absence || record.difference >= 0) {
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
    const target = getCurrentAnnualVacationTarget();

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
  const [absence, setAbsence] = useState(false);
  const [vacationType, setVacationType] = useState<VacationType>('none');
  const [memo, setMemo] = useState('');
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    setExistingRecord(getRecordByDate(date));
  }, [date]);

  useEffect(() => {
    setProductWork(existingRecord?.productWork ?? 'none');
    setCarWork(existingRecord?.carWork ?? 'none');
    setAbsence(existingRecord?.absence ?? false);
    setVacationType(existingRecord?.vacationType ?? 'none');
    setMemo(existingRecord?.memo ?? '');
  }, [existingRecord]);

  const settings = getSettings();
  const canMarkAbsence = productWork !== 'none';
  const isAbsenceRecord = absence && canMarkAbsence;
  const selectedCarWork = isAbsenceRecord ? 'none' : carWork;
  const calculation = useMemo(
    () => calculate(productWork, selectedCarWork),
    [productWork, selectedCarWork],
  );
  const recordCalculation = isAbsenceRecord
    ? {
        productPoint: calculate(productWork, 'none').productPoint,
        carPoint: 0,
        difference: 0,
      }
    : calculation;
  const needsVacation = !isAbsenceRecord && recordCalculation.difference < 0;
  const currentAnnualVacation = getCurrentAnnualVacationRemaining(settings);

  useEffect(() => {
    if (!needsVacation) {
      setVacationType('none');
    }
  }, [needsVacation]);

  useEffect(() => {
    if (isAbsenceRecord) {
      setCarWork('none');
      setVacationType('none');
    }
  }, [isAbsenceRecord]);

  useEffect(() => {
    if (!canMarkAbsence) {
      setAbsence(false);
    }
  }, [canMarkAbsence]);

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
      carWork: isAbsenceRecord ? 'none' : carWork,
      productPoint: recordCalculation.productPoint,
      carPoint: recordCalculation.carPoint,
      difference: recordCalculation.difference,
      absence: isAbsenceRecord,
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
    <main className="app-shell work-input-page work-input-v2-page">
      <header className="work-input-header work-input-v2-header">
        <div>
          <h1>입력</h1>
          <p>근무와 휴가 처리</p>
        </div>
        <span>📅 {date}</span>
      </header>

      <section className="vacation-balance-strip" aria-label="잔여 휴가">
        <span>운휴 {settings.currentUnhyu}</span>
        <span>일휴 {currentAnnualVacation}</span>
        <span>특휴 {settings.specialVacation}</span>
      </section>

      <section className="work-section work-choice-section" aria-labelledby="product-work-title">
        <div className="work-section-heading">
          <span className="section-icon-badge product" aria-hidden="true">
            ⚓
          </span>
          <div>
            <h2 id="product-work-title">제품부두</h2>
            <span>근무 형태 선택</span>
          </div>
        </div>
        <div className="work-option-grid product-grid work-card-grid">
          {productOptions.map((option) => (
            <button
              aria-pressed={productWork === option.value}
              className={
                productWork === option.value
                  ? 'work-option work-card-option selected'
                  : 'work-option work-card-option'
              }
              key={option.value}
              type="button"
              onClick={() => setProductWork(option.value)}
            >
              <em aria-hidden="true">{option.icon}</em>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="work-section work-choice-section" aria-labelledby="car-work-title">
        <div className="work-section-heading">
          <span className="section-icon-badge car" aria-hidden="true">
            🚗
          </span>
          <div>
            <h2 id="car-work-title">자동차부두</h2>
            <span>{isAbsenceRecord ? '결근 처리 중' : '근무 형태 선택'}</span>
          </div>
        </div>
        <div className="work-option-grid work-card-grid">
          {carOptions.map((option) => (
            <button
              aria-pressed={selectedCarWork === option.value}
              className={
                selectedCarWork === option.value
                  ? 'work-option work-card-option selected'
                  : 'work-option work-card-option'
              }
              disabled={isAbsenceRecord}
              key={option.value}
              type="button"
              onClick={() => setCarWork(option.value)}
            >
              <em aria-hidden="true">{option.icon}</em>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </section>

      {needsVacation ? (
        <section className="work-section work-choice-section" aria-labelledby="vacation-title">
          <div className="work-section-heading">
            <span className="section-icon-badge vacation" aria-hidden="true">
              🌿
            </span>
            <div>
              <h2 id="vacation-title">휴가처리</h2>
              <span>필수 선택</span>
            </div>
          </div>
          <div className="work-option-grid work-card-grid">
            {vacationOptions.map((option) => (
              <button
                aria-pressed={vacationType === option.value}
                className={
                  vacationType === option.value
                    ? `work-option work-card-option vacation-${option.value} selected`
                    : `work-option work-card-option vacation-${option.value}`
                }
                key={option.value}
                type="button"
                onClick={() => setVacationType(option.value)}
              >
                <em aria-hidden="true">{option.icon}</em>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className={getResultClassName(recordCalculation.difference)} aria-live="polite">
        <div className="work-result-summary">
          <div>
            <span className="section-icon-badge result" aria-hidden="true">
              🧮
            </span>
            <p>계산 결과</p>
          </div>
          <strong>{isAbsenceRecord ? '결근' : formatDifference(recordCalculation.difference)}</strong>
        </div>
        <dl className="work-result-grid">
          <div>
            <dt>제품 점수</dt>
            <dd>{recordCalculation.productPoint}</dd>
          </div>
          <div>
            <dt>자동차 점수</dt>
            <dd>{recordCalculation.carPoint}</dd>
          </div>
          <div>
            <dt>운휴 차이</dt>
            <dd>{isAbsenceRecord ? '0' : formatDifference(recordCalculation.difference)}</dd>
          </div>
        </dl>
      </section>

      <section className="work-section" aria-labelledby="memo-title">
        <div className="work-section-heading">
          <span className="section-icon-badge memo" aria-hidden="true">
            📝
          </span>
          <label htmlFor="work-memo" id="memo-title">
            메모
          </label>
        </div>
        <textarea
          id="work-memo"
          placeholder="메모를 입력하세요."
          rows={5}
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
        />
      </section>

      {canMarkAbsence ? (
        <section className="work-section absence-section absence-card" aria-labelledby="absence-title">
          <div>
            <span className="section-icon-badge absence" aria-hidden="true">
              ⚠️
            </span>
            <h2 id="absence-title">결근 처리</h2>
            <p>결근은 휴가를 차감하지 않고 자동차부두는 없음으로 저장됩니다.</p>
          </div>
          <button
            aria-pressed={isAbsenceRecord}
            className={
              isAbsenceRecord
                ? 'work-option work-card-option selected'
                : 'work-option work-card-option'
            }
            type="button"
            onClick={() => setAbsence((currentValue) => !currentValue)}
          >
            결근 처리
          </button>
        </section>
      ) : null}

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
