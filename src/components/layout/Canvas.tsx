import { useRef, useLayoutEffect, useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { ScreenshotCard } from '../preview/ScreenshotCard';
import { getResolutionWithCustom } from '../../lib/resolutions';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Resolution } from '../../types';

/** Center preview canvas — shows active slide at scaled preview.
 *  When multiple resolutions are selected, shows all side-by-side. */
export function Canvas() {
  const { slides, activeSlideId, theme, meta, selectedResolutions, setActiveSlide } =
    useProjectStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  const activeSlide = slides.find((s) => s.id === activeSlideId) ?? slides[0];

  // Resolve all valid resolutions
  const resolutions = selectedResolutions
    .map((id) => getResolutionWithCustom(id, meta.customResolution))
    .filter((r): r is Resolution => r != null);

  // Measure container
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ w: width, h: height });
      }
    });
    observer.observe(el);
    const rect = el.getBoundingClientRect();
    setContainerSize({ w: rect.width, h: rect.height });
    return () => observer.disconnect();
  }, []);

  if (!resolutions.length || !activeSlide) return null;

  const cW = containerSize.w || window.innerWidth * 0.55;
  const cH = containerSize.h || window.innerHeight * 0.85;

  const N = resolutions.length;
  const GAP = 28; // px between cards

  // Find a uniform scale that fits all cards side-by-side
  const totalNativeW = resolutions.reduce((sum, r) => sum + r.width, 0);
  const maxNativeH   = Math.max(...resolutions.map((r) => r.height));
  const scaleByW = (cW * 0.88 - GAP * (N - 1)) / totalNativeW;
  const scaleByH = (cH * 0.88) / maxNativeH;
  const scale    = Math.min(scaleByW, scaleByH, 0.32);

  const activeIndex = slides.findIndex((s) => s.id === activeSlide.id);

  function goNext() {
    const next = slides[activeIndex + 1];
    if (next) setActiveSlide(next.id);
  }
  function goPrev() {
    const prev = slides[activeIndex - 1];
    if (prev) setActiveSlide(prev.id);
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col items-center justify-center overflow-hidden relative"
      style={{ background: 'radial-gradient(ellipse at center, var(--canvas-start) 0%, var(--canvas-end) 70%)' }}
    >
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(var(--grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--grid-color) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Slide counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
        <button
          onClick={goPrev}
          disabled={activeIndex === 0}
          className="w-7 h-7 rounded-full bg-[var(--fill-hover)] flex items-center justify-center disabled:opacity-20 hover:bg-[var(--fill-medium)] transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4 text-[var(--text-primary)]" />
        </button>
        <span className="text-xs text-[var(--text-muted)] font-medium">
          {activeIndex + 1} / {slides.length}
        </span>
        <button
          onClick={goNext}
          disabled={activeIndex === slides.length - 1}
          className="w-7 h-7 rounded-full bg-[var(--fill-hover)] flex items-center justify-center disabled:opacity-20 hover:bg-[var(--fill-medium)] transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4 text-[var(--text-primary)]" />
        </button>
      </div>

      {/* Cards row — side by side for multiple resolutions */}
      <div
        className="relative z-10 flex items-end"
        style={{ gap: GAP, filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.55))' }}
      >
        {resolutions.map((res) => (
          <div key={res.id} className="flex flex-col items-center" style={{ gap: 8 }}>
            <ScreenshotCard
              slide={activeSlide}
              theme={theme}
              resolution={res}
              scale={scale}
              showFrame={true}
              appName={meta.iconDataUrl ? meta.appName : undefined}
              iconDataUrl={meta.iconDataUrl}
            />
            {/* Resolution label shown only when multiple resolutions */}
            {N > 1 && (
              <span
                className="text-[10px] font-medium font-mono"
                style={{ color: 'var(--text-muted)' }}
              >
                {res.label}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Single-resolution size label at bottom */}
      {N === 1 && (
        <div className="absolute bottom-4 text-xs text-[var(--text-faint)] font-mono">
          {resolutions[0].width} × {resolutions[0].height}px
        </div>
      )}
    </div>
  );
}
