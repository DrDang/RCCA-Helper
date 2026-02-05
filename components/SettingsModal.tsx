import React from 'react';
import { AppSettings } from '../types';
import { X, Save, Moon, Sun, HardDrive, Clock } from 'lucide-react';

interface SettingsModalProps {
  settings: AppSettings;
  lastExportTimestamp: string | null;
  onUpdateSettings: (settings: AppSettings) => void;
  onClose: () => void;
  onBackupNow: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  lastExportTimestamp,
  onUpdateSettings,
  onClose,
  onBackupNow,
}) => {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

      {/* Modal */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[480px] rounded-xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--color-surface-primary)',
          borderColor: 'var(--color-border-primary)',
          border: '1px solid var(--color-border-primary)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--color-border-primary)' }}
        >
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">

          {/* Appearance section */}
          <div>
            <h3
              className="text-sm font-semibold mb-3 flex items-center gap-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {settings.theme === 'light' ? <Sun size={16} /> : <Moon size={16} />} Appearance
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Theme</span>
              <div
                className="flex items-center gap-1 rounded-lg p-1"
                style={{ backgroundColor: 'var(--color-surface-tertiary)' }}
              >
                <button
                  onClick={() => onUpdateSettings({ ...settings, theme: 'light' })}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    settings.theme === 'light' ? 'shadow' : ''
                  }`}
                  style={{
                    backgroundColor: settings.theme === 'light' ? 'var(--color-surface-primary)' : 'transparent',
                    color: settings.theme === 'light' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  }}
                >
                  <Sun size={14} /> Light
                </button>
                <button
                  onClick={() => onUpdateSettings({ ...settings, theme: 'dark' })}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    settings.theme === 'dark' ? 'shadow' : ''
                  }`}
                  style={{
                    backgroundColor: settings.theme === 'dark' ? 'var(--color-surface-primary)' : 'transparent',
                    color: settings.theme === 'dark' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  }}
                >
                  <Moon size={14} /> Dark
                </button>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--color-border-primary)' }} />

          {/* Backup section */}
          <div>
            <h3
              className="text-sm font-semibold mb-3 flex items-center gap-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <HardDrive size={16} /> Backup & Export
            </h3>

            {/* Auto-backup toggle */}
            <label className="flex items-center justify-between mb-3 cursor-pointer">
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Auto-backup</span>
              <input
                type="checkbox"
                checked={settings.autoBackupEnabled}
                onChange={(e) => onUpdateSettings({ ...settings, autoBackupEnabled: e.target.checked })}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
            </label>

            {/* Interval selector */}
            {settings.autoBackupEnabled && (
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                  <Clock size={14} /> Interval:
                </span>
                <select
                  value={settings.autoBackupIntervalMinutes}
                  onChange={(e) => onUpdateSettings({ ...settings, autoBackupIntervalMinutes: Number(e.target.value) })}
                  className="text-sm rounded px-2 py-1"
                  style={{
                    backgroundColor: 'var(--color-surface-primary)',
                    borderColor: 'var(--color-border-secondary)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border-secondary)',
                  }}
                >
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                </select>
              </div>
            )}

            {/* Project file name */}
            <div className="mb-4">
              <label className="text-sm block mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                Backup file name prefix
              </label>
              <input
                type="text"
                value={settings.projectFileName}
                onChange={(e) => onUpdateSettings({ ...settings, projectFileName: e.target.value })}
                className="w-full text-sm rounded px-2 py-1.5"
                style={{
                  backgroundColor: 'var(--color-surface-primary)',
                  borderColor: 'var(--color-border-secondary)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border-secondary)',
                }}
                placeholder="RCCA_Backup"
              />
            </div>

            {/* Backup now button */}
            <button
              onClick={onBackupNow}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              <Save size={15} /> Backup Now
            </button>

            {/* Last export timestamp */}
            {lastExportTimestamp && (
              <p className="text-xs mt-2 text-center" style={{ color: 'var(--color-text-muted)' }}>
                Last backup: {new Date(lastExportTimestamp).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
