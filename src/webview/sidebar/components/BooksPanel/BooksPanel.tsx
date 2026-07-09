import React, { useState } from 'react';
import styles from './BooksPanel.module.css';
import sectionBtnStyles from '../shared/SectionBtn.module.css';
import { BookIcon, PlusIcon, TrashIcon } from '../shared/Icons';
import { ConfirmButtons } from '../shared/ConfirmButtons';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { HoverIconButton } from '../shared/HoverIconButton';
import { PanelRow } from '../shared/PanelRow';
import { EmptyState } from '../shared/EmptyState';
import { BookSummary } from '../../types';

interface Props {
  books: BookSummary[];
  onOpen: (slug: string) => void;
  onNew: () => void;
  onDelete: (slug: string) => void;
}

export function BooksPanel({ books, onOpen, onNew, onDelete }: Props) {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  return (
    <CollapsibleSection icon={<BookIcon size={13} />} title="Books" badge={books.length}>
      {books.length === 0 && <EmptyState message="No books yet." />}
      {books.map(book => {
        const pageCount = book.chapters.reduce((s, c) => s + c.pages.length, 0);
        const chapterCount = book.chapters.length;
        return (
          <PanelRow
            key={book.slug}
            icon={<BookIcon size={13} />}
            label={book.title}
            sublabel={`${chapterCount} chapter${chapterCount !== 1 ? 's' : ''} · ${pageCount} page${pageCount !== 1 ? 's' : ''}`}
            onClick={() => onOpen(book.slug)}
            actions={
              pendingDelete === book.slug ? (
                <ConfirmButtons
                  onConfirm={e => { e.stopPropagation(); onDelete(book.slug); setPendingDelete(null); }}
                  onCancel={e => { e.stopPropagation(); setPendingDelete(null); }}
                />
              ) : (
                <HoverIconButton title="Delete book" hoverColor="danger" onClick={() => setPendingDelete(book.slug)}>
                  <TrashIcon size={12} />
                </HoverIconButton>
              )
            }
          />
        );
      })}
      <div className={styles.addRow}>
        <button className={sectionBtnStyles.btn} type="button" onClick={onNew}>
          <PlusIcon size={11} />
          <BookIcon size={13} />
          New Book
        </button>
      </div>
    </CollapsibleSection>
  );
}
