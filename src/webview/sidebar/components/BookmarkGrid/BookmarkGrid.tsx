import React from 'react';
import { Bookmark } from '../../types';
import { BookmarkCard } from '../BookmarkCard/BookmarkCard';
import { EmptyState } from '../shared/EmptyState';
import styles from './BookmarkGrid.module.css';

interface Props {
  bookmarks: Bookmark[];
  tabId: string;
  onOpen: (url: string) => void;
  onRemove: (tabId: string, bookmarkId: string) => void;
  onEdit: (tabId: string, bookmarkId: string, title: string, url: string) => void;
}

export function BookmarkGrid({ bookmarks, tabId, onOpen, onRemove, onEdit }: Props) {
  return (
    <div id="bookmarks-grid" className={styles.grid}>
      {bookmarks.length === 0 ? (
        <EmptyState message="No bookmarks yet. Click + Bookmark below to add one." />
      ) : (
        bookmarks.map(bm => (
          <BookmarkCard
            key={bm.id}
            bookmark={bm}
            tabId={tabId}
            onOpen={onOpen}
            onRemove={onRemove}
            onEdit={onEdit}
          />
        ))
      )}
    </div>
  );
}
