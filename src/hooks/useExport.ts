import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { useTranslation } from 'react-i18next';
import * as htmlToImage from 'html-to-image';
import JSZip from 'jszip';
import { useProjectStore } from '../store/useProjectStore';
import { getResolutionWithCustom } from '../lib/resolutions';
import { ScreenshotCard } from '../components/preview/ScreenshotCard';
import type { Slide, Theme, Resolution, ProjectMeta } from '../types';

function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
  return slug || 'slide';
}

/**
 * Cross-browser download helper.
 * 1. Tries the File System Access API (Chrome 86+, Edge 86+) — opens a native Save dialog.
 * 2. Falls back to a synchronous anchor-click with blob URL.
 */
async function downloadFile(blob: Blob, suggestedName: string): Promise<void> {
  // Approach 1: File System Access API (Chrome/Edge)
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const isZip = suggestedName.endsWith('.zip');
      const handle = await (window as any).showSaveFilePicker({
        suggestedName,
        types: [
          isZip
            ? { description: 'ZIP Archive', accept: { 'application/zip': ['.zip'] } }
            : { description: 'PNG Image', accept: { 'image/png': ['.png'] } },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err: any) {
      if (err?.name === 'AbortError') return; // User cancelled save dialog
      // Fall through to legacy approach
      console.warn('[Download] showSaveFilePicker failed, falling back:', err);
    }
  }

  // Approach 2: Classic blob URL + anchor click (Firefox, Safari, fallback)
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  // Delay cleanup to let browser finish download initiation
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 3000);
}

/**
 * Renders a ScreenshotCard at full resolution and captures it as a PNG Blob.
 */
async function renderAndCapture(
  slide: Slide,
  resolution: Resolution,
  theme: Theme,
  meta: ProjectMeta
): Promise<Blob | null> {
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: -10000px;
    width: ${resolution.width}px;
    height: ${resolution.height}px;
    z-index: -1000;
  `;
  document.body.appendChild(container);

  // Merge per-slide theme overrides
  const effectiveTheme: Theme = slide.themeOverrides
    ? { ...theme, ...slide.themeOverrides }
    : theme;

  const root = createRoot(container);

  try {
    flushSync(() => {
      root.render(
        createElement(ScreenshotCard, {
          slide,
          theme: effectiveTheme,
          resolution,
          scale: 1,
          showFrame: true,
          appName: meta.iconDataUrl ? meta.appName : undefined,
          iconDataUrl: meta.iconDataUrl,
        })
      );
    });

    // Wait for images
    const imgs = Array.from(container.querySelectorAll('img'));
    if (imgs.length > 0) {
      await Promise.all(
        imgs.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((r) => { img.onload = () => r(); img.onerror = () => r(); })
        )
      );
    }

    // Wait for layout + paint
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await new Promise((r) => setTimeout(r, 500));

    const el = container.firstElementChild as HTMLElement;
    if (!el) return null;

    // toCanvas → toBlob is the most reliable pipeline for Chrome
    const canvas = await htmlToImage.toCanvas(el, {
      width: resolution.width,
      height: resolution.height,
      pixelRatio: 1,
      cacheBust: true,
    });

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
    });
  } catch (err) {
    console.error('[Capture] Failed:', err);
    return null;
  } finally {
    root.unmount();
    if (container.parentNode) document.body.removeChild(container);
  }
}

export function useExport() {
  const { t } = useTranslation();
  const { slides, meta, theme, selectedResolutions } = useProjectStore();

  async function exportSlide(slideId: string): Promise<void> {
    const slide = slides.find((s) => s.id === slideId);
    if (!slide) return;

    const resId = selectedResolutions[0] || 'iphone-69';
    const resolution = getResolutionWithCustom(resId, meta.customResolution);
    if (!resolution) return;

    console.log('[Export] Capturing slide:', resolution.label);
    const blob = await renderAndCapture(slide, resolution, theme, meta);

    if (blob) {
      const filename = `${slugify(slide.header || 'slide')}.png`;
      console.log('[Export] Saving:', filename, `(${(blob.size / 1024).toFixed(0)} KB)`);
      await downloadFile(blob, filename);
    } else {
      alert(t('Export failed — capture returned empty. Check console for details.'));
    }
  }

  async function exportAll(): Promise<void> {
    if (slides.length === 0) return;

    const zip = new JSZip();
    const appSlug = slugify(meta.appName || 'snapframe');
    let count = 0;

    for (const resId of selectedResolutions) {
      const resolution = getResolutionWithCustom(resId, meta.customResolution);
      if (!resolution) continue;

      const folder = zip.folder(resolution.label.replace(/[^a-z0-9]/gi, '_'));
      if (!folder) continue;

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const blob = await renderAndCapture(slide, resolution, theme, meta);
        if (blob) {
          folder.file(
            `${String(i + 1).padStart(2, '0')}-${slugify(slide.header || 'slide')}.png`,
            blob
          );
          count++;
        }
      }
    }

    if (count > 0) {
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      await downloadFile(zipBlob, `${appSlug}-screenshots.zip`);
    } else {
      alert(t('No slides were captured.'));
    }
  }

  return { exportSlide, exportAll };
}
