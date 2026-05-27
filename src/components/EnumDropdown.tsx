import { useState, useEffect, useRef } from 'react';

interface EnumDropdownProps {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

// Datalist-backed input: types like a free-text field, autocompletes from
// the enum list. Preserves any pre-existing value not in the list (shows
// it on first paint, lets the user keep or replace it). Same surface
// area as <input {...register(...)} /> from the form's perspective.
export function EnumDropdown({
  options,
  value,
  onChange,
  placeholder,
  className,
  id,
}: EnumDropdownProps) {
  const [local, setLocal] = useState(value ?? '');
  // Stable per-instance id so multiple dropdowns on a page don't share
  // a single <datalist>.
  const generatedRef = useRef(`enum-dl-${Math.random().toString(36).slice(2)}`);
  const listId = id ?? generatedRef.current;

  useEffect(() => {
    setLocal(value ?? '');
  }, [value]);

  return (
    <>
      <input
        list={listId}
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
          onChange(e.target.value);
        }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  );
}
