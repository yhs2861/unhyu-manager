import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
      version: '2.0.0',
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
        <p className="eyebrow">휴가 설정</p>
        <h1>설정</h1>
      </header>

      <section className="settings-current-annual" aria-label="현재 기간 일휴">
        <span>현재 기간 일휴</span>
        <strong>일휴 {getCurrentAnnualVacationRemaining(previewSettings)}</strong>
        <p>{getCurrentAnnualVacationLabel()}</p>
      </section>

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
              value={settingsForm[field.key]}
              onBlur={() => handleBlur(field.key)}
              onChange={(event) => handleChange(field.key, event.target.value)}
              onFocus={() => handleFocus(field.key)}
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

      <section className="data-management-card" aria-label="데이터 관리">
        <div>
          <span>데이터 관리</span>
          <strong>백업 / 복원</strong>
          <p>설정, 근무 기록, 월별 마감 기록을 JSON 파일로 보관합니다.</p>
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
        <p className="settings-message" role="status">
          {message}
        </p>
      ) : null}

      <section className="app-info-card" aria-label="앱 정보">
        <strong>운휴매니저</strong>
        <span>Version 2.0.0</span>
        <p>Developer by</p>
        <b>양희수</b>
      </section>
    </main>
  );
}

export default SettingsPage;
