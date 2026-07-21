import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_VERSION } from '../../appVersion';
import { getRecords, replaceRecords } from '../../storage/LocalStorage';
import { getSettings, resetSettings, saveSettings } from '../../storage/SettingsStorage';
import { getSummaries, replaceSummaries } from '../../storage/SummaryStorage';
import type { DailyRecord } from '../../types/dailyRecord';
import type { MonthlySummary } from '../../types/monthlySummary';
import type { AppSettings } from '../../types/settings';
import {
  getCurrentAnnualVacationLabel,
  getCurrentAnnualVacationRemaining,
} from '../../utils/annualVacation';
import { today } from '../../utils/date';
import {
  clearZeroOnFocus,
  createSettingsForm,
  formToSettings,
  restoreZeroOnBlur,
  type NumericSettingsKey,
} from '../../utils/settingsForm';

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

const workSettingFields = settingsFields.slice(0, 5);
const vacationSettingFields = settingsFields.slice(5);

type BackupFile = {
  version: string;
  exportedAt: string;
  settings: AppSettings;
  records: DailyRecord[];
  summary: MonthlySummary[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBackupFile(value: unknown): value is BackupFile {
  if (!isObject(value)) {
    return false;
  }

  return (
    Boolean(value.version) &&
    isObject(value.settings) &&
    Array.isArray(value.records) &&
    Array.isArray(value.summary)
  );
}

function SettingsPage() {
  const navigate = useNavigate();
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const [settingsForm, setSettingsForm] = useState(() => createSettingsForm(getSettings()));
  const [message, setMessage] = useState('');
  const previewSettings = formToSettings(settingsForm, settings);

  const showMessage = (nextMessage: string) => {
    setMessage(nextMessage);
    window.setTimeout(() => setMessage(''), 2200);
  };

  const showSavedMessage = () => {
    showMessage('저장되었습니다.');
  };

  const handleChange = (key: NumericSettingsKey, value: string) => {
    setSettingsForm((previousSettings) => ({
      ...previousSettings,
      [key]: value,
    }));
  };

  const handleSave = () => {
    const savedSettings = saveSettings(formToSettings(settingsForm, settings));
    setSettings(savedSettings);
    setSettingsForm(createSettingsForm(savedSettings));
    showSavedMessage();
  };

  const handleBirthdayCalendarTypeSelect = (
    birthdayCalendarType: AppSettings['birthdayCalendarType'],
  ) => {
    setSettings((previousSettings) => ({
      ...previousSettings,
      birthdayCalendarType,
    }));
  };

  const handleBirthdayLeapMonthChange = (birthdayLeapMonth: boolean) => {
    setSettings((previousSettings) => ({
      ...previousSettings,
      birthdayLeapMonth,
    }));
  };

  const handleReset = () => {
    const defaultSettings = saveSettings({
      ...resetSettings(),
      isSetupCompleted: true,
    });
    setSettings(defaultSettings);
    setSettingsForm(createSettingsForm(defaultSettings));
    showSavedMessage();
  };

  const handleRestartSetup = () => {
    saveSettings({
      ...formToSettings(settingsForm, settings),
      isSetupCompleted: false,
    });
    navigate('/setup');
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

  const handleBackup = () => {
    const backup: BackupFile = {
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      settings: getSettings(),
      records: getRecords(),
      summary: getSummaries(),
    };
    const backupJson = JSON.stringify(backup, null, 2);
    const blob = new Blob([backupJson], { type: 'application/json' });
    const downloadUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');

    downloadLink.href = downloadUrl;
    downloadLink.download = `unhyu-manager-backup-${today()}.json`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    URL.revokeObjectURL(downloadUrl);
    showMessage('백업 파일을 만들었습니다.');
  };

  const handleRestoreClick = () => {
    restoreInputRef.current?.click();
  };

  const handleRestoreFile = async (file: File) => {
    try {
      const backup = JSON.parse(await file.text());

      if (!isBackupFile(backup)) {
        showMessage('올바른 백업 파일이 아닙니다.');
        return;
      }

      const shouldRestore = window.confirm(
        '기존 데이터가 모두 백업 파일 내용으로 교체됩니다. 복원하시겠습니까?',
      );

      if (!shouldRestore) {
        return;
      }

      const restoredSettings = saveSettings(backup.settings);
      replaceRecords(backup.records);
      replaceSummaries(backup.summary);
      setSettings(restoredSettings);
      setSettingsForm(createSettingsForm(restoredSettings));
      setMessage('복원이 완료되었습니다.');
      window.setTimeout(() => {
        navigate('/');
      }, 700);
    } catch {
      showMessage('올바른 백업 파일이 아닙니다.');
    }
  };

  return (
    <main className="app-shell settings-page">
      <header className="settings-header">
        <h1>설정</h1>
        <span>앱 기본값 관리</span>
      </header>

      <section className="settings-current-annual" aria-label="현재 기간 일휴">
        <span className="section-icon-badge annual" aria-hidden="true">
          📘
        </span>
        <div>
          <span>현재 기간 일휴</span>
          <strong>일휴 {getCurrentAnnualVacationRemaining(previewSettings)}일</strong>
          <p>{getCurrentAnnualVacationLabel()}</p>
        </div>
      </section>

      <section className="settings-card" aria-label="근무 설정 입력">
        <div className="settings-card-heading">
          <span className="section-icon-badge settings-work" aria-hidden="true">
            ⚙️
          </span>
          <div>
            <h2>근무 설정</h2>
            <p>운휴와 일휴 잔여 값을 관리합니다.</p>
          </div>
        </div>
        <div className="settings-panel">
          {workSettingFields.map((field) => (
            <label className="settings-field" key={field.key}>
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

      <section className="settings-card" aria-label="휴가 설정 입력">
        <div className="settings-card-heading">
          <span className="section-icon-badge settings-vacation" aria-hidden="true">
            🎂
          </span>
          <div>
            <h2>휴가 설정</h2>
            <p>생일휴가 발생 기준을 설정합니다.</p>
          </div>
        </div>
        <div className="settings-panel settings-panel-compact">
          <div className="settings-birthday-calendar">
            <span>생일 기준</span>
            <div className="settings-calendar-options" role="group" aria-label="생일 기준">
              <button
                aria-pressed={settings.birthdayCalendarType === 'solar'}
                className={settings.birthdayCalendarType === 'solar' ? 'selected' : ''}
                type="button"
                onClick={() => handleBirthdayCalendarTypeSelect('solar')}
              >
                양력
              </button>
              <button
                aria-pressed={settings.birthdayCalendarType === 'lunar'}
                className={settings.birthdayCalendarType === 'lunar' ? 'selected' : ''}
                type="button"
                onClick={() => handleBirthdayCalendarTypeSelect('lunar')}
              >
                음력
              </button>
            </div>
          </div>
          {vacationSettingFields.map((field) => (
            <label className="settings-field" key={field.key}>
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
          {settings.birthdayCalendarType === 'lunar' ? (
            <label className="settings-leap-month">
              <input
                checked={settings.birthdayLeapMonth}
                type="checkbox"
                onChange={(event) => handleBirthdayLeapMonthChange(event.target.checked)}
              />
              <span>윤달</span>
            </label>
          ) : null}
        </div>
      </section>

      <div className="settings-actions">
        <button className="settings-save-button" type="button" onClick={handleSave}>
          저장
        </button>
        <button className="settings-reset-button" type="button" onClick={handleReset}>
          초기화
        </button>
      </div>

      <section className="settings-card settings-setup-card" aria-label="초기 설정">
        <div className="settings-card-heading">
          <span className="section-icon-badge setup" aria-hidden="true">
            🧭
          </span>
          <div>
            <h2>초기 설정</h2>
            <p>처음 실행할 때의 설정 마법사를 다시 시작합니다.</p>
          </div>
        </div>
        <button className="settings-setup-button" type="button" onClick={handleRestartSetup}>
          초기 설정 다시 하기
        </button>
      </section>

      <section className="data-management-card" aria-label="데이터 관리">
        <div className="settings-card-heading">
          <span className="section-icon-badge data" aria-hidden="true">
            💾
          </span>
          <div>
            <h2>데이터 관리</h2>
            <strong>백업 / 복원</strong>
            <p>설정과 근무 기록을 JSON 파일로 보관합니다.</p>
          </div>
        </div>
        <div className="data-management-actions">
          <button type="button" onClick={handleBackup}>
            백업
          </button>
          <button type="button" onClick={handleRestoreClick}>
            복원
          </button>
        </div>
        <input
          ref={restoreInputRef}
          accept="application/json,.json"
          className="visually-hidden-input"
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';

            if (file) {
              void handleRestoreFile(file);
            }
          }}
        />
      </section>

      {message ? (
        <div className="settings-message-overlay" role="status">
          <div className="settings-message-popup">
            <span className="settings-message-icon" aria-hidden="true">
              ✓
            </span>
            <span>{message}</span>
          </div>
        </div>
      ) : null}

      <section className="app-info-card" aria-label="앱 정보">
        <span className="section-icon-badge info" aria-hidden="true">
          ℹ️
        </span>
        <strong>운휴매니저</strong>
        <span>Version {APP_VERSION}</span>
        <p>Developer by</p>
        <b>양희수</b>
      </section>
    </main>
  );
}

export default SettingsPage;
