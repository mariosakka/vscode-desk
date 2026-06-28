import React, { useState, useEffect } from 'react';
import { ScopedData, SidebarData } from './types';
import { BookmarksPanel } from './components/BookmarksPanel/BookmarksPanel';
import { PagesPanel } from './components/PagesPanel/PagesPanel';
import { SkillsPanel } from './components/SkillsPanel/SkillsPanel';
import { WorkflowPanel } from './components/WorkflowPanel/WorkflowPanel';
import { PageTemplatePanel } from './components/PageTemplatePanel/PageTemplatePanel';
import { LibrariesPanel } from './components/LibrariesPanel/LibrariesPanel';

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

type Scope = 'workspace' | 'global';

interface ScopedPaneProps {
  scopedData: ScopedData;
  scope: Scope;
  send: (msg: unknown) => void;
}

function ScopedPane({ scopedData, scope, send }: ScopedPaneProps) {
  const bookmarks = scopedData.data.bookmarks ?? [];

  return (
    <>
      <BookmarksPanel
        bookmarks={bookmarks}
        onOpen={(url) => send({ type: 'openUrl', url, scope })}
        onRemove={(bookmarkId) => send({ type: 'removeBookmark', bookmarkId, scope })}
        onEdit={(bookmarkId, title, url) => send({ type: 'updateBookmark', bookmarkId, fields: { title, url }, scope })}
        onAdd={(title, url) => send({ type: 'addBookmark', title, url, scope })}
        onOpenUrl={(url) => send({ type: 'openUrl', url, scope })}
      />
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

  useEffect(() => {
    _onData = (incoming) => {
      setData(incoming);
      if (!incoming.workspace) setActiveScope('global');
    };
    if (_pendingData) { _onData(_pendingData); _pendingData = null; }
    vscode.postMessage({ type: 'ready' });
    return () => { _onData = null; };
  }, []);

  const send = (msg: unknown) => vscode.postMessage(msg);

  const emptyScoped: ScopedData = { data: { bookmarks: [] }, pages: [], workflow: null, skills: [] };
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
        <ScopedPane scopedData={data!.workspace!} scope="workspace" send={send} />
      ) : (
        <ScopedPane scopedData={data?.global ?? emptyScoped} scope="global" send={send} />
      )}
      <PageTemplatePanel
        template={data?.pageTemplate ?? null}
        onEdit={() => send({ type: 'editPageTemplate' })}
        onClear={() => send({ type: 'clearPageTemplate' })}
      />
      <LibrariesPanel
        libraries={data?.libraries ?? []}
        onSync={() => send({ type: 'syncLibraries' })}
        onRemove={(name) => send({ type: 'removeLibrary', name })}
      />
    </div>
  );
}
