import React, { useState } from 'react';
import styles from './SkillsPanel.module.css';
import { SkillIcon, ChevronIcon, TrashIcon, PlusIcon, PencilIcon } from '../shared/Icons';
import { ConfirmButtons } from '../shared/ConfirmButtons';

interface Skill {
  name: string;
  description: string;
  agents: string[];
  version: number;
}

interface Props {
  skills: Skill[];
  onRemove: (name: string) => void;
  onNew: () => void;
  onEdit: (name: string) => void;
  onSubmit: () => void;
}

export function SkillsPanel({ skills, onRemove, onNew, onEdit, onSubmit }: Props) {
  const [open, setOpen] = useState(true);
  const [pendingName, setPendingName] = useState<string | null>(null);

  return (
    <div className={styles.section}>
      <div className={styles.headerRow}>
        <button
          className={styles.header}
          onClick={() => setOpen(o => !o)}
          type="button"
        >
          <ChevronIcon size={10} down={open} />
          <SkillIcon size={13} />
          Skills ({skills.length})
        </button>
        <button className={styles.newBtn} type="button" onClick={onNew} title="New skill">
          <PlusIcon size={11} />
        </button>
      </div>
      {open && (
        <>
          {skills.length === 0 && (
            <p className={styles.empty}>No skills installed.</p>
          )}
          {skills.map(skill => (
            <div key={skill.name} className={styles.row}>
              <SkillIcon size={13} />
              <div className={styles.rowBody}>
                <span className={styles.skillName}>{skill.name}</span>
                {skill.description && (
                  <span className={styles.skillDesc}>{skill.description}</span>
                )}
              </div>
              {pendingName === skill.name ? (
                <ConfirmButtons
                  onConfirm={e => { e.stopPropagation(); onRemove(skill.name); setPendingName(null); }}
                  onCancel={e => { e.stopPropagation(); setPendingName(null); }}
                />
              ) : (
                <>
                  <button
                    className={styles.editBtn}
                    type="button"
                    title="Edit skill"
                    onClick={e => { e.stopPropagation(); onEdit(skill.name); }}
                  >
                    <PencilIcon size={12} />
                  </button>
                  <button
                    className={styles.removeBtn}
                    type="button"
                    title="Remove skill"
                    onClick={e => { e.stopPropagation(); setPendingName(skill.name); }}
                  >
                    <TrashIcon size={12} />
                  </button>
                </>
              )}
            </div>
          ))}
          <div className={styles.submitRow}>
            <button className={styles.submitBtn} type="button" onClick={onSubmit}>
              Submit open file as skill
            </button>
          </div>
        </>
      )}
    </div>
  );
}
