import React from 'react';
import { Tab } from '../../types';
import styles from './TabBar.module.css';

interface Props {
  tabs: Tab[];
  activeTabId: string;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

export function TabBar({ tabs, activeTabId, onSelect, onRemove }: Props) {
  return (
    <div id="tabs-bar" className={styles.tabsBar}>
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
            onClick={() => onSelect(tab.id)}
          >
            {tab.name}
          </button>
          <button
            className={styles.tabRemove}
            title="Remove tab"
            onClick={e => { e.stopPropagation(); onRemove(tab.id); }}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
