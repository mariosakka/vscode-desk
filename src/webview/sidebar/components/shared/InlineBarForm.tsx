import React, { useState, useRef, useEffect } from 'react';
import styles from './InlineBarForm.module.css';
import inputStyles from './Inputs.module.css';
import { DismissButton } from './DismissButton';
import { useClickOutside } from '../../hooks/useClickOutside';

interface Props {
  placeholder: string;
  maxLength?: number;
  validate?: (value: string) => string | null;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export function InlineBarForm({ placeholder, maxLength, validate, onSubmit, onCancel }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useClickOutside(formRef, onCancel);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    const err = validate?.(trimmed) ?? null;
    if (err) { setError(err); return; }
    onSubmit(trimmed);
  };

  return (
    <form ref={formRef} className={styles.form} onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        className={inputStyles.bar}
        value={value}
        onChange={e => { setValue(e.target.value); setError(''); }}
        onKeyDown={e => e.key === 'Escape' && onCancel()}
        placeholder={placeholder}
        maxLength={maxLength}
      />
      <DismissButton onClick={onCancel} />
      {error && <span className={inputStyles.error}>{error}</span>}
    </form>
  );
}
