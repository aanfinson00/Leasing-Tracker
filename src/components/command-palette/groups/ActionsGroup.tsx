// Static "Actions" group — quick creators for each entity type.

import { Command } from 'cmdk';
import { CommandRow } from './CommandRow';

interface Props {
  onNewDeal: () => void;
  onNewTenant: () => void;
  onNewBuilding: () => void;
  onNewDevProject: () => void;
  onNewAcqTarget: () => void;
  onNewDispoListing: () => void;
  onNewContact: () => void;
}

export function ActionsGroup({
  onNewDeal,
  onNewTenant,
  onNewBuilding,
  onNewDevProject,
  onNewAcqTarget,
  onNewDispoListing,
  onNewContact,
}: Props) {
  return (
    <Command.Group heading="Actions">
      <CommandRow value="action new deal prospect" onSelect={onNewDeal}>
        <span>+ New Deal (Leasing Activity)</span>
      </CommandRow>
      <CommandRow value="action new tenant rent roll" onSelect={onNewTenant}>
        <span>+ New Tenant (Rent Roll)</span>
      </CommandRow>
      <CommandRow value="action new building" onSelect={onNewBuilding}>
        <span>+ New Building</span>
      </CommandRow>
      <CommandRow value="action new development project" onSelect={onNewDevProject}>
        <span>+ New Development Project</span>
      </CommandRow>
      <CommandRow value="action new acquisition target" onSelect={onNewAcqTarget}>
        <span>+ New Acquisition Target</span>
      </CommandRow>
      <CommandRow value="action new disposition listing" onSelect={onNewDispoListing}>
        <span>+ New Disposition Listing</span>
      </CommandRow>
      <CommandRow value="action new contact" onSelect={onNewContact}>
        <span>+ New Contact</span>
      </CommandRow>
    </Command.Group>
  );
}
