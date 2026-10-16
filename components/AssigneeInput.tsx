import React from 'react';
import { ChevronDown } from 'lucide-react';

interface AssigneeInputProps {
  value: string;
  names: string[];
  onChange: (value: string) => void;
}

export const AssigneeInput: React.FC<AssigneeInputProps> = ({ value, names, onChange }) => (
  <div className="flex items-center min-w-0 w-full" style={{ borderBottom: '1px solid var(--color-border-primary)', color: 'var(--color-text-secondary)' }}>
    <input
      className="bg-transparent outline-none min-w-0 w-full focus-visible:ring-2 focus-visible:ring-indigo-500"
      aria-label="Assignee"
      value={value}
      onChange={event => onChange(event.target.value)}
      placeholder="Assignee"
    />
    {names.length > 0 && (
      <div className="relative shrink-0">
        <select
          aria-label="Choose existing assignee"
          title="Choose existing assignee"
          className="w-7 cursor-pointer appearance-none bg-transparent text-transparent rounded focus-visible:ring-2 focus-visible:ring-indigo-500"
          value=""
          onChange={event => onChange(event.target.value)}
        >
          <option value="" disabled>Choose existing assignee</option>
          {names.map(name => (
            <option key={name} value={name} style={{ color: 'var(--color-text-primary)', backgroundColor: 'var(--color-surface-primary)' }}>{name}</option>
          ))}
        </select>
        <ChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute inset-0 m-auto" />
      </div>
    )}
  </div>
);
