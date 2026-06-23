import React from 'react';

export function TrashIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 13 / 12)} viewBox="0 0 12 13" fill="currentColor" aria-hidden="true">
      <path d="M4 1V0h4v1h4v1.5H0V1h4zM1.5 4h9l-.9 8.1a1 1 0 01-1 .9H3.4a1 1 0 01-1-.9L1.5 4zm3 1.5v6h1v-6h-1zm2.5 0v6h1v-6H7z" />
    </svg>
  );
}

export function CheckIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 10 / 12)} viewBox="0 0 12 10" fill="none" aria-hidden="true">
      <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CloseIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function BookmarkIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 14 / 11)} viewBox="0 0 11 14" fill="currentColor" aria-hidden="true">
      <path d="M1 0h9a1 1 0 011 1v12l-5-3-5 3V1a1 1 0 011-1z" />
    </svg>
  );
}

export function TabIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 13 13" fill="currentColor" aria-hidden="true">
      <path d="M0 2a2 2 0 012-2h4l2 2h5a2 2 0 012 2v7a2 2 0 01-2 2H2a2 2 0 01-2-2V2z" />
    </svg>
  );
}
