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

const setupSections = [
  {
    description: '이월분과 현재 적립된 운휴를 입력합니다.',
    fields: setupFields.slice(0, 2),
    icon: '🌿',
    tone: 'unhyu',
    title: '운휴 설정',
  },
  {
    description: '상반기와 하반기 일휴 기준을 입력합니다.',
    fields: setupFields.slice(2, 4),
    icon: '📘',
    tone: 'annual',
    title: '일휴 설정',
  },
  {
    description: '회사에서 부여된 특휴 개수를 입력합니다.',
    fields: setupFields.slice(4, 5),
    icon: '💜',
    tone: 'special',
    title: '특별휴가',
  },
  {
    description: '생일휴가가 발생하는 월과 일을 입력합니다.',
    fields: setupFields.slice(5),
    icon: '🎂',
    tone: 'birthday',
    title: '생일 설정',
  },
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
        <span className="section-icon-badge setup" aria-hidden="true">
          🗓️
        </span>
        <div>
          <h1>운휴매니저</h1>
          <strong>초기 설정</strong>
          <p>처음 한 번만 기본 휴가 정보를 입력하면 바로 사용할 수 있습니다.</p>
        </div>
      </header>

      {setupSections.map((section) => (
        <section className="setup-card" aria-label={section.title} key={section.title}>
          <div className="setup-card-heading">
            <span className={`section-icon-badge setup-${section.tone}`} aria-hidden="true">
              {section.icon}
            </span>
            <div>
              <h2>{section.title}</h2>
              <p>{section.description}</p>
            </div>
          </div>
          <div className="setup-panel">
            {section.fields.map((field) => (
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
          </div>
        </section>
      ))}

      <button className="setup-save-button" type="button" onClick={handleSave}>
        저장하고 시작하기
      </button>
    </main>
  );
}

export default SetupPage;
