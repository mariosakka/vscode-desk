import React, { useState, useRef, useEffect } from 'react';
import styles from './InlineBookmarkForm.module.css';
import inputStyles from '../shared/Inputs.module.css';
import btnStyles from '../shared/FormButtons.module.css';
import { useClickOutside } from '../../hooks/useClickOutside';

const BLOCKED = /^(javascript|data|vbscript|file):/i;

interface Props {
  existingTitles: string[];
  onSubmit: (title: string, url: string) => void;
  onCancel: () => void;
}

export function InlineBookmarkForm({ existingTitles, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLFormElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);
  useClickOutside(containerRef, onCancel);

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    const u = url.trim();
    if (!t || !u) return;
    if (BLOCKED.test(u)) { setError('That URL scheme is not allowed.'); return; }
    if (existingTitles.some(n => n.toLowerCase() === t.toLowerCase())) {
      setError(`A bookmark named "${t}" already exists in this tab.`);
      return;
    }
    onSubmit(t, u);
  };

  return (
    <form ref={containerRef} className={styles.form} onSubmit={handleSubmit}>
      <input ref={titleRef} className={inputStyles.field} value={title}
        onChange={e => { setTitle(e.target.value); setError(''); }}
        onKeyDown={handleKeyDown} placeholder="Title" />
      <input className={inputStyles.field} value={url}
        onChange={e => setUrl(e.target.value)}
        onKeyDown={handleKeyDown} placeholder="URL (e.g. example.com)" />
      {error && <span className={inputStyles.error}>{error}</span>}
      <div className={styles.actions}>
        <button type="submit" className={btnStyles.primary} disabled={!title.trim() || !url.trim()}>Add</button>
        <button type="button" className={btnStyles.secondary} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
