import React, { useState, useEffect, useRef } from 'react';
import { Project } from '../../types';
import styles from './TabBar.module.css';
import { TrashIcon } from '../shared/Icons';
import { ConfirmButtons } from '../shared/ConfirmButtons';
import { HoverIconButton } from '../shared/HoverIconButton';

interface Props {
  tabs: Project[];
  activeTabId: string;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

export function TabBar({ tabs, activeTabId, onSelect, onRemove }: Props) {
  const [pendingId, setPendingId] = useState<string | null>(null);
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
              onClick={() => { setPendingId(null); onSelect(project.id); }}
            >
              {project.name}
            </button>
            <HoverIconButton title="Remove project" hoverColor="danger" size="sm"
              onClick={() => setPendingId(project.id)}>
              <TrashIcon size={14} />
            </HoverIconButton>
          </span>
        ))}
      </div>
      {pendingProject && (
        <div className={styles.confirmBar}>
          <span className={styles.confirmLabel}>Delete "{pendingProject.name}"?</span>
          <ConfirmButtons
            onConfirm={() => { setPendingId(null); onRemove(pendingProject.id); }}
            onCancel={() => setPendingId(null)}
          />
        </div>
      )}
    </div>
  );
}
