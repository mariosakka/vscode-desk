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

  return (
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
          {pendingId === tab.id ? (
            <ConfirmButtons
              onConfirm={() => { setPendingId(null); onRemove(tab.id); }}
              onCancel={() => setPendingId(null)}
            />
          ) : (
            <button
              className={styles.tabRemove}
              title="Remove tab"
              onClick={e => { e.stopPropagation(); setPendingId(tab.id); }}
            >
              <TrashIcon size={14} />
            </button>
          )}
        </span>
      ))}
    </div>
  );
}
