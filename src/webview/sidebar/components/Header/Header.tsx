import React from 'react';
import styles from './Header.module.css';

interface Props {
  onAddTab: () => void;
  onAddBookmark: () => void;
}

export function Header({ onAddTab, onAddBookmark }: Props) {
  return (
    <div className={styles.header}>
      <span className={styles.title}>Fezzan</span>
      <div className={styles.actions}>
        <button className={styles.actionBtn} onClick={onAddTab} title="New tab">
          + Tab
        </button>
        <button className={styles.actionBtn} onClick={onAddBookmark} title="Add bookmark">
          + Bookmark
        </button>
      </div>
    </div>
  );
}
