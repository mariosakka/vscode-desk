import React from 'react';
import styles from './EditActions.module.css';
import { CheckIcon, CloseIcon } from './Icons';

interface Props {
  onCancel: () => void;
}

export function EditActions({ onCancel }: Props) {
  return (
    <span className={styles.actions}>
      <button type="submit" className={styles.save} title="Save">
        <CheckIcon size={12} />
      </button>
      <button type="button" className={styles.cancel} title="Cancel" onClick={onCancel}>
        <CloseIcon size={10} />
      </button>
    </span>
  );
}
