import { useMemo, useState } from 'react';
import { calculate } from '../../engine/WorkCalculator';
import type { CarWork, ProductWork, VacationType } from '../../types/work';

type ProductOption = {
  label: string;
  value: ProductWork;
};

type CarOption = {
  label: string;
  value: CarWork;
};

type VacationOption = {
  label: string;
  value: Exclude<VacationType, 'none'>;
};

const productOptions: ProductOption[] = [
  { label: '없음', value: 'none' },
  { label: '주간', value: 'day' },
  { label: '야간', value: 'night' },
  { label: '주간+야간', value: 'dayNight' },
];

const carOptions: CarOption[] = [
  { label: '없음', value: 'none' },
  { label: '주간', value: 'day' },
  { label: '연장', value: 'overtime' },
];

const vacationOptions: VacationOption[] = [
  { label: '운휴', value: 'unhyu' },
  { label: '일휴', value: 'ilhyu' },
  { label: '특휴', value: 'special' },
];

function getResultMessage(difference: number) {
  if (difference > 0) {
    return `운휴 적립 +${difference}`;
  }

  if (difference < 0) {
    return `휴가 처리 필요 ${difference}`;
  }

  return '변동 없음';
}

function InputPage() {
  const [productWork, setProductWork] = useState<ProductWork>('none');
  const [carWork, setCarWork] = useState<CarWork>('none');
  const [vacationType, setVacationType] = useState<VacationType>('none');
  const [memo, setMemo] = useState('');

  const calculation = useMemo(() => calculate(productWork, carWork), [productWork, carWork]);
  const needsVacation = calculation.difference < 0;

  const handleSave = () => {
    console.log({
      productWork,
      carWork,
      calculation,
      vacationType: needsVacation ? vacationType : 'none',
      memo,
    });
  };

  return (
    <main className="app-shell input-page">
      <header className="input-header">
        <p className="eyebrow">오늘 입력</p>
        <h1>운휴 기록</h1>
      </header>

      <section className="input-panel" aria-labelledby="product-work-title">
        <h2 id="product-work-title">제품부두</h2>
        <div className="option-grid option-grid-compact">
          {productOptions.map((option) => (
            <button
              className={productWork === option.value ? 'option-button selected' : 'option-button'}
              key={option.value}
              type="button"
              onClick={() => setProductWork(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="input-panel" aria-labelledby="car-work-title">
        <h2 id="car-work-title">자동차부두</h2>
        <div className="option-grid">
          {carOptions.map((option) => (
            <button
              className={carWork === option.value ? 'option-button selected' : 'option-button'}
              key={option.value}
              type="button"
              onClick={() => setCarWork(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section
        className={needsVacation ? 'result-panel result-negative' : 'result-panel'}
        aria-live="polite"
      >
        <p>계산 결과</p>
        <strong>{getResultMessage(calculation.difference)}</strong>
        <span>
          제품 {calculation.productPoint} / 자동차 {calculation.carPoint}
        </span>
      </section>

      {needsVacation ? (
        <section className="input-panel" aria-labelledby="vacation-title">
          <h2 id="vacation-title">휴가 처리</h2>
          <div className="option-grid">
            {vacationOptions.map((option) => (
              <button
                className={vacationType === option.value ? 'option-button selected' : 'option-button'}
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

      <section className="input-panel" aria-labelledby="memo-title">
        <label htmlFor="work-memo" id="memo-title">
          메모
        </label>
        <textarea
          id="work-memo"
          placeholder="특이사항을 입력하세요."
          rows={5}
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
        />
      </section>

      <button className="save-button" type="button" onClick={handleSave}>
        저장
      </button>
    </main>
  );
}

export default InputPage;
