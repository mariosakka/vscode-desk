import React, { useState, useRef, useEffect } from 'react';
import styles from './QuickOpenForm.module.css';
import { CloseIcon } from '../shared/Icons';
import { useClickOutside } from '../../hooks/useClickOutside';

const BLOCKED = ['javascript:', 'data:', 'vbscript:', 'file:'];

interface Props {
  onSubmit: (url: string) => void;
  onCancel: () => void;
}

export function QuickOpenForm({ onSubmit, onCancel }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLFormElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useClickOutside(containerRef, onCancel);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = value.trim();
    if (!url) return;
    const lower = url.toLowerCase();
    if (BLOCKED.some(p => lower.startsWith(p))) {
      setError('This URL protocol is not allowed.');
      return;
    }
    onSubmit(url);
  };

  return (
    <form ref={containerRef} className={styles.form} onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        className={styles.input}
        type="text"
        value={value}
        onChange={e => { setValue(e.target.value); setError(''); }}
        onKeyDown={e => e.key === 'Escape' && onCancel()}
        placeholder="Open URL…"
      />
      <button type="button" className={styles.cancelBtn} onClick={onCancel} title="Cancel">
        <CloseIcon size={10} />
      </button>
      {error && <span className={styles.error}>{error}</span>}
    </form>
  );
}
