import React from 'react';
import { InlineBarForm } from '../shared/InlineBarForm';

const BLOCKED = /^(javascript|data|vbscript|file):/i;

interface Props {
  onSubmit: (url: string) => void;
  onCancel: () => void;
}

export function QuickOpenForm({ onSubmit, onCancel }: Props) {
  const validate = (url: string) =>
    BLOCKED.test(url) ? 'This URL protocol is not allowed.' : null;

  return (
    <InlineBarForm
      placeholder="Open URL…"
      validate={validate}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
}
