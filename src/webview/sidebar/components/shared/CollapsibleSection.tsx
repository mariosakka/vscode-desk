import React, { useState } from 'react';
import styles from './CollapsibleSection.module.css';
import { ChevronIcon } from './Icons';

interface Props {
  icon?: React.ReactNode;
  title: string;
  badge?: number;
  defaultOpen?: boolean;
  action?: React.ReactNode;
  headerActions?: React.ReactNode;
  onToggle?: (open: boolean) => void;
  children: React.ReactNode;
}

export function CollapsibleSection({ icon, title, badge, defaultOpen = true, action, headerActions, onToggle, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    onToggle?.(next);
  };

  return (
    <div className={styles.section}>
      <div className={styles.headerRow}>
        <button className={styles.header} onClick={toggle} type="button">
          <ChevronIcon size={10} down={open} />
          {icon}
          {title}{badge !== undefined ? ` (${badge})` : ''}
        </button>
        {headerActions && <div className={styles.headerActions} onClick={e => e.stopPropagation()}>{headerActions}</div>}
        {action && <div className={styles.headerAction}>{action}</div>}
      </div>
      <div className={styles.wrapper} data-open={open ? 'true' : 'false'}>
        <div className={styles.inner}>
          {children}
        </div>
      </div>
    </div>
  );
}
