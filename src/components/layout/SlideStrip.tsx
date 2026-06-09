import { useProjectStore } from '../../store/useProjectStore';
import { ScreenshotCard } from '../preview/ScreenshotCard';
import { getResolution } from '../../lib/resolutions';

/** Right panel: vertical filmstrip of all slides */
export function SlideStrip() {
  const { slides, activeSlideId, theme, selectedResolutions, setActiveSlide } = useProjectStore();
  const resolution = getResolution(selectedResolutions[0] ?? 'iphone-69');

  if (!resolution) return null;

  // Thumbnail scale — small strip cards
  const STRIP_WIDTH = 80;
  const scale = STRIP_WIDTH / resolution.width;

  return (
    <aside className="w-24 flex-shrink-0 bg-[var(--app-bg)] border-l border-[var(--border-subtle)] flex flex-col items-center py-4 gap-3 overflow-y-auto">
      {slides.map((slide, idx) => {
        const isActive = (activeSlideId === slide.id) || (!activeSlideId && idx === 0);
        return (
          <button
            key={slide.id}
            onClick={() => setActiveSlide(slide.id)}
            className={`relative cursor-pointer transition-all ${
              isActive ? 'ring-2 ring-violet-500 rounded-xl' : 'opacity-50 hover:opacity-75'
            }`}
            style={{ borderRadius: 12 }}
          >
            <ScreenshotCard
              slide={slide}
              theme={theme}
              resolution={resolution}
              scale={scale}
              showFrame={true}
            />
            {/* Slide number badge */}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[var(--app-bg)] border border-[var(--border-lighter)] flex items-center justify-center">
              <span className="text-[8px] text-[var(--text-tertiary)]">{idx + 1}</span>
            </div>
          </button>
        );
      })}
    </aside>
  );
}
