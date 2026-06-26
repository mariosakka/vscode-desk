import React from 'react';
import styles from './PanelRow.module.css';

interface Props {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onClick?: () => void;
  actions: React.ReactNode;
}

export function PanelRow({ icon, label, sublabel, onClick, actions }: Props) {
  return (
    <div className={styles.row}>
      {icon}
      <div
        className={styles.body}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e: React.KeyboardEvent) => { if (e.key === 'Enter') onClick(); } : undefined}
      >
        <span className={styles.label}>{label}</span>
        {sublabel && <span className={styles.sublabel}>{sublabel}</span>}
      </div>
      <div className={styles.actions}>{actions}</div>
    </div>
  );
}
