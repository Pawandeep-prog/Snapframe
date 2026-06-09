import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../store/useProjectStore';
import type { ProjectFile } from '../types';

export function useProjectIO() {
  const { t } = useTranslation();
  const { importProject, exportProject, meta } = useProjectStore();

  function saveProject(): void {
    const data = exportProject();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(meta.appName || 'snapframe').toLowerCase().replace(/\s+/g, '-')}-project.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function loadProject(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const json = JSON.parse(ev.target?.result as string) as ProjectFile;
          importProject(json);
        } catch {
          alert(t('Invalid project file.'));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  return { saveProject, loadProject };
}
