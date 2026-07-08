import React, { useState } from 'react';
import styles from './PagesPanel.module.css';
import sectionBtnStyles from '../shared/SectionBtn.module.css';
import { PageIcon, PlusIcon, TrashIcon, PencilIcon, ChevronIcon } from '../shared/Icons';
import { ConfirmButtons } from '../shared/ConfirmButtons';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { HoverIconButton } from '../shared/HoverIconButton';
import { PanelRow } from '../shared/PanelRow';
import { InlineBarForm } from '../shared/InlineBarForm';
import { BookSummary } from '../../types';

interface Props {
  pages: Array<{ filename: string; title: string }>;
  books: BookSummary[];
  onOpen: (filename: string) => void;
  onNew: (title: string) => void;
  onDelete: (filename: string) => void;
  onEdit: (filename: string) => void;
  onNewBook: () => void;
  onDeleteBook: (slug: string) => void;
  onAddChapter: (slug: string) => void;
  onRenameChapter: (slug: string, chapterIndex: number) => void;
  onRemoveChapter: (slug: string, chapterIndex: number) => void;
  onNewBookPage: (slug: string, chapterIndex: number) => void;
  onMoveBookPage: (slug: string, filename: string, toChapter: number) => void;
}

export function PagesPanel({
  pages, books, onOpen, onNew, onDelete, onEdit,
  onNewBook, onDeleteBook, onAddChapter, onRenameChapter, onRemoveChapter,
  onNewBookPage, onMoveBookPage,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [pendingDeletePage, setPendingDeletePage] = useState<string | null>(null);
  const [pendingDeleteBook, setPendingDeleteBook] = useState<string | null>(null);
  const [pendingDeleteChapter, setPendingDeleteChapter] = useState<string | null>(null);

  const totalCount = pages.length + books.reduce((s, b) => s + b.chapters.reduce((cs, c) => cs + c.pages.length, 0), 0);

  return (
    <CollapsibleSection icon={<PageIcon size={13} />} title="Pages" badge={totalCount}>
      {pages.map(page => (
        <PanelRow
          key={page.filename}
          icon={<PageIcon size={13} />}
          label={page.title}
          onClick={() => onOpen(page.filename)}
          actions={
            pendingDeletePage === page.filename ? (
              <ConfirmButtons
                onConfirm={e => { e.stopPropagation(); onDelete(page.filename); setPendingDeletePage(null); }}
                onCancel={e => { e.stopPropagation(); setPendingDeletePage(null); }}
              />
            ) : (
              <>
                <HoverIconButton title="Edit page" hoverColor="accent" onClick={() => onEdit(page.filename)}>
                  <PencilIcon size={12} />
                </HoverIconButton>
                <HoverIconButton title="Delete page" hoverColor="danger" onClick={() => setPendingDeletePage(page.filename)}>
                  <TrashIcon size={12} />
                </HoverIconButton>
              </>
            )
          }
        />
      ))}

      {books.map(book => (
        <CollapsibleSection
          key={book.slug}
          icon={<ChevronIcon size={11} />}
          title={book.title}
          badge={book.chapters.reduce((s, c) => s + c.pages.length, 0)}
          headerActions={
            pendingDeleteBook === book.slug ? (
              <ConfirmButtons
                onConfirm={e => { e.stopPropagation(); onDeleteBook(book.slug); setPendingDeleteBook(null); }}
                onCancel={e => { e.stopPropagation(); setPendingDeleteBook(null); }}
              />
            ) : (
              <>
                <HoverIconButton title="Add chapter" hoverColor="accent" onClick={() => onAddChapter(book.slug)}>
                  <PlusIcon size={11} />
                </HoverIconButton>
                <HoverIconButton title="Delete book" hoverColor="danger" onClick={() => setPendingDeleteBook(book.slug)}>
                  <TrashIcon size={12} />
                </HoverIconButton>
              </>
            )
          }
        >
          {book.chapters.map((chapter, ci) => {
            const chapterKey = `${book.slug}:${ci}`;
            return (
              <CollapsibleSection
                key={chapterKey}
                title={chapter.title}
                badge={chapter.pages.length}
                headerActions={
                  pendingDeleteChapter === chapterKey ? (
                    <ConfirmButtons
                      onConfirm={e => { e.stopPropagation(); onRemoveChapter(book.slug, ci); setPendingDeleteChapter(null); }}
                      onCancel={e => { e.stopPropagation(); setPendingDeleteChapter(null); }}
                    />
                  ) : (
                    <>
                      <HoverIconButton title="Add page" hoverColor="accent" onClick={() => onNewBookPage(book.slug, ci)}>
                        <PlusIcon size={11} />
                      </HoverIconButton>
                      <HoverIconButton title="Rename chapter" hoverColor="accent" onClick={() => onRenameChapter(book.slug, ci)}>
                        <PencilIcon size={12} />
                      </HoverIconButton>
                      <HoverIconButton title="Remove chapter" hoverColor="danger" onClick={() => setPendingDeleteChapter(chapterKey)}>
                        <TrashIcon size={12} />
                      </HoverIconButton>
                    </>
                  )
                }
              >
                {chapter.pages.map(p => (
                  <PanelRow
                    key={p.filename}
                    icon={<PageIcon size={13} />}
                    label={p.title || p.filename.replace(/\.desk$/, '')}
                    onClick={() => onOpen(`${book.slug}/${p.filename}`)}
                    actions={
                      <HoverIconButton title="Edit page" hoverColor="accent" onClick={() => onEdit(`${book.slug}/${p.filename}`)}>
                        <PencilIcon size={12} />
                      </HoverIconButton>
                    }
                  />
                ))}
              </CollapsibleSection>
            );
          })}
        </CollapsibleSection>
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
          <button className={sectionBtnStyles.btn} type="button" onClick={onNewBook}>
            <PlusIcon size={11} />
            New Book
          </button>
        </div>
      )}
    </CollapsibleSection>
  );
}
