import React from 'react';
import styles from './Header.module.css';
import { ProjectIcon, GlobeIcon } from '../shared/Icons';

interface Props {
  onAddProject: () => void;
  onQuickOpen: () => void;
  canAddProject: boolean;
  canQuickOpen: boolean;
}

export function Header({ onAddProject, onQuickOpen, canAddProject, canQuickOpen }: Props) {
  return (
    <div className={styles.header}>
      <div className={styles.actions}>
        <button className={styles.actionBtn} onClick={onAddProject} title="New project" disabled={!canAddProject}>
          <ProjectIcon size={13} /> Project
        </button>
        <button className={`${styles.actionBtn} ${styles.actionBtnIcon}`} onClick={onQuickOpen} title="Open URL" disabled={!canQuickOpen}>
          <GlobeIcon size={13} />
        </button>
      </div>
    </div>
  );
}
