import React from 'react';
import { InlineBarForm } from '../shared/InlineBarForm';

interface Props {
  existingNames: string[];
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

export function InlineTabForm({ existingNames, onSubmit, onCancel }: Props) {
  const validate = (name: string) =>
    existingNames.some(n => n.toLowerCase() === name.toLowerCase())
      ? `A project named "${name}" already exists.`
      : null;

  return (
    <InlineBarForm
      placeholder="Project name…"
      maxLength={40}
      validate={validate}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
}
