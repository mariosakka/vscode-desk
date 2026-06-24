import React from 'react';
import styles from './DismissButton.module.css';
import { CloseIcon } from './Icons';

interface Props {
  onClick: () => void;
  title?: string;
}

export function DismissButton({ onClick, title = 'Cancel' }: Props) {
  return (
    <button type="button" className={styles.btn} onClick={onClick} title={title}>
      <CloseIcon size={10} />
    </button>
  );
}
