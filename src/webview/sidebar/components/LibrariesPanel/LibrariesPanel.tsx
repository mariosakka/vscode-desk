import React from 'react';
import styles from './LibrariesPanel.module.css';
import sectionBtnStyles from '../shared/SectionBtn.module.css';
import { GlobeIcon, TrashIcon } from '../shared/Icons';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { EmptyState } from '../shared/EmptyState';
import { LibraryEntry } from '../../types';

interface Props {
  libraries: LibraryEntry[];
  onSync: () => void;
  onRemove: (name: string) => void;
}

export function LibrariesPanel({ libraries, onSync, onRemove }: Props) {
  return (
    <CollapsibleSection
      icon={<GlobeIcon size={13} />}
      title="Page Libraries"
      defaultOpen={false}
    >
      <div className={styles.body}>
        {libraries.length === 0 ? (
          <EmptyState>No libraries configured.</EmptyState>
        ) : (
          <div className={styles.list}>
            {libraries.map(lib => (
              <div key={lib.name} className={styles.row}>
                <div className={styles.info}>
                  <div className={styles.name}>{lib.name}</div>
                  {lib.description && <div className={styles.desc}>{lib.description}</div>}
                </div>
                <span className={`${styles.badge} ${lib.installed ? styles.badgeInstalled : styles.badgePending}`}>
                  {lib.installed ? 'installed' : 'pending'}
                </span>
                <button
                  className={styles.removeBtn}
                  title={`Remove ${lib.name}`}
                  onClick={() => onRemove(lib.name)}
                >
                  <TrashIcon size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
        <button className={sectionBtnStyles.btn} type="button" onClick={onSync}>
          <GlobeIcon size={13} /> Sync all
        </button>
      </div>
    </CollapsibleSection>
  );
}
