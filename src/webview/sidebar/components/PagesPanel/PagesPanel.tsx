import React, { useState, useRef, useEffect } from 'react';
import styles from './PagesPanel.module.css';
import { PageIcon, ChevronIcon, PlusIcon, TrashIcon, CloseIcon } from '../shared/Icons';
import { ConfirmButtons } from '../shared/ConfirmButtons';

interface Props {
  pages: Array<{ filename: string; title: string }>;
  onOpen: (filename: string) => void;
  onNew: (title: string) => void;
  onDelete: (filename: string) => void;
}

export function PagesPanel({ pages, onOpen, onNew, onDelete }: Props) {
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [pendingFilename, setPendingFilename] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newError, setNewError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const handleNewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    const filename = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.astrolabe';
    if (pages.some(p => p.filename === filename || p.title.toLowerCase() === title.toLowerCase())) {
      setNewError(`A page named "${title}" already exists.`);
      return;
    }
    onNew(title);
    setNewTitle('');
    setNewError('');
    setAdding(false);
  };

  return (
    <div className={styles.section}>
      <button
        className={styles.header}
        onClick={() => setOpen(o => !o)}
        type="button"
      >
        <ChevronIcon size={10} down={open} />
        <PageIcon size={13} />
        Pages ({pages.length})
      </button>
      {open && (
        <>
          {pages.map(page => (
            <div key={page.filename} className={styles.row}>
              <PageIcon size={13} />
              <span
                className={styles.rowTitle}
                onClick={() => onOpen(page.filename)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && onOpen(page.filename)}
              >
                {page.title}
              </span>
              {pendingFilename === page.filename ? (
                <ConfirmButtons
                  onConfirm={e => { e.stopPropagation(); onDelete(page.filename); setPendingFilename(null); }}
                  onCancel={e => { e.stopPropagation(); setPendingFilename(null); }}
                />
              ) : (
                <button
                  className={styles.removeBtn}
                  type="button"
                  title="Delete page"
                  onClick={e => { e.stopPropagation(); setPendingFilename(page.filename); }}
                >
                  <TrashIcon size={12} />
                </button>
              )}
            </div>
          ))}
          <div className={styles.addRow}>
            {adding ? (
              <>
                <form className={styles.inlineForm} onSubmit={handleNewSubmit}>
                  <input
                    ref={inputRef}
                    className={styles.inlineInput}
                    value={newTitle}
                    onChange={e => { setNewTitle(e.target.value); setNewError(''); }}
                    onKeyDown={e => e.key === 'Escape' && (setAdding(false), setNewTitle(''), setNewError(''))}
                    placeholder="Page title…"
                    maxLength={80}
                  />
                  <button
                    type="button"
                    className={styles.cancelInline}
                    onClick={() => { setAdding(false); setNewTitle(''); setNewError(''); }}
                    title="Cancel"
                  >
                    <CloseIcon size={10} />
                  </button>
                </form>
                {newError && <span className={styles.error}>{newError}</span>}
              </>
            ) : (
              <button
                className={styles.addBtn}
                type="button"
                onClick={() => setAdding(true)}
              >
                <PlusIcon size={11} />
                New Page
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
