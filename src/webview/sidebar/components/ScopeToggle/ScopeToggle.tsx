import React from 'react';
import { Scope } from '../../types';
import styles from './ScopeToggle.module.css';

interface Props {
  active: Scope;
  onChange: (scope: Scope) => void;
}

export function ScopeToggle({ active, onChange }: Props) {
  return (
    <div className={styles.bar}>
      {(['workspace', 'global'] as Scope[]).map(s => (
        <button
          key={s}
          className={`${styles.btn}${active === s ? ' ' + styles.active : ''}`}
          onClick={() => onChange(s)}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
