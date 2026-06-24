import React, { useState } from 'react';
import styles from './WorkflowPanel.module.css';
import { WorkflowIcon, ChevronIcon, TrashIcon } from '../shared/Icons';
import { WorkflowConfig } from '../../types';

interface Props {
  workflow: WorkflowConfig | null;
  onSave: (config: WorkflowConfig) => void;
}

function emptyConfig(): WorkflowConfig {
  return { communication: [], general: [] };
}

function hasContent(w: WorkflowConfig | null): boolean {
  if (!w) return false;
  return w.communication.length > 0 || w.general.length > 0;
}

export function WorkflowPanel({ workflow, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<WorkflowConfig>(emptyConfig());

  const [newCommLabel, setNewCommLabel] = useState('');
  const [newCommChannel, setNewCommChannel] = useState('');
  const [newGenLabel, setNewGenLabel] = useState('');
  const [newGenValue, setNewGenValue] = useState('');

  const startEdit = () => {
    setDraft(workflow ? structuredClone(workflow) : emptyConfig());
    setNewCommLabel('');
    setNewCommChannel('');
    setNewGenLabel('');
    setNewGenValue('');
    setEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(draft);
    setEditing(false);
  };

  const updateCommEntry = (index: number, field: 'label' | 'channel', value: string) => {
    setDraft(prev => {
      const next = structuredClone(prev);
      next.communication[index][field] = value;
      return next;
    });
  };

  const removeCommEntry = (index: number) => {
    setDraft(prev => ({
      ...prev,
      communication: prev.communication.filter((_, i) => i !== index),
    }));
  };

  const addCommEntry = () => {
    if (!newCommLabel.trim() && !newCommChannel.trim()) return;
    setDraft(prev => ({
      ...prev,
      communication: [...prev.communication, { label: newCommLabel.trim(), channel: newCommChannel.trim() }],
    }));
    setNewCommLabel('');
    setNewCommChannel('');
  };

  const updateGenEntry = (index: number, field: 'label' | 'value', value: string) => {
    setDraft(prev => {
      const next = structuredClone(prev);
      next.general[index][field] = value;
      return next;
    });
  };

  const removeGenEntry = (index: number) => {
    setDraft(prev => ({
      ...prev,
      general: prev.general.filter((_, i) => i !== index),
    }));
  };

  const addGenEntry = () => {
    if (!newGenLabel.trim() && !newGenValue.trim()) return;
    setDraft(prev => ({
      ...prev,
      general: [...prev.general, { label: newGenLabel.trim(), value: newGenValue.trim() }],
    }));
    setNewGenLabel('');
    setNewGenValue('');
  };

  const configured = hasContent(workflow);

  return (
    <div className={styles.section}>
      <button
        className={styles.header}
        onClick={() => { setOpen(o => !o); setEditing(false); }}
        type="button"
      >
        <ChevronIcon size={10} down={open} />
        <WorkflowIcon size={13} />
        Workflow
      </button>
      {open && (
        <div className={styles.body}>
          {editing ? (
            <form onSubmit={handleSave}>
              <p className={styles.subLabel}>Communication</p>
              {draft.communication.map((entry, i) => (
                <div key={i} className={styles.entryRow}>
                  <input
                    className={styles.entryInput}
                    value={entry.label}
                    onChange={e => updateCommEntry(i, 'label', e.target.value)}
                    placeholder="Label"
                  />
                  <span className={styles.sep}>→</span>
                  <input
                    className={styles.entryInput}
                    value={entry.channel}
                    onChange={e => updateCommEntry(i, 'channel', e.target.value)}
                    placeholder="Channel"
                  />
                  <button type="button" className={styles.removeEntry} onClick={() => removeCommEntry(i)}>
                    <TrashIcon size={11} />
                  </button>
                </div>
              ))}
              <div className={styles.addRow}>
                <input
                  className={styles.entryInput}
                  value={newCommLabel}
                  onChange={e => setNewCommLabel(e.target.value)}
                  placeholder="Label"
                />
                <span className={styles.sep}>→</span>
                <input
                  className={styles.entryInput}
                  value={newCommChannel}
                  onChange={e => setNewCommChannel(e.target.value)}
                  placeholder="Channel"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCommEntry(); } }}
                />
                <button type="button" className={styles.addBtn} onClick={addCommEntry}>+</button>
              </div>

              <p className={styles.subLabel}>General</p>
              {draft.general.map((entry, i) => (
                <div key={i} className={styles.entryRow}>
                  <input
                    className={styles.entryInput}
                    value={entry.label}
                    onChange={e => updateGenEntry(i, 'label', e.target.value)}
                    placeholder="Label"
                  />
                  <span className={styles.sep}>→</span>
                  <input
                    className={styles.entryInput}
                    value={entry.value}
                    onChange={e => updateGenEntry(i, 'value', e.target.value)}
                    placeholder="Value"
                  />
                  <button type="button" className={styles.removeEntry} onClick={() => removeGenEntry(i)}>
                    <TrashIcon size={11} />
                  </button>
                </div>
              ))}
              <div className={styles.addRow}>
                <input
                  className={styles.entryInput}
                  value={newGenLabel}
                  onChange={e => setNewGenLabel(e.target.value)}
                  placeholder="Label"
                />
                <span className={styles.sep}>→</span>
                <input
                  className={styles.entryInput}
                  value={newGenValue}
                  onChange={e => setNewGenValue(e.target.value)}
                  placeholder="Value"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGenEntry(); } }}
                />
                <button type="button" className={styles.addBtn} onClick={addGenEntry}>+</button>
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.saveBtn}>Save</button>
                <button type="button" className={styles.cancelBtn} onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <>
              {!configured ? (
                <p className={styles.empty}>Not configured.</p>
              ) : (
                <div className={styles.fields}>
                  {workflow!.communication.length > 0 && (
                    <>
                      <p className={styles.subLabel}>Communication</p>
                      {workflow!.communication.map((entry, i) => (
                        <div key={i} className={styles.viewRow}>
                          <span className={styles.viewLabel}>{entry.label}</span>
                          <span className={styles.viewVal}>{entry.channel}</span>
                        </div>
                      ))}
                    </>
                  )}
                  {workflow!.general.length > 0 && (
                    <>
                      <p className={styles.subLabel}>General</p>
                      {workflow!.general.map((entry, i) => (
                        <div key={i} className={styles.viewRow}>
                          <span className={styles.viewLabel}>{entry.label}</span>
                          <span className={styles.viewVal}>{entry.value}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
              <button className={styles.configBtn} type="button" onClick={startEdit}>
                {configured ? 'Edit' : 'Configure'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
