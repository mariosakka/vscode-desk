import React from 'react';
import styles from './PageTemplatePanel.module.css';
import sectionBtnStyles from '../shared/SectionBtn.module.css';
import { PageIcon, PencilIcon, TrashIcon } from '../shared/Icons';
import { CollapsibleSection } from '../shared/CollapsibleSection';

interface Props {
  template: string | null;
  onEdit: () => void;
  onClear: () => void;
}

export function PageTemplatePanel({ template, onEdit, onClear }: Props) {
  return (
    <CollapsibleSection
      icon={<PageIcon size={13} />}
      title="Page Template"
      defaultOpen={false}
    >
      <div className={styles.body}>
        {template ? (
          <>
            <p className={styles.status}>Template set — agents apply this style when creating new pages.</p>
            <div className={styles.actions}>
              <button className={sectionBtnStyles.btn} type="button" onClick={onEdit}>
                <PencilIcon size={12} /> Edit
              </button>
              <button className={styles.clearBtn} type="button" onClick={onClear} title="Clear template">
                <TrashIcon size={11} />
              </button>
            </div>
          </>
        ) : (
          <>
            <p className={styles.status}>Not set. Agents use default layout.</p>
            <button className={sectionBtnStyles.btn} type="button" onClick={onEdit}>
              <PageIcon size={13} /> Set template
            </button>
          </>
        )}
      </div>
    </CollapsibleSection>
  );
}
