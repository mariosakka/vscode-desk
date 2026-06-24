import React, { useState, useRef, useEffect } from 'react';
import styles from './InlineBookmarkForm.module.css';
import { useClickOutside } from '../../hooks/useClickOutside';

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

  const BLOCKED = /^(javascript|data|vbscript|file):/i;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    const u = url.trim();
    if (!t || !u) return;
    if (BLOCKED.test(u)) {
      setError('That URL scheme is not allowed.');
      return;
    }
    if (existingTitles.some(n => n.toLowerCase() === t.toLowerCase())) {
      setError(`A bookmark named "${t}" already exists in this tab.`);
      return;
    }
    onSubmit(t, u);
  };

  return (
    <form ref={containerRef} className={styles.form} onSubmit={handleSubmit}>
      <input
        ref={titleRef}
        className={styles.input}
        value={title}
        onChange={e => { setTitle(e.target.value); setError(''); }}
        onKeyDown={handleKeyDown}
        placeholder="Title"
      />
      <input
        className={styles.input}
        value={url}
        onChange={e => setUrl(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="URL (e.g. example.com)"
      />
      {error && <span className={styles.error}>{error}</span>}
      <div className={styles.actions}>
        <button type="submit" className={styles.btn} disabled={!title.trim() || !url.trim()}>
          Add
        </button>
        <button type="button" className={styles.btnCancel} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
