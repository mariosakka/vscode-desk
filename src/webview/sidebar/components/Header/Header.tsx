import React from 'react';
import styles from './Header.module.css';
import { TabIcon, GlobeIcon } from '../shared/Icons';

interface Props {
  onAddTab: () => void;
  onQuickOpen: () => void;
  canAddTab: boolean;
  canQuickOpen: boolean;
}

export function Header({ onAddTab, onQuickOpen, canAddTab, canQuickOpen }: Props) {
  return (
    <div className={styles.header}>
      <div className={styles.actions}>
        <button className={styles.actionBtn} onClick={onAddTab} title="New tab" disabled={!canAddTab}>
          <TabIcon size={13} /> Tab
        </button>
        <button className={`${styles.actionBtn} ${styles.actionBtnIcon}`} onClick={onQuickOpen} title="Open URL" disabled={!canQuickOpen}>
          <GlobeIcon size={13} />
        </button>
      </div>
    </div>
  );
}
