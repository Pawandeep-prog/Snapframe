import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectStore, useTemporalStore } from '../../store/useProjectStore';
import { useExport } from '../../hooks/useExport';
import { useProjectIO } from '../../hooks/useProjectIO';
import { Button } from '../ui/Button';
import { Download, FolderOpen, Save, Loader2, Image, Undo2, Redo2, Plus, Check, X, Code2, Languages, Sun, Moon } from 'lucide-react';
import { getResolution } from '../../lib/resolutions';

interface ToolbarProps {
  onOpenJsonEditor: () => void;
  onToggleTheme: () => void;
  theme: 'dark' | 'light';
}

export function Toolbar({ onOpenJsonEditor, onToggleTheme, theme }: ToolbarProps) {
  const { t, i18n } = useTranslation();
  const { 
    meta, slides, activeSlideId, selectedResolutions,
    activeResolutionScope, setActiveResolutionScope,
    themeScope, setThemeScope,
    createNewProject
  } = useProjectStore();
  const { exportSlide, exportAll } = useExport();
  const { saveProject, loadProject } = useProjectIO();
  const [exporting, setExporting] = useState(false);
  const [exportingSlide, setExportingSlide] = useState(false);
  const [confirmingNew, setConfirmingNew] = useState(false);

  const activeId = activeSlideId ?? slides[0]?.id;
  const resolution = getResolution(selectedResolutions[0] ?? 'iphone-69');

  const { undo, redo, pastStates, futureStates } = useTemporalStore((state) => state);
  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'Escape' && confirmingNew) {
        setConfirmingNew(false);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (canUndo) undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (canRedo) redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo, confirmingNew]);

  async function handleExportAll() {
    setExporting(true);
    try {
      await exportAll();
    } finally {
      setExporting(false);
    }
  }

  async function handleExportSlide() {
    if (!activeId) return;
    setExportingSlide(true);
    try {
      await exportSlide(activeId);
    } finally {
      setExportingSlide(false);
    }
  }

  function handleConfirmNew() {
    createNewProject();
    useProjectStore.temporal.getState().clear();
    setConfirmingNew(false);
  }

  return (
    <header className="h-14 bg-[var(--surface-bg)] border-b border-[var(--border-subtle)] flex items-center justify-between px-5 flex-shrink-0">
      {/* Left: title info */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-[var(--text-secondary)]">{meta.appName || 'Untitled'}</span>
        <span className="text-[var(--text-faint)]">·</span>
        <span className="text-xs text-[var(--text-muted)]">
          {t('slide', { count: slides.length })}
        </span>
        {resolution && (
          <>
            <span className="text-[var(--text-faint)]">·</span>
            <span className="text-xs text-[var(--text-muted)]">{resolution.label}</span>
          </>
        )}
      </div>

      {/* Center: Targeting Controls */}
      {selectedResolutions.length > 0 && (
        <div className="flex items-center gap-5 bg-[var(--fill-raised)] rounded-lg px-4 py-1.5 border border-[var(--border-subtle)] shadow-sm">
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">{t('Device:')}</label>
            <select 
              className="bg-transparent text-[11px] font-medium text-[var(--text-primary)] outline-none cursor-pointer"
              value={activeResolutionScope}
              onChange={(e) => setActiveResolutionScope(e.target.value)}
            >
              <option value="global" className="bg-[var(--elevated-bg)]">{t('Global Base')}</option>
              {selectedResolutions.map(r => (
                <option key={r} value={r} className="bg-[var(--elevated-bg)]">{r.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}</option>
              ))}
            </select>
          </div>

          <div className="w-px h-3 bg-[var(--border-light)]" />

          <label className="flex items-center gap-2 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={themeScope === 'global'}
              onChange={(e) => setThemeScope(e.target.checked ? 'global' : 'slide')}
              className="rounded-sm border-[var(--border-lighter)] bg-[var(--fill-raised)] text-violet-500 focus:ring-violet-500 focus:ring-offset-0 focus:ring-offset-[var(--surface-bg)] cursor-pointer"
            />
            <span className="text-[11px] font-medium text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors uppercase tracking-wider">{t('All Slides')}</span>
          </label>
        </div>
      )}

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {confirmingNew ? (
          <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-1.5">
            <span className="text-xs text-red-400 font-medium mr-1">{t('Reset project?')}</span>
            <button
              onClick={handleConfirmNew}
              className="flex items-center gap-1 text-xs text-white bg-red-500/80 hover:bg-red-500 px-2 py-0.5 rounded-md transition-colors cursor-pointer font-medium"
            >
              <Check className="w-3 h-3" /> {t('Yes')}
            </button>
            <button
              onClick={() => setConfirmingNew(false)}
              className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] px-2 py-0.5 rounded-md hover:bg-[var(--fill-raised)] transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" /> {t('No')}
            </button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setConfirmingNew(true)} title={t('New')}>
            <Plus className="w-3.5 h-3.5" />
            {t('New')}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={loadProject} title={t('Open')}>
          <FolderOpen className="w-3.5 h-3.5" />
          {t('Open')}
        </Button>
        <Button size="sm" variant="ghost" onClick={saveProject} title={t('Save')}>
          <Save className="w-3.5 h-3.5" />
          {t('Save')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onOpenJsonEditor} title={t('JSON')}>
          <Code2 className="w-3.5 h-3.5" />
          {t('JSON')}
        </Button>
        <div className="w-px h-5 bg-[var(--border-light)]" />
        <Button size="sm" variant="ghost" onClick={() => undo()} disabled={!canUndo} title="Undo (Cmd+Z)">
          <Undo2 className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => redo()} disabled={!canRedo} title="Redo (Cmd+Shift+Z)">
          <Redo2 className="w-3.5 h-3.5" />
        </Button>
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-lg hover:bg-[var(--fill-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
        <div className="w-px h-5 bg-[var(--border-light)]" />
        <Languages className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        <select
          className="bg-transparent text-xs font-medium text-[var(--text-primary)] outline-none cursor-pointer"
          value={i18n.language}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
        >
          <option value="en" className="bg-[var(--elevated-bg)]">English</option>
          <option value="zh-CN" className="bg-[var(--elevated-bg)]">简体中文</option>
          <option value="zh-TW" className="bg-[var(--elevated-bg)]">繁體中文</option>
          <option value="ja" className="bg-[var(--elevated-bg)]">日本語</option>
        </select>
        <div className="w-px h-5 bg-[var(--border-light)]" />
        <Button size="sm" variant="secondary" onClick={handleExportSlide} disabled={exportingSlide}>
          {exportingSlide ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Image className="w-3.5 h-3.5" />}
          {t('Export Slide')}
        </Button>
        <Button size="sm" variant="primary" onClick={handleExportAll} disabled={exporting}>
          {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          {t('Export All')}
        </Button>
      </div>
    </header>
  );
}
