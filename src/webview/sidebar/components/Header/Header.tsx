import React from 'react';
import styles from './Header.module.css';
import { TabIcon, BookmarkIcon } from '../shared/Icons';

interface Props {
  onAddTab: () => void;
  onAddBookmark: () => void;
  canAddTab: boolean;
  canAddBookmark: boolean;
}

export function Header({ onAddTab, onAddBookmark, canAddTab, canAddBookmark }: Props) {
  return (
    <div className={styles.header}>
      <div className={styles.actions}>
        <button className={styles.actionBtn} onClick={onAddTab} title="New tab" disabled={!canAddTab}>
          <TabIcon size={13} /> Tab
        </button>
        {canAddBookmark && (
          <button className={styles.actionBtn} onClick={onAddBookmark} title="Add bookmark">
            <BookmarkIcon size={11} /> Bookmark
          </button>
        )}
      </div>
    </div>
  );
}
