import React from 'react';
import styles from './EmptyState.module.css';

interface Props {
  message: string;
}

export function EmptyState({ message }: Props) {
  return <p className={styles.empty}>{message}</p>;
}
