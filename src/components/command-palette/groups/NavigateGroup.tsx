// Static "Navigate" group — every tab in the sidebar, plus SiteSetter ↗.

import { Command } from 'cmdk';
import { CommandRow } from './CommandRow';
import type { View } from '../../Sidebar';

interface Props {
  onSelectView: (v: View) => void;
}

const VIEWS: Array<{ id: View; label: string }> = [
  { id: 'prospects',    label: 'Leasing Activity' },
  { id: 'rentroll',     label: 'Portfolio (Rent Roll)' },
  { id: 'underwrite',   label: 'Lease Calculator' },
  { id: 'comps',        label: 'Comps Library' },
  { id: 'contacts',     label: 'Contacts' },
  { id: 'map',          label: 'Map' },
  { id: 'onboarding',   label: 'Onboarding' },
  { id: 'reports',      label: 'Reports' },
  { id: 'acquisitions', label: 'Acquisitions Pipeline' },
  { id: 'development',  label: 'Development Pipeline' },
  { id: 'asset-mgmt',   label: 'Asset Mgmt Pending' },
  { id: 'disposition',  label: 'Disposition Tracking' },
];

export function NavigateGroup({ onSelectView }: Props) {
  return (
    <Command.Group heading="Navigate">
      {VIEWS.map((v) => (
        <CommandRow
          key={v.id}
          value={`navigate ${v.id} ${v.label}`}
          onSelect={() => onSelectView(v.id)}
        >
          <span>{v.label}</span>
        </CommandRow>
      ))}
      <CommandRow
        value="external sitesetter"
        onSelect={() => window.open('https://sitesetter.io', '_blank', 'noopener,noreferrer')}
      >
        <span>SiteSetter ↗</span>
      </CommandRow>
    </Command.Group>
  );
}
