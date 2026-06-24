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

export function GlobeIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm5.8 7h-2.3c-.1-1.7-.6-3.2-1.3-4.4A6.5 6.5 0 0113.8 7zM8 1.1c1 1.1 1.7 2.8 1.9 4.9H6.1C6.3 3.9 7 2.2 8 1.1zm-2.2.5C5.1 2.8 4.6 4.3 4.5 6H2.2a6.5 6.5 0 013.6-4.4zM2.2 9h2.3c.1 1.7.6 3.2 1.3 4.4A6.5 6.5 0 012.2 9zM8 14.9c-1-1.1-1.7-2.8-1.9-4.9h3.8c-.2 2.1-.9 3.8-1.9 4.9zm2.2-.5c.7-1.2 1.2-2.7 1.3-4.4h2.3a6.5 6.5 0 01-3.6 4.4zM11.5 9c-.1 1.7-.6 3.2-1.3 4.4-.7-1.2-1.2-2.7-1.3-4.4H11.5z"/>
    </svg>
  );
}

export function PageIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path d="M9 1H3a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V6L9 1zm0 1.5L12.5 6H9V2.5zM3 14V2h5v5h5v7H3z"/>
    </svg>
  );
}

export function ChevronIcon({ size = 10, down = true }: { size?: number; down?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="currentColor"
      style={{ transform: down ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }}>
      <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function PlusIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="currentColor">
      <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

export function SkillIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path d="M6 2a2 2 0 00-2 2v1H2.5A1.5 1.5 0 001 6.5v7A1.5 1.5 0 002.5 15h11a1.5 1.5 0 001.5-1.5v-7A1.5 1.5 0 0013.5 9H12V4a2 2 0 00-2-2H6zm0 1h4a1 1 0 011 1v1H5V4a1 1 0 011-1zm-3.5 4h11a.5.5 0 01.5.5v7a.5.5 0 01-.5.5h-11a.5.5 0 01-.5-.5v-7a.5.5 0 01.5-.5z"/>
    </svg>
  );
}

export function WorkflowIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path d="M3 2a1 1 0 100 2 1 1 0 000-2zm0-1a2 2 0 110 4 2 2 0 010-4zM13 2a1 1 0 100 2 1 1 0 000-2zm0-1a2 2 0 110 4 2 2 0 010-4zM3 12a1 1 0 100 2 1 1 0 000-2zm0-1a2 2 0 110 4 2 2 0 010-4z"/>
      <path d="M3 4v3.5a.5.5 0 00.5.5H7M13 4v3.5a.5.5 0 01-.5.5H7m0 0v5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
    </svg>
  );
}

export function PencilIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path d="M13.23 1a2.02 2.02 0 00-1.43.59L2.5 10.9l-.5 3.1 3.1-.5 9.31-9.31A2.02 2.02 0 0013.23 1zM3.7 12.3l.35-2.17 1.82 1.82-2.17.35zm2.7-.9L4.6 9.6 11.1 3.1l1.8 1.8-6.5 6.5zm2.1-8.5l1.8 1.8-.9.9-1.8-1.8.9-.9z"/>
    </svg>
  );
}
