// =============================================================================
// CMD+K — Command palette modal
//
// Centered modal on desktop, full-screen sheet on <md viewports.
// Empty query: Navigate + Actions static groups.
// Non-empty query: live search across deals, tenants, dev projects, acq
//                  targets, dispo listings, contacts.
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { Command } from 'cmdk';
import { useCommandPalette } from './CommandPaletteContext';
import { NavigateGroup } from './groups/NavigateGroup';
import { ActionsGroup } from './groups/ActionsGroup';
import { SearchResultsGroup } from './groups/SearchResultsGroup';
import type {
  Deal,
  RentRollRow,
  DevelopmentProject,
  AcquisitionTarget,
  DispositionListing,
  Contact,
} from '../../types';
import type { View } from '../Sidebar';

export interface CommandPaletteProps {
  // Entity arrays from App state — palette searches over these.
  deals: Deal[];
  rentRoll: RentRollRow[];
  devProjects: DevelopmentProject[];
  acqTargets: AcquisitionTarget[];
  dispoListings: DispositionListing[];
  contacts: Contact[];

  // Navigation + "open" handlers
  onSelectView: (v: View) => void;
  onOpenDeal: (d: Deal) => void;
  onOpenTenant: (t: RentRollRow) => void;
  onOpenDevProject: (p: DevelopmentProject) => void;
  onOpenAcqTarget: (a: AcquisitionTarget) => void;
  onOpenDispoListing: (d: DispositionListing) => void;
  onOpenContact: (c: Contact) => void;

  // "New X" creators
  onNewDeal: () => void;
  onNewTenant: () => void;
  onNewBuilding: () => void;
  onNewDevProject: () => void;
  onNewAcqTarget: () => void;
  onNewDispoListing: () => void;
  onNewContact: () => void;
}

export function CommandPalette(props: CommandPaletteProps) {
  const { open, setOpen } = useCommandPalette();
  const [query, setQuery] = useState('');

  // Reset query on close
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const close = useCallback(() => setOpen(false), [setOpen]);

  // Wrap every handler so selecting a row closes the palette automatically.
  const wrap = useCallback(<T,>(fn: (arg: T) => void) => {
    return (arg: T) => {
      close();
      fn(arg);
    };
  }, [close]);

  const wrapNoArg = useCallback((fn: () => void) => {
    return () => {
      close();
      fn();
    };
  }, [close]);

  if (!open) return null;

  const showSearch = query.trim().length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-[100] flex items-start md:items-center justify-center"
      onClick={close}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(20,20,24,0.55)', backdropFilter: 'blur(2px)' }}
      />

      {/* Sheet / modal */}
      <div
        className="
          relative z-10
          w-full h-[100dvh] md:h-auto md:max-h-[70vh]
          md:max-w-[640px] md:mt-[10vh] md:rounded-2xl
          shadow-lift overflow-hidden flex flex-col
          bg-bg-elevated border border-border
        "
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Command Menu" shouldFilter={false} className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <span aria-hidden className="text-base text-fg-muted">⌕</span>
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Search deals, tenants, projects, contacts…"
              className="flex-1 bg-transparent outline-none text-sm font-light text-fg placeholder:text-fg-muted"
            />
            <button
              type="button"
              onClick={close}
              className="text-[11px] font-medium px-2 py-1 rounded-md bg-bg text-fg-muted"
            >
              esc
            </button>
          </div>

          <Command.List className="flex-1 overflow-y-auto px-2 py-2">
            {showSearch ? (
              <SearchResultsGroup
                query={query}
                deals={props.deals}
                rentRoll={props.rentRoll}
                devProjects={props.devProjects}
                acqTargets={props.acqTargets}
                dispoListings={props.dispoListings}
                contacts={props.contacts}
                onOpenDeal={wrap(props.onOpenDeal)}
                onOpenTenant={wrap(props.onOpenTenant)}
                onOpenDevProject={wrap(props.onOpenDevProject)}
                onOpenAcqTarget={wrap(props.onOpenAcqTarget)}
                onOpenDispoListing={wrap(props.onOpenDispoListing)}
                onOpenContact={wrap(props.onOpenContact)}
              />
            ) : (
              <>
                <NavigateGroup onSelectView={wrap(props.onSelectView)} />
                <ActionsGroup
                  onNewDeal={wrapNoArg(props.onNewDeal)}
                  onNewTenant={wrapNoArg(props.onNewTenant)}
                  onNewBuilding={wrapNoArg(props.onNewBuilding)}
                  onNewDevProject={wrapNoArg(props.onNewDevProject)}
                  onNewAcqTarget={wrapNoArg(props.onNewAcqTarget)}
                  onNewDispoListing={wrapNoArg(props.onNewDispoListing)}
                  onNewContact={wrapNoArg(props.onNewContact)}
                />
              </>
            )}
          </Command.List>

          <div className="px-4 py-2 border-t border-border text-[10px] flex items-center gap-3 text-fg-muted">
            <span><kbd className="px-1 rounded bg-bg">↑↓</kbd> navigate</span>
            <span><kbd className="px-1 rounded bg-bg">⏎</kbd> select</span>
            <span><kbd className="px-1 rounded bg-bg">esc</kbd> close</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
