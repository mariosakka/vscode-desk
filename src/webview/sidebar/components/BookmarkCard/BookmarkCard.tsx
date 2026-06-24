import React, { useState } from 'react';
import { Bookmark } from '../../types';
import styles from './BookmarkCard.module.css';
import inputStyles from '../shared/Inputs.module.css';
import { TrashIcon, PencilIcon } from '../shared/Icons';
import { ConfirmButtons } from '../shared/ConfirmButtons';
import { EditActions } from '../shared/EditActions';
import { HoverIconButton } from '../shared/HoverIconButton';

interface Props {
  bookmark: Bookmark;
  tabId: string;
  onOpen: (url: string) => void;
  onRemove: (tabId: string, bookmarkId: string) => void;
  onEdit: (tabId: string, bookmarkId: string, title: string, url: string) => void;
}

export function BookmarkCard({ bookmark, tabId, onOpen, onRemove, onEdit }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(bookmark.title);
  const [editUrl, setEditUrl] = useState(bookmark.url);

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    const title = editTitle.trim();
    const url = editUrl.trim();
    if (!title || !url) return;
    onEdit(tabId, bookmark.id, title, url);
    setEditing(false);
  };

  const handleEditCancel = () => {
    setEditTitle(bookmark.title);
    setEditUrl(bookmark.url);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className={styles.card} data-testid="bookmark-card">
        <form className={styles.editForm} onSubmit={handleEditSave}>
          <input
            className={inputStyles.field}
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && handleEditCancel()}
            placeholder="Title"
            maxLength={120}
            autoFocus
          />
          <input
            className={inputStyles.field}
            value={editUrl}
            onChange={e => setEditUrl(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && handleEditCancel()}
            placeholder="URL"
            maxLength={2048}
          />
          <div className={styles.editActions}>
            <EditActions onCancel={handleEditCancel} />
          </div>
        </form>
      </div>
    );
  }

  return (
    <div
      className={styles.card}
      data-testid="bookmark-card"
      onClick={() => { if (!confirming) onOpen(bookmark.url); }}
    >
      <div className={styles.icon} data-testid="bookmark-icon">
        {bookmark.icon.startsWith('data:')
          ? <img src={bookmark.icon} alt="" />
          : bookmark.icon || '🌐'}
      </div>
      <div className={styles.body}>
        <div className={styles.title} data-testid="bookmark-title">{bookmark.title}</div>
        <div className={styles.desc}>{bookmark.description}</div>
      </div>
      {confirming ? (
        <ConfirmButtons
          onConfirm={() => onRemove(tabId, bookmark.id)}
          onCancel={() => setConfirming(false)}
        />
      ) : (
        <>
          <HoverIconButton title="Edit" hoverColor="accent" size="md"
            onClick={() => { setEditTitle(bookmark.title); setEditUrl(bookmark.url); setEditing(true); }}>
            <PencilIcon size={15} />
          </HoverIconButton>
          <HoverIconButton title="Remove" hoverColor="danger" size="md"
            onClick={() => setConfirming(true)}>
            <TrashIcon size={15} />
          </HoverIconButton>
        </>
      )}
    </div>
  );
}
