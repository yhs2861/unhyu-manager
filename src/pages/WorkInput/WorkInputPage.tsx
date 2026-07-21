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
import { getRecordAbsenceUnits } from '../../utils/absence';
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
  { icon: '🚗', label: '주간', value: 'day' },
  { icon: '⏰', label: '연장', value: 'overtime' },
  { icon: '⚓', label: '제품', value: 'product' },
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

function getVacationTypeCapacity(
  type: VacationUsageType,
  requiredVacation: number,
  availableSpecialVacation: number,
) {
  if (type === 'special') {
    return Math.min(requiredVacation, availableSpecialVacation);
  }

  if (type === 'birthday') {
    return Math.min(requiredVacation, 1);
  }

  return requiredVacation;
}

function getNextVacationUsages(
  previousUsages: ReturnType<typeof createEmptyVacationUsages>,
  selectedType: VacationUsageType,
  requiredVacation: number,
  availableSpecialVacation: number,
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
  const selectedCapacity = getVacationTypeCapacity(
    selectedType,
    requiredVacation,
    availableSpecialVacation,
  );

  if (selectedCapacity <= 0) {
    return nextUsages;
  }

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
  if (record.difference >= 0 && getVacationUsageTotal(record.vacationUsages ?? {}) === 0) {
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
  const [absenceUnits, setAbsenceUnits] = useState(() =>
    existingRecord ? getRecordAbsenceUnits(existingRecord) : 0,
  );
  const [vacationUsages, setVacationUsages] = useState(() =>
    existingRecord ? getRecordVacationUsages(existingRecord) : createEmptyVacationUsages(),
  );
  const [memo, setMemo] = useState(() => existingRecord?.memo ?? '');
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    const record = getRecordByDate(date);
    setExistingRecord(record);
    setProductWork(record?.productWork ?? 'none');
    setCarWork(record?.carWork ?? 'none');
    setAbsenceUnits(record ? getRecordAbsenceUnits(record) : 0);
    setVacationUsages(
      record ? getRecordVacationUsages(record) : createEmptyVacationUsages(),
    );
    setMemo(record?.memo ?? '');
  }, [date]);

  const settings = getSettings();
  const calculation = useMemo(() => calculate(productWork, carWork), [productWork, carWork]);
  const isSingleProductWork = productWork === 'day' || productWork === 'night';
  const isDayNightProductWork = productWork === 'dayNight';
  const canMarkSingleAbsence = isSingleProductWork;
  const canMarkDayNightAbsence =
    isDayNightProductWork && carWork !== 'overtime' &&
    (carWork === 'none' || carWork === 'day' || carWork === 'product');
  const canMarkAbsence = canMarkSingleAbsence || canMarkDayNightAbsence;
  const isAbsenceRecord = absenceUnits > 0 && canMarkAbsence;
  const isSingleAbsenceRecord = absenceUnits > 0 && canMarkSingleAbsence;
  const recordCalculation = isSingleAbsenceRecord
    ? { ...calculation, difference: 0 }
    : calculation;
  const isAutomaticUnhyuDeduction =
    productWork === 'dayNight' && carWork === 'overtime' && recordCalculation.difference < 0;
  const needsVacation = recordCalculation.difference < 0 && !isAutomaticUnhyuDeduction;
  const requiredVacation = needsVacation ? Math.abs(recordCalculation.difference) : 0;
  const selectedVacationTotal = getVacationUsageTotal(vacationUsages);
  const selectedTreatmentTotal = selectedVacationTotal + absenceUnits;
  const availableSpecialVacation =
    settings.specialVacation +
    (existingRecord ? getRecordVacationUsages(existingRecord).special : 0);
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
      trimVacationUsagesToRequired(
        normalizeVacationUsages(previousUsages),
        Math.max(requiredVacation - absenceUnits, 0),
      ),
    );
  }, [needsVacation, requiredVacation, absenceUnits]);

  useEffect(() => {
    if (!canMarkAbsence) {
      setAbsenceUnits(0);
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

    const isNextSingleProductWork = nextProductWork === 'day' || nextProductWork === 'night';
    const nextAbsenceUnits =
      nextProductWork === 'none'
        ? 0
        : isNextSingleProductWork
          ? Math.min(absenceUnits, 1)
          : absenceUnits;
    const nextCarWork =
      (nextProductWork === 'none' && carWork === 'product') ||
      (isNextSingleProductWork && nextAbsenceUnits > 0)
        ? 'none'
        : carWork;
    setProductWork(nextProductWork);
    setCarWork(nextCarWork);
    setAbsenceUnits(nextAbsenceUnits);
    setVacationUsages(
      isNextSingleProductWork && nextAbsenceUnits > 0
        ? createEmptyVacationUsages()
        : getDefaultVacationUsages(nextProductWork, nextCarWork),
    );
  };

  const handleCarWorkSelect = (nextCarWork: CarWork) => {
    if (isSingleAbsenceRecord) {
      return;
    }

    if (nextCarWork === carWork) {
      return;
    }

    setCarWork(nextCarWork);
    setAbsenceUnits(0);
    setVacationUsages(getDefaultVacationUsages(productWork, nextCarWork));
  };

  const handleVacationSelect = (type: VacationUsageType) => {
    const nextUsages = getNextVacationUsages(
      vacationUsages,
      type,
      absenceUnits > 0 ? Math.max(requiredVacation - absenceUnits, 1) : requiredVacation,
      availableSpecialVacation,
    );
    const nextTotal = getVacationUsageTotal(nextUsages);
    setVacationUsages(nextUsages);
    if (absenceUnits > 0 && nextTotal + absenceUnits > requiredVacation) {
      setAbsenceUnits(Math.max(requiredVacation - nextTotal, 0));
    }
  };

  const handleAbsenceSelect = () => {
    if (!canMarkAbsence) return;
    if (canMarkSingleAbsence) {
      if (absenceUnits > 0) {
        setAbsenceUnits(0);
        return;
      }

      setAbsenceUnits(1);
      setCarWork('none');
      setVacationUsages(createEmptyVacationUsages());
      return;
    }
    if (carWork === 'product') {
      setAbsenceUnits((units) => (units > 0 ? 0 : 1));
      return;
    }
    if (absenceUnits > 0) {
      setAbsenceUnits(0);
      return;
    }
    const nextUnits = Math.max(requiredVacation - selectedVacationTotal, 0);
    setAbsenceUnits(nextUnits || 1);
    if (selectedVacationTotal >= requiredVacation && requiredVacation > 0) {
      setVacationUsages((usages) => trimVacationUsagesToRequired(usages, requiredVacation - 1));
    }
  };

  const handleSave = () => {
    if (needsVacation && selectedTreatmentTotal !== requiredVacation) {
      showTemporaryMessage(
        `휴가 또는 결근 ${formatVacationUsage(requiredVacation)}일을 선택하세요.`,
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
      carWork,
      productPoint: recordCalculation.productPoint,
      carPoint: recordCalculation.carPoint,
      difference: recordCalculation.difference,
      absence: isAbsenceRecord,
      absenceUnits: isAbsenceRecord ? absenceUnits : 0,
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
            <span>{isSingleAbsenceRecord ? '결근 처리 중' : '근무 형태 선택'}</span>
          </div>
        </div>
        <div className="work-option-grid work-card-grid">
          {carOptions.map((option) => (
            <button
              aria-pressed={carWork === option.value}
              className={
                carWork === option.value
                  ? 'work-option work-card-option selected'
                  : 'work-option work-card-option'
              }
              disabled={
                isSingleAbsenceRecord ||
                (option.value === 'product' && productWork === 'none')
              }
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
            {selectedTreatmentTotal === requiredVacation
              ? '선택 완료'
              : `필요 ${formatVacationUsage(
                  Math.max(requiredVacation - selectedTreatmentTotal, 0),
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
          <strong>
            {formatDifference(
              vacationUsages.unhyu > 0
                ? -vacationUsages.unhyu
                : isAutomaticUnhyuDeduction
                  ? recordCalculation.difference
                  : recordCalculation.difference > 0
                    ? recordCalculation.difference
                    : 0,
            )}
          </strong>
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
            <dd>{formatDifference(vacationUsages.unhyu > 0 ? -vacationUsages.unhyu : isAutomaticUnhyuDeduction ? recordCalculation.difference : 0)}</dd>
          </div>
        </dl>
        {(selectedVacationTotal > 0 || absenceUnits > 0) ? (
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
              {absenceUnits > 0 ? ` 결근 ${formatVacationUsage(absenceUnits)}회` : ''}
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
            <p>
              {canMarkSingleAbsence
                ? '결근은 자동차 근무와 휴가를 적용하지 않고 1회로 처리합니다.'
                : '결근은 휴가 잔액을 차감하지 않으며 필요한 처리량과 조합할 수 있습니다.'}
            </p>
          </div>
          <button
            aria-pressed={isAbsenceRecord}
            className={
              isAbsenceRecord
                ? 'work-option work-card-option selected'
                : 'work-option work-card-option'
            }
            type="button"
            onClick={handleAbsenceSelect}
          >
            {absenceUnits > 0 ? `결근 ${formatVacationUsage(absenceUnits)}` : '결근 처리'}
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
