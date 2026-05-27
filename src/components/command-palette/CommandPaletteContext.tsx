// =============================================================================
// CMD+K — Context + global keyboard listener
//
// Uses a CAPTURE-phase listener so the palette opens even when focus is in a
// child that calls stopPropagation (Mapbox canvas, rich text editors,
// extensions). The `/` shortcut is suppressed inside editable targets so
// typing a slash in a text field doesn't trigger the palette.
// =============================================================================

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface CommandPaletteCtx {
  open: boolean;
  setOpen: (next: boolean) => void;
  toggle: () => void;
}

const Ctx = createContext<CommandPaletteCtx | null>(null);

export function useCommandPalette() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error('useCommandPalette must be used within CommandPaletteProvider');
  }
  return ctx;
}

function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Cmd+K (mac) / Ctrl+K (win/linux). Always wins because capture phase.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        e.stopPropagation();
        toggle();
        return;
      }
      // "/" when no input is focused — Linear/GitHub-style
      if (e.key === '/' && !isEditableTarget(e.target)) {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true } as EventListenerOptions);
  }, [toggle]);

  return <Ctx.Provider value={{ open, setOpen, toggle }}>{children}</Ctx.Provider>;
}
