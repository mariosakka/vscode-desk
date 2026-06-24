import React, { useState } from 'react';
import { Tab } from '../../types';
import styles from './TabBar.module.css';
import { TrashIcon } from '../shared/Icons';
import { ConfirmButtons } from '../shared/ConfirmButtons';

interface Props {
  tabs: Tab[];
  activeTabId: string;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

export function TabBar({ tabs, activeTabId, onSelect, onRemove }: Props) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const pendingTab = pendingId ? tabs.find(t => t.id === pendingId) : null;

  return (
    <div className={styles.container}>
      <div className={styles.tabsBar}>
        {tabs.map(tab => (
          <span
            key={tab.id}
            className={styles.tabWrap}
            data-active={tab.id === activeTabId ? 'true' : 'false'}
          >
            <button
              className={styles.tabBtn}
              data-testid="tab-button"
              data-active={tab.id === activeTabId ? 'true' : 'false'}
              onClick={() => { setPendingId(null); onSelect(tab.id); }}
            >
              {tab.name}
            </button>
            <button
              className={styles.tabRemove}
              title="Remove tab"
              onClick={e => { e.stopPropagation(); setPendingId(tab.id); }}
            >
              <TrashIcon size={14} />
            </button>
          </span>
        ))}
      </div>
      {pendingTab && (
        <div className={styles.confirmBar}>
          <span className={styles.confirmLabel}>Delete "{pendingTab.name}"?</span>
          <ConfirmButtons
            onConfirm={() => { setPendingId(null); onRemove(pendingTab.id); }}
            onCancel={() => setPendingId(null)}
          />
        </div>
      )}
    </div>
  );
}
