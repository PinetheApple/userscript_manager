import { useEffect, useState } from 'react';
import { tabs } from '../shared/browser-api';

interface ICurrentTab {
  id: number | undefined;
  url: string | undefined;
  title: string | undefined;
}

export function useCurrentTab(): ICurrentTab {
  const [tab, setTab] = useState<ICurrentTab>({
    id: undefined,
    url: undefined,
    title: undefined,
  });

  function queryActive() {
    tabs.query({ active: true, currentWindow: true }).then(([activeTab]) => {
      if (activeTab) {
        setTab({ id: activeTab.id, url: activeTab.url, title: activeTab.title });
      }
    }).catch(console.error);
  }

  useEffect(() => {
    queryActive();

    const onActivated = (info: chrome.tabs.TabActiveInfo) => {
      tabs.get(info.tabId).then(t => {
        setTab({ id: t.id, url: t.url, title: t.title });
      }).catch(console.error);
    };

    const onUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, t: chrome.tabs.Tab) => {
      if (!t.active) return;
      if (changeInfo.status === 'complete' || changeInfo.url) {
        setTab({ id: t.id, url: t.url, title: t.title });
      }
    };

    tabs.onActivated.addListener(onActivated);
    tabs.onUpdated.addListener(onUpdated);
    return () => {
      tabs.onActivated.removeListener(onActivated);
      tabs.onUpdated.removeListener(onUpdated);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return tab;
}
