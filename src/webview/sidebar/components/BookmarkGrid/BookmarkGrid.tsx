import React from 'react';
import { Bookmark } from '../../types';
import { BookmarkCard } from '../BookmarkCard/BookmarkCard';
import styles from './BookmarkGrid.module.css';

interface Props {
  bookmarks: Bookmark[];
  tabId: string;
  onOpen: (url: string) => void;
  onRemove: (tabId: string, bookmarkId: string) => void;
}

export function BookmarkGrid({ bookmarks, tabId, onOpen, onRemove }: Props) {
  return (
    <div id="bookmarks-grid" className={styles.grid}>
      {bookmarks.length === 0 ? (
        <p className={styles.empty}>
          No bookmarks yet. Click <strong>+ Bookmark</strong> above to add one.
        </p>
      ) : (
        bookmarks.map(bm => (
          <BookmarkCard
            key={bm.id}
            bookmark={bm}
            tabId={tabId}
            onOpen={onOpen}
            onRemove={onRemove}
          />
        ))
      )}
    </div>
  );
}
