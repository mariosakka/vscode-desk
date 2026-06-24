import React from 'react';
import styles from './Header.module.css';
import { TabIcon, BookmarkIcon, GlobeIcon } from '../shared/Icons';

interface Props {
  onAddTab: () => void;
  onAddBookmark: () => void;
  onQuickOpen: () => void;
  canAddTab: boolean;
  canAddBookmark: boolean;
  canQuickOpen: boolean;
}

export function Header({ onAddTab, onAddBookmark, onQuickOpen, canAddTab, canAddBookmark, canQuickOpen }: Props) {
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
        <button className={`${styles.actionBtn} ${styles.actionBtnIcon}`} onClick={onQuickOpen} title="Open URL" disabled={!canQuickOpen}>
          <GlobeIcon size={13} />
        </button>
      </div>
    </div>
  );
}
