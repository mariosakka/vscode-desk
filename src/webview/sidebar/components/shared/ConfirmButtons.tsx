import React from 'react';
import styles from './ConfirmButtons.module.css';
import { CheckIcon, CloseIcon } from './Icons';

interface Props {
  label?: string;
  onConfirm: (e: React.MouseEvent) => void;
  onCancel: (e: React.MouseEvent) => void;
}

export function ConfirmButtons({ label = 'Delete?', onConfirm, onCancel }: Props) {
  const stop = (handler: (e: React.MouseEvent) => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    handler(e);
  };

  return (
    <span className={styles.confirm}>
      <span className={styles.label}>{label}</span>
      <button className={styles.yes} onClick={stop(onConfirm)} title="Confirm">
        <CheckIcon size={12} />
      </button>
      <button className={styles.no} onClick={stop(onCancel)} title="Cancel">
        <CloseIcon size={10} />
      </button>
    </span>
  );
}
