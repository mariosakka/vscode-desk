import React, { useState, useRef, useEffect } from 'react';
import styles from './InlineTabForm.module.css';
import { CloseIcon } from '../shared/Icons';
import { useClickOutside } from '../../hooks/useClickOutside';

interface Props {
  existingNames: string[];
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

export function InlineTabForm({ existingNames, onSubmit, onCancel }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLFormElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useClickOutside(containerRef, onCancel);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = value.trim();
    if (!name) return;
    if (existingNames.some(n => n.toLowerCase() === name.toLowerCase())) {
      setError(`A tab named "${name}" already exists.`);
      return;
    }
    onSubmit(name);
  };

  return (
    <form ref={containerRef} className={styles.form} onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        className={styles.input}
        value={value}
        onChange={e => { setValue(e.target.value); setError(''); }}
        onKeyDown={e => e.key === 'Escape' && onCancel()}
        placeholder="Tab name…"
        maxLength={40}
      />
      <button type="button" className={styles.cancelBtn} onClick={onCancel} title="Cancel">
        <CloseIcon size={10} />
      </button>
      {error && <span className={styles.error}>{error}</span>}
    </form>
  );
}
