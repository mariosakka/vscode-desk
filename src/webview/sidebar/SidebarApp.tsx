import React, { useState, useEffect } from 'react';
import { ScopedData, SidebarData, Project } from './types';
import { TabBar } from './components/TabBar/TabBar';
import { BookmarkGrid } from './components/BookmarkGrid/BookmarkGrid';
import { InlineTabForm } from './components/InlineTabForm/InlineTabForm';
import { InlineBookmarkForm } from './components/InlineBookmarkForm/InlineBookmarkForm';
import { QuickOpenForm } from './components/QuickOpenForm/QuickOpenForm';
import { BookmarkIcon, ProjectIcon, GlobeIcon } from './components/shared/Icons';
import { EmptyState } from './components/shared/EmptyState';
import sectionBtnStyles from './components/shared/SectionBtn.module.css';
import { PagesPanel } from './components/PagesPanel/PagesPanel';
import { SkillsPanel } from './components/SkillsPanel/SkillsPanel';
import { WorkflowPanel } from './components/WorkflowPanel/WorkflowPanel';

declare function acquireVsCodeApi(): { postMessage: (msg: unknown) => void };
const vscode = acquireVsCodeApi();

let _pendingData: SidebarData | null = null;
let _onData: ((d: SidebarData) => void) | null = null;

window.addEventListener('message', (e: MessageEvent) => {
  if (e.data?.type === 'update') {
    const d = e.data.data as SidebarData;
    if (_onData) { _onData(d); } else { _pendingData = d; }
  }
});

type FormMode = 'idle' | 'addingProject' | 'addingBookmark' | 'quickOpen';
type Scope = 'workspace' | 'global';

interface ScopedPaneProps {
  scopedData: ScopedData;
  scope: Scope;
  activeTabId: string | null;
  setActiveTabId: (id: string | null) => void;
  formMode: FormMode;
  setFormMode: (m: FormMode) => void;
  send: (msg: unknown) => void;
}

function ScopedPane({ scopedData, scope, activeTabId, setActiveTabId, formMode, setFormMode, send }: ScopedPaneProps) {
  const projects = scopedData.portal.projects ?? [];
  const hasProjects = projects.length > 0;
  const currentProjectId = activeTabId ?? projects[0]?.id ?? '';

  return (
    <>
      {formMode === 'quickOpen' && (
        <QuickOpenForm
          onSubmit={url => { send({ type: 'openUrl', url, scope }); setFormMode('idle'); }}
          onCancel={() => setFormMode('idle')}
        />
      )}
      <div>
        <div style={{ display: 'flex', gap: '6px', padding: '8px 12px 0' }}>
          <button
            className={sectionBtnStyles.btn}
            onClick={() => setFormMode('addingProject')}
            disabled={formMode !== 'idle'}
            title="New project"
          >
            <ProjectIcon size={11} /> Project
          </button>
          <button
            className={sectionBtnStyles.btn}
            onClick={() => setFormMode('quickOpen')}
            disabled={formMode !== 'idle'}
            title="Open URL"
          >
            <GlobeIcon size={11} />
          </button>
        </div>
        <div id={`tabs-bar-${scope}`}>
          {hasProjects && (
            <TabBar
              tabs={projects}
              activeTabId={currentProjectId}
              onSelect={setActiveTabId}
              onRemove={(projectId) => send({ type: 'removeProject', projectId, scope })}
            />
          )}
          {formMode === 'addingProject' && (
            <InlineTabForm
              existingNames={projects.map((p: Project) => p.name)}
              onSubmit={(name) => { send({ type: 'addProject', name, scope }); setFormMode('idle'); }}
              onCancel={() => setFormMode('idle')}
            />
          )}
        </div>
        <div id={`bookmarks-grid-${scope}`}>
          {!hasProjects ? (
            <EmptyState message="No projects yet. Click + Project above to create one." />
          ) : (
            <>
              <BookmarkGrid
                bookmarks={projects.find((p: Project) => p.id === currentProjectId)?.bookmarks ?? []}
                tabId={currentProjectId}
                onOpen={(url) => send({ type: 'openUrl', url, scope })}
                onRemove={(projectId, bookmarkId) => send({ type: 'removeBookmark', projectId, bookmarkId, scope })}
                onEdit={(projectId, bookmarkId, title, url) => send({ type: 'updateBookmark', projectId, bookmarkId, fields: { title, url }, scope })}
              />
              {formMode === 'addingBookmark' ? (
                <InlineBookmarkForm
                  existingTitles={projects.find((p: Project) => p.id === currentProjectId)?.bookmarks.map(b => b.title) ?? []}
                  onSubmit={(title, url) => { send({ type: 'addBookmark', projectId: currentProjectId, title, url, scope }); setFormMode('idle'); }}
                  onCancel={() => setFormMode('idle')}
                />
              ) : formMode === 'idle' && (
                <div style={{ padding: '0 12px 12px' }}>
                  <button className={sectionBtnStyles.btn} onClick={() => setFormMode('addingBookmark')}>
                    <BookmarkIcon size={11} /> Add Bookmark
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <PagesPanel
        pages={scopedData.pages ?? []}
        onOpen={(filename) => send({ type: 'openPage', filename, scope })}
        onNew={(title) => send({ type: 'newPage', title, scope })}
        onDelete={(filename) => send({ type: 'deletePage', filename, scope })}
        onEdit={(filename) => send({ type: 'editPage', filename, scope })}
      />
      <SkillsPanel
        skills={scopedData.skills ?? []}
        onRemove={(name) => send({ type: 'removeSkill', name, scope })}
        onNew={() => send({ type: 'newSkill', scope })}
        onEdit={(name) => send({ type: 'editSkill', name, scope })}
        onSubmit={() => send({ type: 'submitSkill', scope })}
      />
      <WorkflowPanel
        workflow={scopedData.workflow ?? null}
        onSave={(config) => send({ type: 'saveWorkflow', config, scope })}
      />
    </>
  );
}

export function SidebarApp() {
  const [data, setData] = useState<SidebarData | null>(null);
  const [activeScope, setActiveScope] = useState<Scope>('workspace');
  const [wsActiveTabId, setWsActiveTabId] = useState<string | null>(null);
  const [globalActiveTabId, setGlobalActiveTabId] = useState<string | null>(null);
  const [wsFormMode, setWsFormMode] = useState<FormMode>('idle');
  const [globalFormMode, setGlobalFormMode] = useState<FormMode>('idle');

  useEffect(() => {
    _onData = (incoming) => {
      setData(incoming);
      if (!incoming.workspace) setActiveScope('global');
      const wsProjects = incoming.workspace?.portal.projects ?? [];
      setWsActiveTabId(prev => wsProjects.find((p: Project) => p.id === prev) ? prev : wsProjects[0]?.id ?? null);
      const gProjects = incoming.global.portal.projects ?? [];
      setGlobalActiveTabId(prev => gProjects.find((p: Project) => p.id === prev) ? prev : gProjects[0]?.id ?? null);
    };
    if (_pendingData) { _onData(_pendingData); _pendingData = null; }
    vscode.postMessage({ type: 'ready' });
    return () => { _onData = null; };
  }, []);

  const send = (msg: unknown) => vscode.postMessage(msg);

  const emptyScoped: ScopedData = { portal: { projects: [] }, pages: [], workflow: null, skills: [] };
  const hasWorkspace = !!data?.workspace;

  return (
    <div id="app">
      {hasWorkspace && (
        <div style={{
          display: 'flex',
          gap: '4px',
          padding: '8px 12px',
          borderBottom: '1px solid var(--border)',
        }}>
          {(['workspace', 'global'] as Scope[]).map(s => (
            <button
              key={s}
              onClick={() => setActiveScope(s)}
              style={{
                flex: 1,
                padding: '5px 0',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'capitalize',
                cursor: 'pointer',
                border: 'none',
                borderRadius: '6px',
                background: activeScope === s ? 'var(--accent)' : 'transparent',
                color: activeScope === s ? 'var(--vscode-button-foreground, #fff)' : 'var(--muted)',
                transition: 'background 150ms, color 150ms',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {hasWorkspace && activeScope === 'workspace' ? (
        <ScopedPane
          scopedData={data!.workspace!}
          scope="workspace"
          activeTabId={wsActiveTabId}
          setActiveTabId={setWsActiveTabId}
          formMode={wsFormMode}
          setFormMode={setWsFormMode}
          send={send}
        />
      ) : (
        <ScopedPane
          scopedData={data?.global ?? emptyScoped}
          scope="global"
          activeTabId={globalActiveTabId}
          setActiveTabId={setGlobalActiveTabId}
          formMode={globalFormMode}
          setFormMode={setGlobalFormMode}
          send={send}
        />
      )}
    </div>
  );
}
