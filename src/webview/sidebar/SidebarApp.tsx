import React, { useState, useEffect } from 'react';
import { PortalData, Tab } from './types';
import { Header } from './components/Header/Header';
import { TabBar } from './components/TabBar/TabBar';

declare function acquireVsCodeApi(): { postMessage: (msg: unknown) => void };
const vscode = acquireVsCodeApi();

let _pendingData: PortalData | null = null;
let _onData: ((d: PortalData) => void) | null = null;

window.addEventListener('message', (e: MessageEvent) => {
  if (e.data?.type !== 'update') return;
  const d = e.data.data as PortalData;
  if (_onData) {
    _onData(d);
  } else {
    _pendingData = d;
  }
});

export function SidebarApp() {
  const [data, setData] = useState<PortalData | null>(null);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  useEffect(() => {
    _onData = (incoming) => {
      setData(incoming);
      setActiveTabId(prev => {
        if (!prev || !incoming.tabs.find((t: Tab) => t.id === prev)) {
          return incoming.tabs[0]?.id ?? null;
        }
        return prev;
      });
    };
    if (_pendingData) {
      _onData(_pendingData);
      _pendingData = null;
    }
    vscode.postMessage({ type: 'ready' });
    return () => { _onData = null; };
  }, []);

  const send = (msg: unknown) => vscode.postMessage(msg);

  if (!data || data.tabs.length === 0) {
    return (
      <div id="app">
        <Header
          onAddTab={() => send({ type: 'addTab' })}
          onAddBookmark={() => send({ type: 'addBookmark', tabId: null })}
        />
        <div id="tabs-bar" />
        <div id="bookmarks-grid">
          <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 0', fontSize: '12px' }}>
            No tabs yet. Click <strong>+ Tab</strong> above to create one.
          </p>
        </div>
      </div>
    );
  }

  const currentTabId = activeTabId ?? data.tabs[0].id;
  const activeTab = data.tabs.find(t => t.id === currentTabId);

  return (
    <div id="app">
      <Header
        onAddTab={() => send({ type: 'addTab' })}
        onAddBookmark={() => send({ type: 'addBookmark', tabId: currentTabId })}
      />
      <TabBar
        tabs={data.tabs}
        activeTabId={currentTabId}
        onSelect={setActiveTabId}
        onRemove={(tabId) => send({ type: 'removeTab', tabId })}
      />
      <div id="bookmarks-grid">
        {(activeTab?.bookmarks ?? []).length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 0', fontSize: '12px' }}>
            No bookmarks yet. Click <strong>+ Bookmark</strong> above to add one.
          </p>
        ) : (
          activeTab!.bookmarks.map(bm => (
            <div
              key={bm.id}
              data-testid="bookmark-card"
              onClick={() => send({ type: 'openUrl', url: bm.url })}
            >
              <div data-testid="bookmark-icon">
                {bm.icon.startsWith('data:')
                  ? <img src={bm.icon} alt="" />
                  : bm.icon || '🌐'}
              </div>
              <div data-testid="bookmark-title">{bm.title}</div>
              <button
                data-testid="bookmark-remove"
                onClick={e => {
                  e.stopPropagation();
                  send({ type: 'removeBookmark', tabId: currentTabId, bookmarkId: bm.id });
                }}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
