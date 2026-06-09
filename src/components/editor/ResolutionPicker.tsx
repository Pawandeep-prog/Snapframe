import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../../store/useProjectStore';
import { RESOLUTIONS } from '../../lib/resolutions';
import type { ResolutionId } from '../../types';

export function ResolutionPicker() {
  const { t } = useTranslation();
  const { selectedResolutions, setMeta, meta } = useProjectStore();

  function toggleResolution(id: ResolutionId) {
    const current = selectedResolutions;
    const next = current.includes(id)
      ? current.filter((r) => r !== id)
      : [...current, id];
    if (next.length === 0) return; // must have at least one
    setMeta({ resolutionPresets: next });
  }

  const previewResId = selectedResolutions[0];

  return (
    <div className="flex flex-col gap-2">
      {RESOLUTIONS.map((r) => {
        const selected = selectedResolutions.includes(r.id);
        const isPreviewed = r.id === previewResId;
        return (
          <button
            key={r.id}
            onClick={() => toggleResolution(r.id)}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all cursor-pointer text-left ${
              selected
                ? 'border-violet-500/60 bg-violet-600/15 text-white'
                : 'border-[var(--border-subtle)] bg-[var(--fill-extra-light)] text-[var(--text-tertiary)] hover:bg-[var(--fill-hover)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-medium">{r.label}</p>
                {isPreviewed && selected && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/30 text-violet-300 font-medium leading-none">
                    {t('Preview')}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                {r.id === 'custom'
                  ? `${meta.customResolution?.width ?? 1080} × ${meta.customResolution?.height ?? 1920}`
                  : `${r.width} × ${r.height}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[var(--text-muted)]">{r.aspectRatio}</span>
              <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                selected ? 'bg-violet-500 border-violet-500' : 'border-[var(--border-lighter)]'
              }`}>
                {selected && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
          </button>
        );
      })}

      {/* Custom dimensions inputs */}
      {selectedResolutions.includes('custom') && (
        <div className="flex gap-2 mt-1">
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-[10px] text-[var(--text-muted)] font-medium">{t('Width')}</label>
            <input
              type="number"
              value={meta.customResolution?.width ?? 1080}
              onChange={(e) =>
                setMeta({
                  customResolution: {
                    width: parseInt(e.target.value, 10) || 1080,
                    height: meta.customResolution?.height ?? 1920,
                  },
                })
              }
              className="bg-[var(--fill-raised)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-violet-500/60 transition-colors"
              min={100}
              max={9999}
            />
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-[10px] text-[var(--text-muted)] font-medium">{t('Height')}</label>
            <input
              type="number"
              value={meta.customResolution?.height ?? 1920}
              onChange={(e) =>
                setMeta({
                  customResolution: {
                    width: meta.customResolution?.width ?? 1080,
                    height: parseInt(e.target.value, 10) || 1920,
                  },
                })
              }
              className="bg-[var(--fill-raised)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-violet-500/60 transition-colors"
              min={100}
              max={9999}
            />
          </div>
        </div>
      )}
    </div>
  );
}
