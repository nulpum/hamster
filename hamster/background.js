const MAX_SEC = 28800;
const IDLE_SEC = 1800; // 30分無操作で離席と判断

chrome.runtime.onInstalled.addListener(() => {
  chrome.idle.setDetectionInterval(IDLE_SEC);
  chrome.storage.local.get('lastTimestamp', (d) => {
    if (!d.lastTimestamp) {
      chrome.storage.local.set({ fatigue: 0, lastTimestamp: Date.now(), isIdle: false });
    }
  });
  chrome.alarms.create('tick', { periodInMinutes: 1 });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.idle.setDetectionInterval(IDLE_SEC);
  chrome.alarms.create('tick', { periodInMinutes: 1 });
});

// PCのアクティブ状態が変化したとき
chrome.idle.onStateChanged.addListener((newState) => {
  const newIsIdle = newState !== 'active';
  const now = Date.now();

  chrome.storage.local.get(['fatigue', 'lastTimestamp', 'isIdle'], (d) => {
    const dt = Math.min((now - (d.lastTimestamp || now)) / 1000, 300);
    let fatigue = d.fatigue || 0;
    const wasIdle = d.isIdle ?? false;

    // 変化前の状態で時間を適用
    if (!wasIdle) fatigue = Math.min(MAX_SEC, fatigue + dt);
    else          fatigue = Math.max(0, fatigue - dt);

    chrome.storage.local.set({ fatigue, lastTimestamp: now, isIdle: newIsIdle });
  });
});

// 1分ごとに疲労を更新（content scriptが動いていないとき用）
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== 'tick') return;
  const now = Date.now();

  chrome.storage.local.get(['fatigue', 'lastTimestamp', 'isIdle'], (d) => {
    const timeSinceLast = (now - (d.lastTimestamp || 0)) / 1000;
    // content scriptが90秒以内に更新していれば二重計上を避けてスキップ
    if (timeSinceLast < 90) return;

    const dt = Math.min(timeSinceLast, 300);
    let fatigue = d.fatigue || 0;
    const isIdle = d.isIdle ?? false;

    if (!isIdle) fatigue = Math.min(MAX_SEC, fatigue + dt);
    else         fatigue = Math.max(0, fatigue - dt);

    chrome.storage.local.set({ fatigue, lastTimestamp: now });
  });
});
