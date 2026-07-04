import { useState } from 'react';
import { getSettings, resetSettings, saveSettings } from '../../storage/SettingsStorage';
import type { AppSettings } from '../../types/settings';

type SettingsField = {
  key: keyof AppSettings;
  label: string;
  step: string;
};

const settingsFields: SettingsField[] = [
  { key: 'currentUnhyu', label: '현재 운휴', step: '0.5' },
  { key: 'carryOverUnhyu', label: '이월 운휴', step: '0.5' },
  { key: 'firstHalfAnnual', label: '상반기 일휴', step: '1' },
  { key: 'secondHalfAnnual', label: '하반기 일휴', step: '1' },
  { key: 'specialVacation', label: '특휴', step: '1' },
];

function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const [message, setMessage] = useState('');

  const showSavedMessage = () => {
    setMessage('저장되었습니다.');
    window.setTimeout(() => setMessage(''), 2200);
  };

  const handleChange = (key: keyof AppSettings, value: string) => {
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
    const defaultSettings = resetSettings();
    setSettings(defaultSettings);
    showSavedMessage();
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

      {message ? (
        <p className="settings-message" role="status">
          {message}
        </p>
      ) : null}
    </main>
  );
}

export default SettingsPage;
