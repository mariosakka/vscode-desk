import React, { useState, useEffect } from 'react';
import { ScopedData, SidebarData, Tab } from './types';
import { TabBar } from './components/TabBar/TabBar';
import { BookmarkGrid } from './components/BookmarkGrid/BookmarkGrid';
import { InlineTabForm } from './components/InlineTabForm/InlineTabForm';
import { InlineBookmarkForm } from './components/InlineBookmarkForm/InlineBookmarkForm';
import { QuickOpenForm } from './components/QuickOpenForm/QuickOpenForm';
import { BookmarkIcon, TabIcon, GlobeIcon } from './components/shared/Icons';
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

type FormMode = 'idle' | 'addingTab' | 'addingBookmark' | 'quickOpen';
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
  const tabs = scopedData.portal.tabs ?? [];
  const hasTabs = tabs.length > 0;
  const currentTabId = activeTabId ?? tabs[0]?.id ?? '';

  return (
    <>
      {formMode === 'quickOpen' && (
        <QuickOpenForm
          onSubmit={url => { send({ type: 'openUrl', url, scope }); setFormMode('idle'); }}
          onCancel={() => setFormMode('idle')}
        />
      )}
      <div>
        <div style={{ display: 'flex', gap: '6px', padding: '4px 12px 0' }}>
          <button
            className={sectionBtnStyles.btn}
            onClick={() => setFormMode('addingTab')}
            disabled={formMode !== 'idle'}
            title="New tab"
          >
            <TabIcon size={11} /> Tab
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
          {hasTabs && (
            <TabBar
              tabs={tabs}
              activeTabId={currentTabId}
              onSelect={setActiveTabId}
              onRemove={(tabId) => send({ type: 'removeTab', tabId, scope })}
            />
          )}
          {formMode === 'addingTab' && (
            <InlineTabForm
              existingNames={tabs.map((t: Tab) => t.name)}
              onSubmit={(name) => { send({ type: 'addTab', name, scope }); setFormMode('idle'); }}
              onCancel={() => setFormMode('idle')}
            />
          )}
        </div>
        <div id={`bookmarks-grid-${scope}`}>
          {!hasTabs ? (
            <EmptyState message="No tabs yet. Click + Tab above to create one." />
          ) : (
            <>
              <BookmarkGrid
                bookmarks={tabs.find((t: Tab) => t.id === currentTabId)?.bookmarks ?? []}
                tabId={currentTabId}
                onOpen={(url) => send({ type: 'openUrl', url, scope })}
                onRemove={(tabId, bookmarkId) => send({ type: 'removeBookmark', tabId, bookmarkId, scope })}
                onEdit={(tabId, bookmarkId, title, url) => send({ type: 'updateBookmark', tabId, bookmarkId, fields: { title, url }, scope })}
              />
              {formMode === 'addingBookmark' ? (
                <InlineBookmarkForm
                  existingTitles={tabs.find((t: Tab) => t.id === currentTabId)?.bookmarks.map(b => b.title) ?? []}
                  onSubmit={(title, url) => { send({ type: 'addBookmark', tabId: currentTabId, title, url, scope }); setFormMode('idle'); }}
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
      const wsTabs = incoming.workspace?.portal.tabs ?? [];
      setWsActiveTabId(prev => wsTabs.find((t: Tab) => t.id === prev) ? prev : wsTabs[0]?.id ?? null);
      const gTabs = incoming.global.portal.tabs ?? [];
      setGlobalActiveTabId(prev => gTabs.find((t: Tab) => t.id === prev) ? prev : gTabs[0]?.id ?? null);
    };
    if (_pendingData) { _onData(_pendingData); _pendingData = null; }
    vscode.postMessage({ type: 'ready' });
    return () => { _onData = null; };
  }, []);

  const send = (msg: unknown) => vscode.postMessage(msg);

  const emptyScoped: ScopedData = { portal: { tabs: [] }, pages: [], workflow: null, skills: [] };
  const hasWorkspace = !!data?.workspace;

  return (
    <div id="app">
      {hasWorkspace && (
        <div style={{
          display: 'flex',
          gap: '2px',
          padding: '8px 12px 0',
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
                borderRadius: 'var(--radius)',
                background: activeScope === s ? 'var(--accent)' : 'var(--surface)',
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
