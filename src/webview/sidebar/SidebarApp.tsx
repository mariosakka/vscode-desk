import React, { useState, useEffect } from 'react';
import { PortalData, Tab } from './types';
import { Header } from './components/Header/Header';
import { TabBar } from './components/TabBar/TabBar';
import { BookmarkGrid } from './components/BookmarkGrid/BookmarkGrid';
import { InlineTabForm } from './components/InlineTabForm/InlineTabForm';
import { InlineBookmarkForm } from './components/InlineBookmarkForm/InlineBookmarkForm';

declare function acquireVsCodeApi(): { postMessage: (msg: unknown) => void };
const vscode = acquireVsCodeApi();

let _pendingData: PortalData | null = null;
let _onData: ((d: PortalData) => void) | null = null;

window.addEventListener('message', (e: MessageEvent) => {
  if (e.data?.type !== 'update') return;
  const d = e.data.data as PortalData;
  if (_onData) { _onData(d); } else { _pendingData = d; }
});

type FormMode = 'idle' | 'addingTab' | 'addingBookmark';

export function SidebarApp() {
  const [data, setData] = useState<PortalData | null>(null);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>('idle');

  useEffect(() => {
    _onData = (incoming) => {
      setData(incoming);
      setActiveTabId(prev => {
        if (!prev || !incoming.tabs.find((t: Tab) => t.id === prev))
          return incoming.tabs[0]?.id ?? null;
        return prev;
      });
      setFormMode('idle');
    };
    if (_pendingData) { _onData(_pendingData); _pendingData = null; }
    vscode.postMessage({ type: 'ready' });
    return () => { _onData = null; };
  }, []);

  const send = (msg: unknown) => vscode.postMessage(msg);
  const hasTabs = !!data && data.tabs.length > 0;

  return (
    <>
      <Header
        onAddTab={() => setFormMode('addingTab')}
        onAddBookmark={() => setFormMode('addingBookmark')}
        canAddTab={formMode === 'idle'}
        canAddBookmark={hasTabs && formMode === 'idle'}
      />
      <div id="tabs-bar">
        {hasTabs && (
          <TabBar
            tabs={data!.tabs}
            activeTabId={activeTabId ?? data!.tabs[0]?.id ?? ''}
            onSelect={setActiveTabId}
            onRemove={(tabId) => send({ type: 'removeTab', tabId })}
          />
        )}
        {formMode === 'addingTab' && (
          <InlineTabForm
            existingNames={data?.tabs.map(t => t.name) ?? []}
            onSubmit={(name) => send({ type: 'addTab', name })}
            onCancel={() => setFormMode('idle')}
          />
        )}
      </div>
      <div id="bookmarks-grid">
        {formMode === 'addingBookmark' && (
          <InlineBookmarkForm
            existingTitles={data!.tabs.find(t => t.id === (activeTabId ?? data!.tabs[0]?.id))?.bookmarks.map(b => b.title) ?? []}
            onSubmit={(title, url) =>
              send({ type: 'addBookmark', tabId: activeTabId ?? data?.tabs[0]?.id ?? null, title, url })
            }
            onCancel={() => setFormMode('idle')}
          />
        )}
        {!hasTabs ? (
          <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 0', fontSize: '12px' }}>
            No tabs yet. Click <strong>+ Tab</strong> above to create one.
          </p>
        ) : (
          <BookmarkGrid
            bookmarks={data!.tabs.find(t => t.id === (activeTabId ?? data!.tabs[0]?.id))?.bookmarks ?? []}
            tabId={activeTabId ?? data!.tabs[0]?.id ?? ''}
            onOpen={(url) => send({ type: 'openUrl', url })}
            onRemove={(tabId, bookmarkId) => send({ type: 'removeBookmark', tabId, bookmarkId })}
          />
        )}
      </div>
    </>
  );
}
