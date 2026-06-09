import { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Toolbar } from './components/layout/Toolbar';
import { Canvas } from './components/layout/Canvas';
import { SlideStrip } from './components/layout/SlideStrip';
import { JsonEditorPanel } from './components/editor/JsonEditorPanel';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const [jsonEditorOpen, setJsonEditorOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Toolbar onOpenJsonEditor={() => setJsonEditorOpen(true)} onToggleTheme={toggleTheme} theme={theme} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <Canvas />
        <SlideStrip />
      </div>
      {jsonEditorOpen && <JsonEditorPanel onClose={() => setJsonEditorOpen(false)} />}
    </div>
  );
}
