import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../../store/useProjectStore';
import { THEMES, THEME_TEMPLATE_JSON } from '../../lib/themes';
import { FONT_PAIRINGS } from '../../lib/fonts';
import { generateThemeVariants, generatePaletteThemes } from '../../lib/colorTheory';
import { buildGradientFromPalette } from '../../lib/colorExtractor';
import type { LayoutMode, FontPairingId, BackgroundType, ExtractedPalette, ThemeTemplate } from '../../types';
import { Palette, Sparkles, Upload, Download, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui/Button';

const LAYOUT_MODE_META = {
  'header-above': { desc: 'Title on top, device below' },
  'device-above': { desc: 'Device on top, title below' },
  'overlay': { desc: 'Device centered, text overlaid' },
} as const;

function SectionHeader({ 
  label, isOpen, onToggle 
}: { 
  label: string; isOpen: boolean; onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center justify-between w-full py-1.5 cursor-pointer group"
    >
      <p className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">{label}</p>
      {isOpen
        ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-faint)] group-hover:text-[var(--text-tertiary)] transition-colors" />
        : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-faint)] group-hover:text-[var(--text-tertiary)] transition-colors" />}
    </button>
  );
}

function SliderRow({
  label, value, min, max, step, suffix, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number;
  suffix?: string; onChange: (v: number) => void;
}) {
  const displayVal = suffix === '%' ? Math.round(value * 100) : value.toFixed(2);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[var(--text-tertiary)]">{label}</span>
        <span className="text-[10px] text-[var(--text-muted)] font-mono">{displayVal}{suffix ?? ''}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

interface ThemePickerProps {
  extractedPalette?: ExtractedPalette | null;
  view: 'design' | 'device';
}

export function ThemePicker({ extractedPalette, view }: ThemePickerProps) {
  const { t } = useTranslation();
  const {
    theme, setTheme,
    importThemeTemplate, exportThemeTemplate,
    slides, activeSlideId,
    setSlideTheme,
    activeResolutionScope, themeScope
  } = useProjectStore();

  const [showTemplate, setShowTemplate] = useState(false);
  const [copied, setCopied] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    presets: true,
    colors: true,
    layout: true,
    typography: true,
    device: true,
    pills: true,
    json: false,
  });

  const activeSlide = slides.find((s) => s.id === activeSlideId);
  // Effective theme for display: merge global + per-slide overrides
  let effectiveTheme = activeSlide?.themeOverrides
    ? { ...theme, ...activeSlide.themeOverrides }
    : theme;

  const realEffectiveTheme = effectiveTheme;
  if (activeResolutionScope !== 'global' && effectiveTheme.resolutionOverrides?.[activeResolutionScope]) {
    effectiveTheme = { ...effectiveTheme, ...effectiveTheme.resolutionOverrides[activeResolutionScope] };
  }


  // Route theme changes to the right target
  function handleThemeChange(changes: Record<string, any>) {
    if (activeResolutionScope !== 'global') {
      const currentOverrides = realEffectiveTheme.resolutionOverrides || {};
      changes = {
        resolutionOverrides: {
          ...currentOverrides,
          [activeResolutionScope]: {
            ...(currentOverrides[activeResolutionScope] || {}),
            ...changes
          }
        }
      };
    } else {
      // 🚀 Global Numeric Shift Override
      // If the user drags a global scale/offset but explicit overrides exist on specific phones,
      // intelligently shift the children proportionally instead of ignoring them.
      const currentOverrides = { ...(realEffectiveTheme.resolutionOverrides || {}) };
      let overridesChanged = false;

      const continuousKeys = ['deviceSizeScale', 'deviceOffsetX', 'deviceOffsetY'];
      
      for (const key of continuousKeys) {
        if (key in changes && typeof changes[key] === 'number') {
          const oldVal = (realEffectiveTheme as any)[key] ?? 0;
          const delta = changes[key] - oldVal;
          
          if (delta !== 0) {
            for (const res in currentOverrides) {
              const rId = res as keyof typeof currentOverrides;
              const resOverride = currentOverrides[rId];
              if (resOverride && key in resOverride && typeof (resOverride as any)[key] === 'number') {
                currentOverrides[rId] = {
                  ...resOverride,
                  [key]: (resOverride as any)[key] + delta,
                };
                overridesChanged = true;
              }
            }
          }
        }
      }

      if (overridesChanged) {
        changes.resolutionOverrides = currentOverrides;
      }
    }

    if (themeScope === 'slide' && activeSlideId) {
      setSlideTheme(activeSlideId, changes);
    } else {
      setTheme(changes);
    }
  }

  const smartVariants = generateThemeVariants(effectiveTheme.accentColor);
  const palette = extractedPalette;

  function toggleSection(key: string) {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleImportTheme() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const json = JSON.parse(ev.target?.result as string) as ThemeTemplate;
          if (!json.theme) {
            setJsonError('Invalid theme file: missing "theme" object');
            return;
          }
          importThemeTemplate(json);
          setJsonError(null);
        } catch {
          setJsonError('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function handleExportTheme() {
    const template = exportThemeTemplate();
    const json = JSON.stringify(template, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(effectiveTheme.name || 'theme').toLowerCase().replace(/\s+/g, '-')}-theme.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyTemplate() {
    navigator.clipboard.writeText(THEME_TEMPLATE_JSON);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-1">


      {/* ═══════════ EFFECTIVE SCREEN OVERRIDE INDICATOR ═══════════ */}
      {activeResolutionScope !== 'global' && realEffectiveTheme.resolutionOverrides?.[activeResolutionScope] && (
        <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-2 mb-1 flex flex-col gap-2 items-center text-center">
          <span className="text-[10px] text-violet-300 tracking-wide">
            {t('Editing')} {activeResolutionScope.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')} {t('Overrides')}
          </span>
          <button
            onClick={() => {
              const nextOverrides = { ...realEffectiveTheme.resolutionOverrides };
              delete nextOverrides[activeResolutionScope];
              if (themeScope === 'slide' && activeSlideId) {
                setSlideTheme(activeSlideId, { resolutionOverrides: nextOverrides });
              } else {
                setTheme({ resolutionOverrides: nextOverrides });
              }
            }}
            className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] bg-[var(--fill-raised)] hover:bg-[var(--fill-active)] transition-colors border border-[var(--border-light)] px-3 py-1 rounded-md cursor-pointer"
          >
            {t('Reset to Global Settings')}
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          DETECTED PALETTE (from screenshot)
          ═══════════════════════════════════════════ */}
      {palette && (
        <div className="rounded-xl bg-[var(--fill-raised)] border border-[var(--border-subtle)] p-3 flex flex-col gap-2.5 mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-xs text-[var(--text-tertiary)] font-medium">{t('Colors from Screenshot')}</span>
            </div>
            <Button size="sm" variant="primary" onClick={() => {
              const gradient = buildGradientFromPalette(palette);
              handleThemeChange({
                id: 'custom',
                name: 'From Screenshot',
                background: gradient,
                backgroundType: 'gradient',
                textColor: palette.isDark ? '#ffffff' : '#0f0f0f',
                subtitleColor: palette.isDark ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.6)',
                accentColor: palette.vibrant,
                shadowStyle: `0 20px 60px ${palette.vibrant}55`,
              });
            }}>
              <Palette className="w-3 h-3" />
              {t('Apply')}
            </Button>
          </div>
          <div className="flex gap-1.5">
            {[palette.dominant, palette.vibrant, palette.muted, palette.darkVibrant, palette.lightVibrant].map((c, i) => (
              <div key={i} className="flex-1 h-5 rounded-md border border-[var(--border-light)]" style={{ background: c }} title={c} />
            ))}
          </div>
          <div>
            <p className="text-[10px] text-[var(--text-muted)] mb-1.5">{t('Smart themes — click to apply')}</p>
            <div className="flex gap-2">
              {generatePaletteThemes(palette).map((v) => (
                <button
                  key={v.label}
                  title={v.label}
                  onClick={() => handleThemeChange({
                    id: 'custom',
                    name: v.label,
                    background: v.background,
                    backgroundType: v.backgroundType,
                    textColor: v.textColor,
                    subtitleColor: v.subtitleColor,
                    accentColor: v.accentColor,
                  })}
                  className="flex-1 h-9 rounded-xl border border-[var(--border-lighter)] hover:scale-105 hover:border-[var(--border-lighter)] transition-all cursor-pointer relative overflow-hidden"
                  style={{ background: v.background }}
                >
                  <span className="absolute bottom-0.5 inset-x-0 text-center text-[8px] font-medium"
                    style={{ color: v.textColor, opacity: 0.7 }}>
                    {v.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          PRESET THEMES
          ═══════════════════════════════════════════ */}
      {view === 'design' && <SectionHeader label={t('Preset Themes')} isOpen={expandedSections.presets ?? true} onToggle={() => toggleSection('presets')} />}
      {view === 'design' && expandedSections.presets && (
        <div className="grid grid-cols-3 gap-2 mb-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => handleThemeChange(t)}
              className={`relative h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                effectiveTheme.id === t.id
                  ? 'border-violet-400 scale-105 shadow-lg shadow-violet-900/40'
                  : 'border-transparent hover:border-[var(--border-lighter)]'
              }`}
              style={{ background: t.background }}
              title={t.name}
            >
              <div className="absolute inset-0 flex items-end p-1.5">
                <span className="text-[9px] font-semibold drop-shadow leading-tight"
                  style={{ color: t.textColor }}>
                  {t.name}
                </span>
              </div>
            </button>
          ))}
          {effectiveTheme.id === 'custom' && (
            <div className="h-14 rounded-xl overflow-hidden border-2 border-violet-400 flex items-end p-1.5"
              style={{ background: effectiveTheme.background }}>
              <span className="text-[9px] font-semibold text-[var(--text-secondary)]">{t('Custom')}</span>
            </div>
          )}
        </div>
      )}

      {view === 'design' && <div className="h-px bg-[var(--fill-raised)]" />}

      {/* ═══════════════════════════════════════════
          COLORS
          ═══════════════════════════════════════════ */}
      {view === 'design' && <SectionHeader label={t('Colors')} isOpen={expandedSections.colors ?? true} onToggle={() => toggleSection('colors')} />}
      {view === 'design' && expandedSections.colors && (
        <div className="flex flex-col gap-3 mb-2">
          {/* Accent Color */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-[var(--text-tertiary)]">{t('Accent Color')}</span>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">{effectiveTheme.accentColor}</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="color"
                value={effectiveTheme.accentColor}
                onChange={(e) => handleThemeChange({ accentColor: e.target.value })}
                className="w-9 h-9 rounded-xl cursor-pointer border border-[var(--border-light)] bg-transparent"
              />
              <div className="flex-1">
                <p className="text-[10px] text-[var(--text-muted)] mb-1">{t('Smart Backgrounds')}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {smartVariants.map((v) => (
                    <button
                      key={v.label}
                      title={v.label}
                      onClick={() => handleThemeChange({
                        id: 'custom',
                        name: v.label,
                        background: v.background,
                        backgroundType: v.backgroundType,
                        textColor: v.textColor,
                        subtitleColor: v.subtitleColor,
                        accentColor: v.accentColor,
                      })}
                      className="w-7 h-7 rounded-lg border border-[var(--border-lighter)] hover:scale-110 transition-transform cursor-pointer flex-shrink-0 relative overflow-hidden"
                      style={{ background: v.background }}
                    >
                      <span className="sr-only">{v.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Background Type */}
          <div>
            <span className="text-[11px] text-[var(--text-tertiary)] mb-1 block">{t('Background Type')}</span>
            <div className="flex gap-1 flex-wrap">
              {[
                { id: 'solid' as BackgroundType, label: t('Solid') },
                { id: 'gradient' as BackgroundType, label: t('Gradient') },
                { id: 'mesh' as BackgroundType, label: t('Mesh') },
                { id: 'noise' as BackgroundType, label: t('Noise') },
              ].map((b) => (
                <button
                  key={b.id}
                  onClick={() => handleThemeChange({ backgroundType: b.id })}
                  className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${
                    effectiveTheme.backgroundType === b.id
                      ? 'bg-violet-600 text-white'
                      : 'bg-[var(--fill-hover)] text-[var(--text-tertiary)] hover:bg-[var(--fill-medium)]'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          LAYOUT
          ═══════════════════════════════════════════ */}
      {view === 'device' && <SectionHeader label={t('Layout')} isOpen={expandedSections.layout ?? true} onToggle={() => toggleSection('layout')} />}
      {view === 'device' && expandedSections.layout && (
        <div className="flex flex-col gap-3 mb-2">
          {/* Layout Mode */}
          <div>
            <span className="text-[11px] text-[var(--text-tertiary)] mb-1 block">{t('Layout Mode')}</span>
            <div className="flex gap-1">
              {[
                { id: 'header-above' as LayoutMode, label: t('Header Above') },
                { id: 'device-above' as LayoutMode, label: t('Device Above') },
                { id: 'overlay' as LayoutMode, label: t('Overlay') },
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => handleThemeChange({ layoutMode: mode.id })}
                  title={LAYOUT_MODE_META[mode.id].desc}
                  className={`flex-1 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${
                    effectiveTheme.layoutMode === mode.id
                      ? 'bg-violet-600 text-white'
                      : 'bg-[var(--fill-hover)] text-[var(--text-tertiary)] hover:bg-[var(--fill-medium)]'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text Alignment */}
          <div>
            <span className="text-[11px] text-[var(--text-tertiary)] mb-1 block">{t('Text Alignment')}</span>
            <div className="flex gap-1">
              {[
                { id: 'left' as const, label: t('Left') },
                { id: 'center' as const, label: t('Center') },
                { id: 'right' as const, label: t('Right') },
              ].map((a) => (
                <button
                  key={a.id}
                  onClick={() => handleThemeChange({ textAlign: a.id })}
                  className={`flex-1 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${
                    (effectiveTheme.textAlign ?? 'center') === a.id
                      ? 'bg-violet-600 text-white'
                      : 'bg-[var(--fill-hover)] text-[var(--text-tertiary)] hover:bg-[var(--fill-medium)]'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Spacing Sliders */}
          <SliderRow
            label={t('Top Padding')} value={effectiveTheme.paddingTop ?? 0.05}
            min={0.01} max={0.15} step={0.005} suffix="%"
            onChange={(v) => handleThemeChange({ paddingTop: v })}
          />
          <SliderRow
            label={t('Bottom Padding')} value={effectiveTheme.paddingBottom ?? 0.04}
            min={0.01} max={0.15} step={0.005} suffix="%"
            onChange={(v) => handleThemeChange({ paddingBottom: v })}
          />
          <SliderRow
            label={t('Content Gap')} value={effectiveTheme.contentGap ?? 0.02}
            min={0.005} max={0.08} step={0.005} suffix="%"
            onChange={(v) => handleThemeChange({ contentGap: v })}
          />
        </div>
      )}

      {view === 'design' && <div className="h-px bg-[var(--fill-raised)]" />}

      {/* ═══════════════════════════════════════════
          TYPOGRAPHY
          ═══════════════════════════════════════════ */}
      {view === 'design' && <SectionHeader label={t('Typography')} isOpen={expandedSections.typography ?? true} onToggle={() => toggleSection('typography')} />}
      {view === 'design' && expandedSections.typography && (
        <div className="flex flex-col gap-3 mb-2">
          {/* Font Pairing */}
          <div>
            <span className="text-[11px] text-[var(--text-tertiary)] mb-1 block">{t('Font Pairing')}</span>
            <div className="flex flex-col gap-1">
              {FONT_PAIRINGS.map((fp) => (
                <button
                  key={fp.id}
                  onClick={() => handleThemeChange({ fontPairing: fp.id as FontPairingId })}
                  className={`text-left px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                    effectiveTheme.fontPairing === fp.id
                      ? 'bg-violet-600/40 border border-violet-500/50 text-white'
                      : 'bg-[var(--fill-raised)] border border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:bg-[var(--fill-active)]'
                  }`}
                >
                  {fp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Headline Weight */}
          <div>
            <span className="text-[11px] text-[var(--text-tertiary)] mb-1 block">{t('Headline Weight')}</span>
            <div className="flex gap-1">
              {([
                { w: 400, label: t('Light') },
                { w: 600, label: t('Semi') },
                { w: 700, label: t('Bold') },
                { w: 900, label: t('Black') },
              ] as const).map((opt) => (
                <button
                  key={opt.w}
                  onClick={() => handleThemeChange({ headlineWeight: opt.w })}
                  className={`flex-1 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${
                    (effectiveTheme.headlineWeight ?? 700) === opt.w
                      ? 'bg-violet-600 text-white'
                      : 'bg-[var(--fill-hover)] text-[var(--text-tertiary)] hover:bg-[var(--fill-medium)]'
                  }`}
                  style={{ fontWeight: opt.w }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Italic Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-tertiary)]">{t('Italic')}</span>
            <button
              onClick={() => handleThemeChange({ headlineItalic: !(effectiveTheme.headlineItalic ?? false) })}
              className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${
                effectiveTheme.headlineItalic ? 'bg-violet-600' : 'bg-[var(--fill-medium)]'
              }`}
            >
              <div className={`absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white shadow transition-all ${
                effectiveTheme.headlineItalic ? 'left-[18px]' : 'left-[3px]'
              }`} />
            </button>
          </div>
        </div>
      )}

      {view === 'device' && <div className="h-px bg-[var(--fill-raised)]" />}

      {/* ═══════════════════════════════════════════
          DEVICE
          ═══════════════════════════════════════════ */}
      {view === 'device' && <SectionHeader label={t('Device')} isOpen={expandedSections.device ?? true} onToggle={() => toggleSection('device')} />}
      {view === 'device' && expandedSections.device && (
        <div className="flex flex-col gap-3 mb-2">
          {/* Frame Style */}
          <div>
            <span className="text-[11px] text-[var(--text-tertiary)] mb-1 block">{t('Frame Style')}</span>
            <div className="flex gap-1">
              {[
                { id: 'dark' as const, label: t('Dark') },
                { id: 'light' as const, label: t('Light') },
                { id: 'black' as const, label: t('Black') },
                { id: 'white' as const, label: t('White') },
              ].map((fs) => (
                <button
                  key={fs.id}
                  onClick={() => handleThemeChange({ deviceFrameStyle: fs.id })}
                  className={`flex-1 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${
                    (effectiveTheme.deviceFrameStyle ?? 'dark') === fs.id
                      ? 'bg-violet-600 text-white'
                      : 'bg-[var(--fill-hover)] text-[var(--text-tertiary)] hover:bg-[var(--fill-medium)]'
                  }`}
                >
                  {fs.label}
                </button>
              ))}
            </div>
          </div>

          {/* Screen Notch/Punch-hole toggle */}
          <div className="flex items-center justify-between py-0.5">
            <span className="text-[11px] text-[var(--text-tertiary)]">{t('Device sensors & notch')}</span>
            <button
              onClick={() => handleThemeChange({ showDeviceSensor: !(effectiveTheme.showDeviceSensor ?? true) })}
              className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${
                (effectiveTheme.showDeviceSensor ?? true) ? 'bg-violet-600' : 'bg-[var(--fill-medium)]'
              }`}
            >
              <div className={`absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white shadow transition-all ${
                (effectiveTheme.showDeviceSensor ?? true) ? 'left-[18px]' : 'left-[3px]'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between py-0.5">
            <span className="text-[11px] text-[var(--text-tertiary)]">{t('Generic uniform outline')}</span>
            <button
              onClick={() => handleThemeChange({ deviceFrameType: (effectiveTheme.deviceFrameType ?? 'realistic') === 'generic' ? 'realistic' : 'generic' })}
              className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${
                (effectiveTheme.deviceFrameType ?? 'realistic') === 'generic' ? 'bg-violet-600' : 'bg-[var(--fill-medium)]'
              }`}
            >
              <div className={`absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white shadow transition-all ${
                (effectiveTheme.deviceFrameType ?? 'realistic') === 'generic' ? 'left-[18px]' : 'left-[3px]'
              }`} />
            </button>
          </div>

          {/* Scale and Position Sliders */}
          <SliderRow
            label={t('Device Size')}
            value={effectiveTheme.deviceSizeScale ?? 0.58}
            min={0.38} max={0.85} step={0.01} suffix="%"
            onChange={(v) => handleThemeChange({ deviceSizeScale: v })}
          />

          <SliderRow
            label={t('Offset X')}
            value={effectiveTheme.deviceOffsetX ?? 0}
            min={-0.35} max={0.35} step={0.01} suffix="%"
            onChange={(v) => handleThemeChange({ deviceOffsetX: v })}
          />

          <SliderRow
            label={t('Offset Y')}
            value={effectiveTheme.deviceOffsetY ?? 0}
            min={-0.35} max={0.35} step={0.01} suffix="%"
            onChange={(v) => handleThemeChange({ deviceOffsetY: v })}
          />

          {((effectiveTheme.deviceOffsetX ?? 0) !== 0 || (effectiveTheme.deviceOffsetY ?? 0) !== 0) && (
            <button
              onClick={() => handleThemeChange({ deviceOffsetX: 0, deviceOffsetY: 0 })}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-tertiary)] cursor-pointer transition-colors self-start"
            >
              {t('Reset position')}
            </button>
          )}
        </div>
      )}

      {view === 'device' && <div className="h-px bg-[var(--fill-raised)]" />}

      {/* ═══════════════════════════════════════════
          PILLS
          ═══════════════════════════════════════════ */}
      {view === 'device' && <SectionHeader label={t('Floating Pills')} isOpen={expandedSections.pills ?? true} onToggle={() => toggleSection('pills')} />}
      {view === 'device' && expandedSections.pills && (
        <div className="flex flex-col gap-3 mb-2">
          <SliderRow
            label={t('Vertical Spread')} value={effectiveTheme.pillSpread ?? 0.6}
            min={0.1} max={1.0} step={0.05} suffix="%"
            onChange={(v) => handleThemeChange({ pillSpread: v })}
          />
          <SliderRow
            label={t('Side Inset')} value={effectiveTheme.pillEdgeInset ?? 0.04}
            min={0.0} max={0.12} step={0.005} suffix="%"
            onChange={(v) => handleThemeChange({ pillEdgeInset: v })}
          />
        </div>
      )}

      {view === 'design' && <div className="h-px bg-[var(--fill-raised)]" />}

      {/* ═══════════════════════════════════════════
          JSON THEME IMPORT / EXPORT
          ═══════════════════════════════════════════ */}
      {view === 'design' && <SectionHeader label={t('Custom Theme (JSON)')} isOpen={expandedSections.json ?? false} onToggle={() => toggleSection('json')} />}
      {view === 'design' && expandedSections.json && (
        <div className="flex flex-col gap-2.5 mb-2">
          <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
            {t('Import a theme from JSON or export the current theme. Share the template below with an AI to generate custom themes.')}
          </p>

          <div className="flex gap-1.5">
            <Button size="sm" onClick={handleImportTheme} className="flex-1 justify-center">
              <Upload className="w-3.5 h-3.5" />
              {t('Import')}
            </Button>
            <Button size="sm" onClick={handleExportTheme} className="flex-1 justify-center">
              <Download className="w-3.5 h-3.5" />
              {t('Export')}
            </Button>
          </div>

          {jsonError && (
            <p className="text-[10px] text-red-400">{jsonError}</p>
          )}

          <button
            onClick={() => setShowTemplate(!showTemplate)}
            className="text-[11px] text-violet-400 hover:text-violet-300 cursor-pointer transition-colors text-left"
          >
            {(showTemplate ? t('Hide') : t('Show'))} {t('JSON Template')}
          </button>

          {showTemplate && (
            <div className="relative">
              <pre className="bg-[var(--overlay-bg)] border border-[var(--border-light)] rounded-xl p-3 text-[9px] text-[var(--text-tertiary)] overflow-auto max-h-48 font-mono leading-relaxed whitespace-pre">
                {THEME_TEMPLATE_JSON}
              </pre>
              <button
                onClick={copyTemplate}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-[var(--fill-active)] hover:bg-[var(--fill-medium)] transition-colors cursor-pointer"
                title={t('Copy template')}
              >
                {copied
                  ? <Check className="w-3 h-3 text-green-400" />
                  : <Copy className="w-3 h-3 text-[var(--text-tertiary)]" />}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
