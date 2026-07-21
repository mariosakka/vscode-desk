import React, { useEffect, useRef } from 'react';

import styles from './TabBar.module.css';
import { TrashIcon } from '../shared/Icons';
import { ConfirmButtons } from '../shared/ConfirmButtons';
import { HoverIconButton } from '../shared/HoverIconButton';
import { useConfirmDelete } from '../../hooks/useConfirmDelete';

interface Props {
  tabs: { id: string; name: string }[];
  activeTabId: string;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

export function TabBar({ tabs, activeTabId, onSelect, onRemove }: Props) {
  const { pendingId, setPending, clearPending } = useConfirmDelete();
  const pendingProject = pendingId ? tabs.find(p => p.id === pendingId) : null;
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const active = bar.querySelector<HTMLElement>('[data-active="true"]');
    if (!active) return;
    bar.scrollLeft = active.offsetLeft - bar.clientWidth / 2 + active.offsetWidth / 2;
  }, [activeTabId]);

  return (
    <div className={styles.container}>
      <div className={styles.tabsBar} ref={barRef}>
        {tabs.map(project => (
          <span
            key={project.id}
            className={styles.tabWrap}
            data-active={project.id === activeTabId ? 'true' : 'false'}
          >
            <button
              className={styles.tabBtn}
              data-testid="tab-button"
              data-active={project.id === activeTabId ? 'true' : 'false'}
              onClick={() => { clearPending(); onSelect(project.id); }}
            >
              {project.name}
            </button>
            <HoverIconButton title="Remove project" hoverColor="danger" size="sm"
              onClick={() => setPending(project.id)}>
              <TrashIcon size={14} />
            </HoverIconButton>
          </span>
        ))}
      </div>
      {pendingProject && (
        <div className={styles.confirmBar}>
          <span className={styles.confirmLabel}>Delete "{pendingProject.name}"?</span>
          <ConfirmButtons
            onConfirm={() => { clearPending(); onRemove(pendingProject.id); }}
            onCancel={() => clearPending()}
          />
        </div>
      )}
    </div>
  );
}
