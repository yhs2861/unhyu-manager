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
import { addDays, formatDateWithWeekday, today } from '../../utils/date';
import { getTotalUnhyu } from '../../utils/unhyu';
import {
  compactVacationUsages,
  createEmptyVacationUsages,
  getActualUnhyuChange,
  getPrimaryVacationType,
  getRecordVacationUsages,
  getVacationUsageTotal,
  normalizeVacationUsages,
  vacationUsageTypes,
  type VacationUsageType,
} from '../../utils/vacationUsage';

type Option<T> = {
  icon?: string;
  label: string;
  value: T;
};

const productOptions: Option<ProductWork>[] = [
  { icon: '—', label: '없음', value: 'none' },
  { icon: '☀️', label: '주간', value: 'day' },
  { icon: '🌙', label: '야간', value: 'night' },
  { icon: '⏱️', label: '주야', value: 'dayNight' },
];

const carOptions: Option<CarWork>[] = [
  { icon: '—', label: '없음', value: 'none' },
  { icon: '⚓', label: '제품', value: 'product' },
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
  const formattedValue = Number.isInteger(difference) ? `${difference}` : difference.toFixed(1);

  return difference > 0 ? `+${formattedValue}` : formattedValue;
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

function formatVacationUsage(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function trimVacationUsagesToRequired(
  usages: ReturnType<typeof createEmptyVacationUsages>,
  requiredVacation: number,
) {
  const trimmedUsages = createEmptyVacationUsages();
  let remainingVacation = requiredVacation;

  vacationUsageTypes.forEach((type) => {
    const nextValue = Math.min(usages[type], remainingVacation);
    trimmedUsages[type] = nextValue;
    remainingVacation -= nextValue;
  });

  return trimmedUsages;
}

function getDefaultVacationUsages(productWork: ProductWork, carWork: CarWork) {
  const defaultUsages = createEmptyVacationUsages();

  if (productWork === 'dayNight' && carWork === 'day') {
    defaultUsages.unhyu = 1;
  }

  return defaultUsages;
}

function getVacationTypeCapacity(type: VacationUsageType, requiredVacation: number) {
  return type === 'special' || type === 'birthday'
    ? Math.min(requiredVacation, 1)
    : requiredVacation;
}

function getNextVacationUsages(
  previousUsages: ReturnType<typeof createEmptyVacationUsages>,
  selectedType: VacationUsageType,
  requiredVacation: number,
) {
  const nextUsages = normalizeVacationUsages(previousUsages);

  if (nextUsages[selectedType] > 0) {
    nextUsages[selectedType] = 0;
    return nextUsages;
  }

  if (requiredVacation <= 1) {
    const replacementUsages = createEmptyVacationUsages();
    replacementUsages[selectedType] = requiredVacation;
    return replacementUsages;
  }

  const currentTotal = getVacationUsageTotal(nextUsages);
  const selectedCapacity = getVacationTypeCapacity(selectedType, requiredVacation);

  if (currentTotal === 0) {
    nextUsages[selectedType] = selectedCapacity;
    return nextUsages;
  }

  if (currentTotal < requiredVacation) {
    nextUsages[selectedType] = Math.min(selectedCapacity, requiredVacation - currentTotal);
    return nextUsages;
  }

  const activeTypes = vacationUsageTypes.filter((type) => nextUsages[type] > 0);

  if (activeTypes.length === 1) {
    nextUsages[activeTypes[0]] = requiredVacation - 1;
    nextUsages[selectedType] = 1;
    return nextUsages;
  }

  const replacementUsages = createEmptyVacationUsages();
  replacementUsages[activeTypes[0]] = 1;
  replacementUsages[selectedType] = 1;
  return replacementUsages;
}

function applyRecordToSettings(settings: AppSettings, record: DailyRecord, direction: 1 | -1) {
  const nextSettings = { ...settings };
  const actualUnhyuChange = getActualUnhyuChange(record);

  if (record.absence) {
    return nextSettings;
  }

  if (actualUnhyuChange > 0) {
    nextSettings.currentUnhyu += actualUnhyuChange * direction;
    return nextSettings;
  }

  if (record.difference >= 0 && actualUnhyuChange === 0) {
    return nextSettings;
  }

  const usages = getRecordVacationUsages(record);

  if (usages.unhyu > 0) {
    nextSettings.currentUnhyu -= usages.unhyu * direction;
  }

  if (usages.ilhyu > 0) {
    const target = getCurrentAnnualVacationTarget(record.date);
    nextSettings[target] -= usages.ilhyu * direction;
  }

  if (usages.special > 0) {
    nextSettings.specialVacation -= usages.special * direction;
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

  const usages = getRecordVacationUsages(record);

  if (usages.unhyu > 0 && getTotalUnhyu(settings) < usages.unhyu) {
    return '운휴가 부족합니다.';
  }

  if (usages.special > 0 && settings.specialVacation < usages.special) {
    return '특휴가 없습니다.';
  }

  if (usages.ilhyu > 0) {
    const target = getCurrentAnnualVacationTarget(record.date);

    if (settings[target] < usages.ilhyu) {
      return '일휴가 없습니다.';
    }
  }

  if (usages.birthday > 0) {
    if (usages.birthday > 1) {
      return '생휴는 한 달에 1개만 사용할 수 있습니다.';
    }

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
  const [productWork, setProductWork] = useState<ProductWork>(
    () => existingRecord?.productWork ?? 'none',
  );
  const [carWork, setCarWork] = useState<CarWork>(() => existingRecord?.carWork ?? 'none');
  const [absence, setAbsence] = useState(() => existingRecord?.absence ?? false);
  const [vacationUsages, setVacationUsages] = useState(() =>
    existingRecord ? getRecordVacationUsages(existingRecord) : createEmptyVacationUsages(),
  );
  const [memo, setMemo] = useState(() => existingRecord?.memo ?? '');
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    setExistingRecord(getRecordByDate(date));
  }, [date]);

  useEffect(() => {
    setProductWork(existingRecord?.productWork ?? 'none');
    setCarWork(existingRecord?.carWork ?? 'none');
    setAbsence(existingRecord?.absence ?? false);
    setVacationUsages(
      existingRecord ? getRecordVacationUsages(existingRecord) : createEmptyVacationUsages(),
    );
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
  const isAutomaticUnhyuDeduction =
    !isAbsenceRecord &&
    productWork === 'dayNight' &&
    selectedCarWork === 'overtime' &&
    recordCalculation.difference < 0;
  const needsVacation =
    !isAbsenceRecord && recordCalculation.difference < 0 && !isAutomaticUnhyuDeduction;
  const requiredVacation = needsVacation ? Math.abs(recordCalculation.difference) : 0;
  const selectedVacationTotal = getVacationUsageTotal(vacationUsages);
  const currentAnnualVacation = getCurrentAnnualVacationRemaining(settings, date);
  const totalUnhyu = getTotalUnhyu(settings);
  const navigateToDate = (nextDate: string) => {
    navigate(`/input?date=${nextDate}`);
  };

  useEffect(() => {
    if (!needsVacation) {
      setVacationUsages(createEmptyVacationUsages());
      return;
    }

    setVacationUsages((previousUsages) =>
      trimVacationUsagesToRequired(normalizeVacationUsages(previousUsages), requiredVacation),
    );
  }, [needsVacation, requiredVacation]);

  useEffect(() => {
    if (isAbsenceRecord) {
      setCarWork('none');
      setVacationUsages(createEmptyVacationUsages());
    }
  }, [isAbsenceRecord]);

  useEffect(() => {
    if (!canMarkAbsence) {
      setAbsence(false);
    }
  }, [canMarkAbsence]);

  useEffect(() => {
    if (productWork === 'none' && carWork === 'product') {
      setCarWork('none');
    }
  }, [carWork, productWork]);

  const handleProductWorkSelect = (nextProductWork: ProductWork) => {
    if (nextProductWork === productWork) {
      return;
    }

    const nextCarWork =
      nextProductWork === 'none' && carWork === 'product' ? 'none' : selectedCarWork;
    setProductWork(nextProductWork);
    setVacationUsages(getDefaultVacationUsages(nextProductWork, nextCarWork));
  };

  const handleCarWorkSelect = (nextCarWork: CarWork) => {
    if (nextCarWork === selectedCarWork) {
      return;
    }

    setCarWork(nextCarWork);
    setVacationUsages(getDefaultVacationUsages(productWork, nextCarWork));
  };

  const handleVacationSelect = (type: VacationUsageType) => {
    setVacationUsages((previousUsages) =>
      getNextVacationUsages(previousUsages, type, requiredVacation),
    );
  };

  const handleSave = () => {
    if (needsVacation && selectedVacationTotal !== requiredVacation) {
      showTemporaryMessage(
        `휴가처리 ${formatVacationUsage(requiredVacation)}일을 선택하세요.`,
        setSnackbarMessage,
      );
      return;
    }

    const now = new Date().toISOString();
    const selectedVacationUsages = needsVacation
      ? compactVacationUsages(vacationUsages)
      : isAutomaticUnhyuDeduction
        ? compactVacationUsages({ unhyu: Math.abs(recordCalculation.difference) })
        : undefined;
    const record: DailyRecord = {
      id: existingRecord?.id ?? createRecordId(),
      date,
      productWork,
      carWork: isAbsenceRecord ? 'none' : carWork,
      productPoint: recordCalculation.productPoint,
      carPoint: recordCalculation.carPoint,
      difference: recordCalculation.difference,
      absence: isAbsenceRecord,
      vacationType: selectedVacationUsages
        ? getPrimaryVacationType(selectedVacationUsages)
        : 'none',
      vacationUsages: selectedVacationUsages,
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
        <span>📅 {formatDateWithWeekday(date)}</span>
      </header>

      <section className="date-navigator-card" aria-label="입력 날짜 선택">
        <button type="button" aria-label="이전날" onClick={() => navigateToDate(addDays(date, -1))}>
          ‹
        </button>
        <label className="date-navigator-picker">
          <span>선택 날짜</span>
          <strong>{formatDateWithWeekday(date)}</strong>
          <input
            aria-label="날짜 직접 선택"
            type="date"
            value={date}
            onChange={(event) => {
              if (event.target.value) {
                navigateToDate(event.target.value);
              }
            }}
          />
        </label>
        <button type="button" aria-label="다음날" onClick={() => navigateToDate(addDays(date, 1))}>
          ›
        </button>
      </section>

      <section className="vacation-balance-strip" aria-label="잔여 휴가">
        <span>운휴 {totalUnhyu}</span>
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
              onClick={() => handleProductWorkSelect(option.value)}
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
              disabled={isAbsenceRecord || (option.value === 'product' && productWork === 'none')}
              key={option.value}
              type="button"
              onClick={() => handleCarWorkSelect(option.value)}
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
              <span>
                총 {formatVacationUsage(requiredVacation)}일 중{' '}
                {formatVacationUsage(selectedVacationTotal)}일 선택
              </span>
            </div>
          </div>
          <div className="work-option-grid work-card-grid">
            {vacationOptions.map((option) => (
              <button
                aria-pressed={vacationUsages[option.value] > 0}
                className={
                  vacationUsages[option.value] > 0
                    ? `work-option work-card-option vacation-${option.value} selected`
                    : `work-option work-card-option vacation-${option.value}`
                }
                key={option.value}
                type="button"
                onClick={() => handleVacationSelect(option.value)}
              >
                <em aria-hidden="true">{option.icon}</em>
                <span>
                  {option.label}
                  {vacationUsages[option.value] > 0
                    ? ` ${formatVacationUsage(vacationUsages[option.value])}`
                    : ''}
                </span>
              </button>
            ))}
          </div>
          <p className="vacation-selection-summary">
            {selectedVacationTotal === requiredVacation
              ? '선택 완료'
              : `필요 ${formatVacationUsage(
                  Math.max(requiredVacation - selectedVacationTotal, 0),
                )}일 남음`}
          </p>
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
        {needsVacation && selectedVacationTotal > 0 ? (
          <div className="work-applied-summary">
            <span>적용 결과</span>
            <p>
              {vacationUsages.unhyu > 0
                ? `운휴 -${formatVacationUsage(vacationUsages.unhyu)} `
                : ''}
              {vacationUsages.ilhyu > 0
                ? `일휴 -${formatVacationUsage(vacationUsages.ilhyu)} `
                : ''}
              {vacationUsages.special > 0
                ? `특휴 -${formatVacationUsage(vacationUsages.special)} `
                : ''}
              {vacationUsages.birthday > 0
                ? `생휴 -${formatVacationUsage(vacationUsages.birthday)}`
                : ''}
            </p>
          </div>
        ) : null}
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
