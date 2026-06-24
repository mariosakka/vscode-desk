import React, { useState, useEffect } from 'react';
import { SidebarData, Tab } from './types';
import { Header } from './components/Header/Header';
import { TabBar } from './components/TabBar/TabBar';
import { BookmarkGrid } from './components/BookmarkGrid/BookmarkGrid';
import { InlineTabForm } from './components/InlineTabForm/InlineTabForm';
import { InlineBookmarkForm } from './components/InlineBookmarkForm/InlineBookmarkForm';
import { QuickOpenForm } from './components/QuickOpenForm/QuickOpenForm';
import { PagesPanel } from './components/PagesPanel/PagesPanel';
import { SkillsPanel } from './components/SkillsPanel/SkillsPanel';
import { WorkflowPanel } from './components/WorkflowPanel/WorkflowPanel';

declare function acquireVsCodeApi(): { postMessage: (msg: unknown) => void };
const vscode = acquireVsCodeApi();

let _pendingData: SidebarData | null = null;
let _onData: ((d: SidebarData) => void) | null = null;

window.addEventListener('message', (e: MessageEvent) => {
  if (e.data?.type !== 'update') return;
  const d = e.data.data as SidebarData;
  if (_onData) { _onData(d); } else { _pendingData = d; }
});

type FormMode = 'idle' | 'addingTab' | 'addingBookmark' | 'quickOpen';

export function SidebarApp() {
  const [data, setData] = useState<SidebarData | null>(null);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>('idle');

  useEffect(() => {
    _onData = (incoming) => {
      setData(incoming);
      setActiveTabId(prev => {
        if (!prev || !incoming.portal.tabs.find((t: Tab) => t.id === prev))
          return incoming.portal.tabs[0]?.id ?? null;
        return prev;
      });
      setFormMode('idle');
    };
    if (_pendingData) { _onData(_pendingData); _pendingData = null; }
    vscode.postMessage({ type: 'ready' });
    return () => { _onData = null; };
  }, []);

  const send = (msg: unknown) => vscode.postMessage(msg);
  const tabs = data?.portal.tabs ?? [];
  const hasTabs = tabs.length > 0;
  const currentTabId = activeTabId ?? tabs[0]?.id ?? '';

  return (
    <>
      <Header
        onAddTab={() => setFormMode('addingTab')}
        onAddBookmark={() => setFormMode('addingBookmark')}
        onQuickOpen={() => setFormMode('quickOpen')}
        canAddTab={formMode === 'idle'}
        canAddBookmark={hasTabs && formMode === 'idle'}
        canQuickOpen={formMode === 'idle'}
      />
      {formMode === 'quickOpen' && (
        <QuickOpenForm
          onSubmit={url => { send({ type: 'openUrl', url }); setFormMode('idle'); }}
          onCancel={() => setFormMode('idle')}
        />
      )}
      <div id="tabs-bar">
        {hasTabs && (
          <TabBar
            tabs={tabs}
            activeTabId={currentTabId}
            onSelect={setActiveTabId}
            onRemove={(tabId) => send({ type: 'removeTab', tabId })}
          />
        )}
        {formMode === 'addingTab' && (
          <InlineTabForm
            existingNames={tabs.map(t => t.name)}
            onSubmit={(name) => send({ type: 'addTab', name })}
            onCancel={() => setFormMode('idle')}
          />
        )}
      </div>
      <div id="bookmarks-grid">
        {formMode === 'addingBookmark' && (
          <InlineBookmarkForm
            existingTitles={tabs.find(t => t.id === currentTabId)?.bookmarks.map(b => b.title) ?? []}
            onSubmit={(title, url) => send({ type: 'addBookmark', tabId: currentTabId, title, url })}
            onCancel={() => setFormMode('idle')}
          />
        )}
        {!hasTabs ? (
          <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 0', fontSize: '12px' }}>
            No tabs yet. Click <strong>+ Tab</strong> above to create one.
          </p>
        ) : (
          <BookmarkGrid
            bookmarks={tabs.find(t => t.id === currentTabId)?.bookmarks ?? []}
            tabId={currentTabId}
            onOpen={(url) => send({ type: 'openUrl', url })}
            onRemove={(tabId, bookmarkId) => send({ type: 'removeBookmark', tabId, bookmarkId })}
          />
        )}
      </div>
      <PagesPanel
        pages={data?.pages ?? []}
        onOpen={(filename) => send({ type: 'openPage', filename })}
        onNew={(title) => send({ type: 'newPage', title })}
        onDelete={(filename) => send({ type: 'deletePage', filename })}
      />
      <SkillsPanel
        skills={data?.skills ?? []}
        onRemove={(name) => send({ type: 'removeSkill', name })}
        onNew={() => send({ type: 'newSkill' })}
        onEdit={(name) => send({ type: 'editSkill', name })}
        onSubmit={() => send({ type: 'submitSkill' })}
      />
      <WorkflowPanel
        workflow={data?.workflow ?? null}
        onSave={(config) => send({ type: 'saveWorkflow', config })}
      />
    </>
  );
}
