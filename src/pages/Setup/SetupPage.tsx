import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettings, saveSettings } from '../../storage/SettingsStorage';
import type { AppSettings } from '../../types/settings';
import {
  clearZeroOnFocus,
  createSettingsForm,
  formToSettings,
  restoreZeroOnBlur,
  type NumericSettingsKey,
} from '../../utils/settingsForm';

type SetupField = {
  key: NumericSettingsKey;
  label: string;
  step: string;
  max?: string;
};

const setupFields: SetupField[] = [
  { key: 'carryOverUnhyu', label: '이월 운휴', step: '0.5' },
  { key: 'currentUnhyu', label: '현재 운휴', step: '0.5' },
  { key: 'firstHalfAnnual', label: '상반기 일휴', step: '1' },
  { key: 'secondHalfAnnual', label: '하반기 일휴', step: '1' },
  { key: 'specialVacation', label: '특휴', step: '1' },
  { key: 'birthdayMonth', label: '생일 월', step: '1', max: '12' },
  { key: 'birthdayDay', label: '생일 일', step: '1', max: '31' },
];

function getInitialSettings(): AppSettings {
  const settings = getSettings();

  return {
    ...settings,
    birthdayMonth: settings.birthdayMonth > 0 ? settings.birthdayMonth : 1,
    birthdayDay: settings.birthdayDay > 0 ? settings.birthdayDay : 1,
  };
}

function SetupPage() {
  const navigate = useNavigate();
  const [baseSettings] = useState<AppSettings>(() => getInitialSettings());
  const [settingsForm, setSettingsForm] = useState(() => createSettingsForm(baseSettings));

  const handleChange = (key: NumericSettingsKey, value: string) => {
    setSettingsForm((previousSettings) => ({
      ...previousSettings,
      [key]: value,
    }));
  };

  const handleFocus = (key: NumericSettingsKey) => {
    setSettingsForm((previousSettings) => ({
      ...previousSettings,
      [key]: clearZeroOnFocus(previousSettings[key]),
    }));
  };

  const handleBlur = (key: NumericSettingsKey) => {
    setSettingsForm((previousSettings) => ({
      ...previousSettings,
      [key]: restoreZeroOnBlur(previousSettings[key]),
    }));
  };

  const handleSave = () => {
    saveSettings({
      ...formToSettings(settingsForm, baseSettings),
      isSetupCompleted: true,
    });
    navigate('/', { replace: true });
  };

  return (
    <main className="app-shell setup-page">
      <header className="setup-hero">
        <p className="eyebrow">초기 설정</p>
        <h1>운휴매니저 시작하기</h1>
        <p>처음 한 번만 기본 휴가 정보를 입력하면 바로 사용할 수 있습니다.</p>
      </header>

      <section className="setup-panel" aria-label="초기 설정 입력">
        {setupFields.map((field) => (
          <label className="setup-field" key={field.key}>
            <span>{field.label}</span>
            <input
              inputMode="decimal"
              max={field.max}
              min="0"
              step={field.step}
              type="number"
              value={settingsForm[field.key]}
              onBlur={() => handleBlur(field.key)}
              onChange={(event) => handleChange(field.key, event.target.value)}
              onFocus={() => handleFocus(field.key)}
            />
          </label>
        ))}
      </section>

      <button className="setup-save-button" type="button" onClick={handleSave}>
        저장하고 시작하기
      </button>
    </main>
  );
}

export default SetupPage;
