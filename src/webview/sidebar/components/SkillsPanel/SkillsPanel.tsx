import React, { useState } from 'react';
import styles from './SkillsPanel.module.css';
import sectionBtnStyles from '../shared/SectionBtn.module.css';
import { SkillIcon, TrashIcon, PlusIcon, PencilIcon } from '../shared/Icons';
import { ConfirmButtons } from '../shared/ConfirmButtons';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { HoverIconButton } from '../shared/HoverIconButton';
import { PanelRow } from '../shared/PanelRow';
import { EmptyState } from '../shared/EmptyState';

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
  const [pendingName, setPendingName] = useState<string | null>(null);

  const newBtn = (
    <button className={styles.newBtn} type="button" onClick={onNew} title="New skill">
      <PlusIcon size={11} />
    </button>
  );

  return (
    <CollapsibleSection icon={<SkillIcon size={13} />} title="Skills" badge={skills.length} action={newBtn}>
      {skills.length === 0 && <EmptyState message="No skills installed." />}
      {skills.map(skill => (
        <PanelRow
          key={skill.name}
          icon={<SkillIcon size={13} />}
          label={skill.name}
          sublabel={skill.description || undefined}
          actions={
            pendingName === skill.name ? (
              <ConfirmButtons
                onConfirm={e => { e.stopPropagation(); onRemove(skill.name); setPendingName(null); }}
                onCancel={e => { e.stopPropagation(); setPendingName(null); }}
              />
            ) : (
              <>
                <HoverIconButton title="Edit skill" hoverColor="accent" onClick={() => onEdit(skill.name)}>
                  <PencilIcon size={12} />
                </HoverIconButton>
                <HoverIconButton title="Remove skill" hoverColor="danger" onClick={() => setPendingName(skill.name)}>
                  <TrashIcon size={12} />
                </HoverIconButton>
              </>
            )
          }
        />
      ))}
      <div className={styles.submitRow}>
        <button className={sectionBtnStyles.btn} type="button" onClick={onSubmit}>
          <SkillIcon size={13} />
          Submit open file as skill
        </button>
      </div>
    </CollapsibleSection>
  );
}
