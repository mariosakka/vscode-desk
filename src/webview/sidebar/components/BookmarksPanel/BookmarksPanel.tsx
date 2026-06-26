import React, { useState } from 'react';
import styles from './BookmarksPanel.module.css';
import sectionBtnStyles from '../shared/SectionBtn.module.css';
import { BookmarkIcon, GlobeIcon, PlusIcon } from '../shared/Icons';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { EmptyState } from '../shared/EmptyState';
import { BookmarkCard } from '../BookmarkCard/BookmarkCard';
import { InlineBookmarkForm } from '../InlineBookmarkForm/InlineBookmarkForm';
import { QuickOpenForm } from '../QuickOpenForm/QuickOpenForm';
import { Bookmark } from '../../types';

interface Props {
  bookmarks: Bookmark[];
  onOpen: (url: string) => void;
  onRemove: (bookmarkId: string) => void;
  onEdit: (bookmarkId: string, title: string, url: string) => void;
  onAdd: (title: string, url: string) => void;
  onOpenUrl: (url: string) => void;
}

type Mode = 'idle' | 'adding' | 'openUrl';

export function BookmarksPanel({ bookmarks, onOpen, onRemove, onEdit, onAdd, onOpenUrl }: Props) {
  const [mode, setMode] = useState<Mode>('idle');

  return (
    <CollapsibleSection icon={<BookmarkIcon size={13} />} title="Bookmarks" badge={bookmarks.length}>
      {mode === 'openUrl' && (
        <QuickOpenForm
          onSubmit={url => { onOpenUrl(url); setMode('idle'); }}
          onCancel={() => setMode('idle')}
        />
      )}
      {bookmarks.map(bm => (
        <BookmarkCard
          key={bm.id}
          bookmark={bm}
          onOpen={onOpen}
          onRemove={onRemove}
          onEdit={onEdit}
        />
      ))}
      {bookmarks.length === 0 && mode === 'idle' && (
        <EmptyState message="No bookmarks yet." />
      )}
      <div className={styles.addRow}>
        {mode === 'adding' ? (
          <InlineBookmarkForm
            existingTitles={bookmarks.map(b => b.title)}
            onSubmit={(title, url) => { onAdd(title, url); setMode('idle'); }}
            onCancel={() => setMode('idle')}
          />
        ) : (
          <div className={styles.buttons}>
            <button
              className={sectionBtnStyles.btn}
              type="button"
              onClick={() => setMode('adding')}
              disabled={mode !== 'idle'}
            >
              <PlusIcon size={11} />
              <BookmarkIcon size={11} /> Bookmark
            </button>
            <button
              className={sectionBtnStyles.btn}
              type="button"
              onClick={() => setMode('openUrl')}
              disabled={mode !== 'idle'}
              title="Open URL"
            >
              <GlobeIcon size={11} />
            </button>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}
