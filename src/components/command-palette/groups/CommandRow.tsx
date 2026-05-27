// Shared cmdk row so every group renders identically.

import { Command } from 'cmdk';

interface Props {
  value: string;
  onSelect: () => void;
  children: React.ReactNode;
}

export function CommandRow({ value, onSelect, children }: Props) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="
        flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer text-sm text-fg
        data-[selected=true]:bg-accent-soft
        data-[selected=true]:text-fg
      "
    >
      {children}
    </Command.Item>
  );
}
