import React from 'react';
import styles from './HoverIconButton.module.css';

interface Props {
  title: string;
  hoverColor?: 'danger' | 'accent';
  size?: 'sm' | 'md';
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  testId?: string;
}

export function HoverIconButton({ title, hoverColor = 'accent', size = 'sm', onClick, children, testId }: Props) {
  return (
    <button
      type="button"
      className={styles.btn}
      data-hover-btn={hoverColor}
      data-size={size}
      title={title}
      data-testid={testId}
      onClick={e => { e.stopPropagation(); onClick(e); }}
    >
      {children}
    </button>
  );
}
