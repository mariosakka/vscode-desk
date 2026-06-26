import React, { useState } from 'react';
import styles from './PagesPanel.module.css';
import sectionBtnStyles from '../shared/SectionBtn.module.css';
import { PageIcon, PlusIcon, TrashIcon, PencilIcon } from '../shared/Icons';
import { ConfirmButtons } from '../shared/ConfirmButtons';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { HoverIconButton } from '../shared/HoverIconButton';
import { PanelRow } from '../shared/PanelRow';
import { InlineBarForm } from '../shared/InlineBarForm';

interface Props {
  pages: Array<{ filename: string; title: string }>;
  onOpen: (filename: string) => void;
  onNew: (title: string) => void;
  onDelete: (filename: string) => void;
  onEdit: (filename: string) => void;
}

export function PagesPanel({ pages, onOpen, onNew, onDelete, onEdit }: Props) {
  const [adding, setAdding] = useState(false);
  const [pendingFilename, setPendingFilename] = useState<string | null>(null);

  return (
    <CollapsibleSection icon={<PageIcon size={13} />} title="Pages" badge={pages.length}>
      {pages.map(page => (
        <PanelRow
          key={page.filename}
          icon={<PageIcon size={13} />}
          label={page.title}
          onClick={() => onOpen(page.filename)}
          actions={
            pendingFilename === page.filename ? (
              <ConfirmButtons
                onConfirm={e => { e.stopPropagation(); onDelete(page.filename); setPendingFilename(null); }}
                onCancel={e => { e.stopPropagation(); setPendingFilename(null); }}
              />
            ) : (
              <>
                <HoverIconButton title="Edit page" hoverColor="accent" onClick={() => onEdit(page.filename)}>
                  <PencilIcon size={12} />
                </HoverIconButton>
                <HoverIconButton title="Delete page" hoverColor="danger" onClick={() => setPendingFilename(page.filename)}>
                  <TrashIcon size={12} />
                </HoverIconButton>
              </>
            )
          }
        />
      ))}
      {adding ? (
        <InlineBarForm
          placeholder="Page title…"
          maxLength={80}
          validate={title =>
            pages.some(p => p.title.toLowerCase() === title.toLowerCase())
              ? `"${title}" already exists`
              : null
          }
          onSubmit={title => { onNew(title); setAdding(false); }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <div className={styles.addRow}>
          <button className={sectionBtnStyles.btn} type="button" onClick={() => setAdding(true)}>
            <PlusIcon size={11} />
            <PageIcon size={13} />
            New Page
          </button>
        </div>
      )}
    </CollapsibleSection>
  );
}
