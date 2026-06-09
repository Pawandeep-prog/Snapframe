import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../../store/useProjectStore';
import { ScreenshotCard } from '../preview/ScreenshotCard';
import { getResolutionWithCustom } from '../../lib/resolutions';
import { Button } from '../ui/Button';
import { X, Code2, Copy, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ProjectFile, Resolution, ResolutionId } from '../../types';

interface Props {
  onClose: () => void;
}

export function JsonEditorPanel({ onClose }: Props) {
  const { t } = useTranslation();
  const { exportProject, importProject } = useProjectStore();

  const [jsonText, setJsonText] = useState(() => JSON.stringify(exportProject(), null, 2));
  const [error, setError] = useState<string | null>(null);
  // Keep last valid parsed state so the preview doesn't go blank on a typo
  const [parsed, setParsed] = useState<ProjectFile>(() => exportProject());
  const [copied, setCopied] = useState(false);
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);

  const previewRef = useRef<HTMLDivElement>(null);
  const [previewSize, setPreviewSize] = useState({ w: 0, h: 0 });

  // Measure the right panel for scale calculation
  useLayoutEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setPreviewSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    observer.observe(el);
    const rect = el.getBoundingClientRect();
    setPreviewSize({ w: rect.width, h: rect.height });
    return () => observer.disconnect();
  }, []);

  // Escape closes without applying
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !(e.target instanceof HTMLTextAreaElement)) {
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleChange(value: string) {
    setJsonText(value);
    try {
      const p = JSON.parse(value) as ProjectFile;
      if (!p.version || !p.meta || !p.theme || !Array.isArray(p.slides)) {
        setError('Missing required fields: version, meta, theme, slides');
        return;
      }
      if (p.slides.length === 0) {
        setError('slides array must not be empty');
        return;
      }
      setParsed(p);
      setError(null);
      setPreviewSlideIndex((i) => Math.min(i, p.slides.length - 1));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  }

  function handleFormat() {
    try {
      setJsonText(JSON.stringify(JSON.parse(jsonText), null, 2));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cannot format — fix JSON errors first');
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(jsonText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleApply() {
    if (error) return;
    importProject(parsed);
    onClose();
  }

  // Resolve resolution for live preview
  const resolutionId = (parsed.meta.resolutionPresets?.[0] ?? 'iphone-69') as ResolutionId;
  const resolution = getResolutionWithCustom(resolutionId, parsed.meta.customResolution) as Resolution;

  const previewSlide = parsed.slides[previewSlideIndex];
  const slideCount = parsed.slides.length;
  const isValid = !error;

  // Scale to fit the right panel (leaving room for the nav bar)
  const pW = previewSize.w || 500;
  const pH = (previewSize.h || 700) - 48; // subtract nav bar height
  const scaleByW = (pW * 0.72) / resolution.width;
  const scaleByH = (pH * 0.82) / resolution.height;
  const scale = Math.min(scaleByW, scaleByH, 0.30);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--app-bg)]">
      {/* ── Header ── */}
      <div className="h-14 flex items-center justify-between px-5 border-b border-[var(--border-subtle)] bg-[var(--surface-bg)] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <Code2 className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-semibold text-[var(--text-secondary)]">{t('JSON Editor')}</span>
          <span className="text-[var(--text-faint)]">·</span>
          <span className="text-xs text-[var(--text-muted)]">{t('Edit directly or paste AI-generated JSON')}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={handleFormat}>
            {t('Format')}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCopy}>
            {copied
              ? <><Check className="w-3.5 h-3.5 text-emerald-400" /> {t('Copied!')}</>
              : <><Copy className="w-3.5 h-3.5" /> {t('Copy')}</>
            }
          </Button>
          <div className="w-px h-5 bg-[var(--fill-active)]" />
          <Button size="sm" variant="ghost" onClick={onClose}>
            {t('Discard')}
          </Button>
          <Button size="sm" variant="primary" onClick={handleApply} disabled={!isValid}>
            {t('Apply & Close')}
          </Button>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--fill-hover)] transition-colors ml-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: JSON textarea */}
        <div className="flex flex-col w-[55%] border-r border-[var(--border-subtle)] overflow-hidden">
          <textarea
            className="flex-1 resize-none bg-[var(--app-bg)] text-[13px] font-mono leading-relaxed p-5 outline-none"
            style={{
              color: 'var(--textarea-color)',
              caretColor: '#a78bfa',
            }}
            value={jsonText}
            onChange={(e) => handleChange(e.target.value)}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
          />

          {/* Status bar */}
          <div className="h-8 px-5 flex items-center gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-bg)] flex-shrink-0">
            <div className={`flex items-center gap-1.5 text-xs font-medium ${isValid ? 'text-emerald-400' : 'text-red-400'}`}>
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isValid ? 'bg-emerald-400' : 'bg-red-400'}`} />
              {isValid
                ? `${t('Valid JSON')} · ${t('slide', { count: slideCount })}`
                : error}
            </div>
            {isValid && (
              <>
                <span className="text-[var(--text-faint)]">·</span>
                <span className="text-xs text-[var(--text-muted)]">{resolution.label}</span>
              </>
            )}
          </div>
        </div>

        {/* Right: live preview */}
        <div
          ref={previewRef}
          className="flex-1 flex flex-col overflow-hidden relative"
          style={{ background: 'radial-gradient(ellipse at center, var(--canvas-start) 0%, var(--canvas-end) 70%)' }}
        >
          {/* Subtle grid */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          {/* Nav bar */}
          <div className="relative z-10 h-12 flex items-center justify-between px-5 flex-shrink-0">
            <span className="text-[10px] font-medium text-[var(--text-faint)] uppercase tracking-widest">
              {t('Live Preview')}
            </span>

            {slideCount > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewSlideIndex((i) => Math.max(0, i - 1))}
                  disabled={previewSlideIndex === 0}
                  className="w-6 h-6 rounded-full bg-[var(--fill-hover)] flex items-center justify-center disabled:opacity-20 hover:bg-[var(--fill-medium)] transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
<ChevronLeft className="w-3.5 h-3.5 text-[var(--text-primary)]" />
        </button>
        <span className="text-xs text-[var(--text-muted)] font-medium tabular-nums">
          {previewSlideIndex + 1} / {slideCount}
        </span>
        <button
          onClick={() => setPreviewSlideIndex((i) => Math.min(slideCount - 1, i + 1))}
          disabled={previewSlideIndex === slideCount - 1}
          className="w-6 h-6 rounded-full bg-[var(--fill-hover)] flex items-center justify-center disabled:opacity-20 hover:bg-[var(--fill-medium)] transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                </button>
              </div>
            )}
          </div>

          {/* Card — centered in remaining space */}
          <div className="relative z-10 flex-1 flex items-center justify-center">
            {previewSlide && (
              <div style={{ filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.6))' }}>
                <ScreenshotCard
                  slide={previewSlide}
                  theme={parsed.theme}
                  resolution={resolution}
                  scale={scale}
                  showFrame={true}
                  appName={parsed.meta.iconDataUrl ? parsed.meta.appName : undefined}
                  iconDataUrl={parsed.meta.iconDataUrl}
                />
              </div>
            )}
          </div>

          {/* Dimensions label */}
          <div className="relative z-10 h-8 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] text-[var(--text-faint)] font-mono">
              {resolution.width} × {resolution.height}px
            </span>
          </div>

          {/* Error overlay — keeps last valid preview visible underneath */}
          {!isValid && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--app-bg)]/70 backdrop-blur-sm">
              <div className="bg-red-500/10 border border-red-500/25 rounded-2xl px-8 py-6 max-w-xs text-center">
                <p className="text-red-400 text-sm font-semibold mb-1.5">{t('Invalid JSON')}</p>
                <p className="text-red-400/60 text-xs leading-relaxed">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
