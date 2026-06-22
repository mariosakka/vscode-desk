import React from 'react';
import { Bookmark } from '../../types';
import styles from './BookmarkCard.module.css';

interface Props {
  bookmark: Bookmark;
  tabId: string;
  onOpen: (url: string) => void;
  onRemove: (tabId: string, bookmarkId: string) => void;
}

export function BookmarkCard({ bookmark, tabId, onOpen, onRemove }: Props) {
  return (
    <div
      className={styles.card}
      data-testid="bookmark-card"
      onClick={() => onOpen(bookmark.url)}
    >
      <div className={styles.icon} data-testid="bookmark-icon">
        {bookmark.icon.startsWith('data:')
          ? <img src={bookmark.icon} alt="" />
          : bookmark.icon || '🌐'}
      </div>
      <div className={styles.body}>
        <div className={styles.title} data-testid="bookmark-title">
          {bookmark.title}
        </div>
        <div className={styles.desc}>{bookmark.description}</div>
      </div>
      <span className={styles.arrow}>↗</span>
      <button
        className={styles.removeBtn}
        data-testid="bookmark-remove"
        title="Remove"
        onClick={e => {
          e.stopPropagation();
          onRemove(tabId, bookmark.id);
        }}
      >
        ×
      </button>
    </div>
  );
}
