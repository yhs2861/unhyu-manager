import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettings, resetSettings, saveSettings } from '../../storage/SettingsStorage';
import type { AppSettings } from '../../types/settings';

type NumericSettingsKey = Exclude<keyof AppSettings, 'isSetupCompleted'>;

type SettingsField = {
  key: NumericSettingsKey;
  label: string;
  step: string;
  max?: string;
};

const settingsFields: SettingsField[] = [
  { key: 'currentUnhyu', label: '현재 운휴', step: '0.5' },
  { key: 'carryOverUnhyu', label: '이월 운휴', step: '0.5' },
  { key: 'firstHalfAnnual', label: '상반기 일휴', step: '1' },
  { key: 'secondHalfAnnual', label: '하반기 일휴', step: '1' },
  { key: 'specialVacation', label: '특휴', step: '1' },
  { key: 'birthdayMonth', label: '생일 월', step: '1', max: '12' },
  { key: 'birthdayDay', label: '생일 일', step: '1', max: '31' },
];

function SettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const [message, setMessage] = useState('');

  const showSavedMessage = () => {
    setMessage('저장되었습니다.');
    window.setTimeout(() => setMessage(''), 2200);
  };

  const handleChange = (key: NumericSettingsKey, value: string) => {
    setSettings((previousSettings) => ({
      ...previousSettings,
      [key]: Number(value),
    }));
  };

  const handleSave = () => {
    const savedSettings = saveSettings(settings);
    setSettings(savedSettings);
    showSavedMessage();
  };

  const handleReset = () => {
    const defaultSettings = saveSettings({
      ...resetSettings(),
      isSetupCompleted: true,
    });
    setSettings(defaultSettings);
    showSavedMessage();
  };

  const handleRestartSetup = () => {
    saveSettings({
      ...settings,
      isSetupCompleted: false,
    });
    navigate('/setup');
  };

  return (
    <main className="app-shell settings-page">
      <header className="settings-header">
        <p className="eyebrow">휴가 설정</p>
        <h1>설정</h1>
      </header>

      <section className="settings-panel" aria-label="휴가 설정 입력">
        {settingsFields.map((field) => (
          <label className="settings-field" key={field.key}>
            <span>{field.label}</span>
            <input
              inputMode="decimal"
              max={field.max}
              min="0"
              step={field.step}
              type="number"
              value={settings[field.key]}
              onChange={(event) => handleChange(field.key, event.target.value)}
            />
          </label>
        ))}
      </section>

      <div className="settings-actions">
        <button className="settings-save-button" type="button" onClick={handleSave}>
          저장
        </button>
        <button className="settings-reset-button" type="button" onClick={handleReset}>
          초기화
        </button>
      </div>

      <button className="settings-setup-button" type="button" onClick={handleRestartSetup}>
        초기 설정 다시 하기
      </button>

      {message ? (
        <p className="settings-message" role="status">
          {message}
        </p>
      ) : null}
    </main>
  );
}

export default SettingsPage;
