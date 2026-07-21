import React from 'react';
import sectionBtnStyles from '../shared/SectionBtn.module.css';
import { GlobeIcon, TrashIcon } from '../shared/Icons';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { EmptyState } from '../shared/EmptyState';
import { HoverIconButton } from '../shared/HoverIconButton';
import { PanelRow } from '../shared/PanelRow';
import { LibraryEntry } from '../../types';

interface Props {
  libraries: LibraryEntry[];
  onSync: () => void;
  onRemove: (name: string) => void;
}

export function LibrariesPanel({ libraries, onSync, onRemove }: Props) {
  return (
    <CollapsibleSection icon={<GlobeIcon size={13} />} title="Page Libraries" defaultOpen={false}>
      {libraries.length === 0 && <EmptyState message="No libraries configured." />}
      {libraries.map(lib => (
        <PanelRow
          key={lib.name}
          icon={<GlobeIcon size={13} />}
          label={lib.name}
          sublabel={lib.installed ? 'installed' : 'pending'}
          actions={
            <HoverIconButton title={`Remove ${lib.name}`} hoverColor="danger" onClick={() => onRemove(lib.name)}>
              <TrashIcon size={11} />
            </HoverIconButton>
          }
        />
      ))}
      <div>
        <button className={sectionBtnStyles.btn} type="button" onClick={onSync}>
          <GlobeIcon size={13} /> Sync all
        </button>
      </div>
    </CollapsibleSection>
  );
}
