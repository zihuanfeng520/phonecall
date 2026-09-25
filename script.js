(async function () {
  const screens = {
    lock: document.getElementById('lockScreen'),
    calling: document.getElementById('callingScreen'),
    phoneCall: document.getElementById('phoneCallScreen'),
    video: document.getElementById('videoScreen'),
    ending: document.getElementById('endingScreen'),
  };

  const avatarImg = document.getElementById('avatarImg');
  const callerNameEl = document.getElementById('callerName');
  const callingTextEl = document.getElementById('callingText');
  const bgLayer = document.getElementById('bgLayer');
  const bgLockLayer = document.getElementById('bgLockLayer');
  const bgPhoneLayer = document.getElementById('bgPhoneLayer');
  const bgLayerEnd = document.getElementById('bgLayerEnd');
  const endingTextEl = document.getElementById('endingText');

  const answerPhoneBtn = document.getElementById('answerPhoneBtn');
  const answerVideoBtn = document.getElementById('answerVideoBtn');
  const replayBtn = document.getElementById('replayBtn');

  const ringtoneAudio = document.getElementById('ringtoneAudio');
  const callVideo = document.getElementById('callVideo');
  const callAudio = document.getElementById('callAudio');

  // 鎖屏元素
  const lockTimeEl = document.getElementById('lockTime');
  const lockDateEl = document.getElementById('lockDate');
  const batteryFillEl = document.getElementById('batteryFill');
  const batteryPercentEl = document.getElementById('batteryPercent');
  const dayProgressFillEl = document.getElementById('dayProgressFill');
  const swipeHandle = document.getElementById('swipeHandle');
  const lockScreenEl = screens.lock;

  // 電話通話畫面元素
  const phoneAvatarImg = document.getElementById('phoneAvatarImg');
  const phoneCallerName = document.getElementById('phoneCallerName');
  const phoneCallerNumber = document.getElementById('phoneCallerNumber');
  const callDurationEl = document.getElementById('callDuration');
  const callClockEl = document.getElementById('callClock');
  const hangupBtn = document.getElementById('hangupBtn');
  const muteToggle = document.getElementById('muteToggle');
  const speakerToggle = document.getElementById('speakerToggle');
  const holdToggle = document.getElementById('holdToggle');

  let config = {};

  try {
    const res = await fetch('config.json', { cache: 'no-store' });
    config = await res.json();
  } catch (e) {
    console.error('讀取 config.json 失敗', e);
    return;
  }

  // ---------- 套用設定 ----------
  avatarImg.src = config.callerAvatar || '';
  phoneAvatarImg.src = config.callerAvatar || '';
  callerNameEl.textContent = config.callerName || '';
  phoneCallerName.textContent = config.callerName || '';
  phoneCallerNumber.textContent = config.callerPhone || '';
  callingTextEl.textContent = config.callingText || '邀請你視訊通話...';
  endingTextEl.textContent = config.endingText || '';

  // 四個畫面的背景各自獨立,沒設定就維持 CSS 預設的灰底,不互相 fallback
  if (config.lockBackground) bgLockLayer.style.backgroundImage = `url("${config.lockBackground}")`;
  if (config.callingBackground) bgLayer.style.backgroundImage = `url("${config.callingBackground}")`;
  if (config.phoneCallBackground) bgPhoneLayer.style.backgroundImage = `url("${config.phoneCallBackground}")`;
  if (config.endingBackground) bgLayerEnd.style.backgroundImage = `url("${config.endingBackground}")`;
  if (config.ringtone) {
    ringtoneAudio.src = config.ringtone;
    ringtoneAudio.load();
  }
  if (config.video) callVideo.src = config.video;
  if (config.callAudio) {
    callAudio.src = config.callAudio;
    callAudio.loop = !!config.loopCallAudio;
  }
  callVideo.loop = !!config.loopVideo;

  function showScreen(key) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[key].classList.add('active');
  }

  // ================= 鎖屏:即時時間 / 日期 / 星期 =================
  const weekdayNames = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];

  function pad(n) { return String(n).padStart(2, '0'); }

  function updateClock() {
    const now = new Date();
    lockTimeEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    lockDateEl.textContent = `${now.getMonth() + 1}月${now.getDate()}日 ${weekdayNames[now.getDay()]}`;

    // 通話畫面左上角時間(同步真實時間)
    if (callClockEl) callClockEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    // 今日進度條:00:00 = 0%,24:00 = 100%
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const msIntoDay = now.getTime() - startOfDay;
    const pct = Math.min(100, Math.max(0, (msIntoDay / 86400000) * 100));
    dayProgressFillEl.style.width = pct + '%';
  }
  updateClock();
  setInterval(updateClock, 1000);

  // ================= 鎖屏:電量 =================
  function setBatteryDisplay(pct) {
    const clamped = Math.min(100, Math.max(0, pct));
    batteryFillEl.style.width = clamped + '%';
    batteryPercentEl.textContent = Math.round(clamped) + '%';
  }
  const fallbackPct = typeof config.defaultBatteryPercent === 'number' ? config.defaultBatteryPercent : 99;
  setBatteryDisplay(fallbackPct);

  if (navigator.getBattery) {
    navigator.getBattery().then(battery => {
      const applyLevel = () => setBatteryDisplay(battery.level * 100);
      applyLevel();
      battery.addEventListener('levelchange', applyLevel);
    }).catch(() => { /* 抓不到,維持預設值 */ });
  }
  // 不支援 Battery API(多數桌機瀏覽器/iOS)則維持預設值,不再做其他嘗試

  // ================= 鎖屏:上滑解鎖手勢 =================
  let dragging = false;
  let startY = 0;
  let currentTranslate = 0;
  const UNLOCK_THRESHOLD_RATIO = 0.32; // 需滑超過螢幕高度的 32% 才算解鎖成功

  function getScreenHeight() { return window.innerHeight; }

  function onDragStart(clientY) {
    dragging = true;
    startY = clientY;
    lockScreenEl.classList.remove('unlocking', 'spring-back');
  }

  function onDragMove(clientY) {
    if (!dragging) return;
    let delta = clientY - startY; // 往上滑時為負值
    if (delta > 0) delta = 0; // 不允許往下拖出畫面
    currentTranslate = delta;
    lockScreenEl.style.transform = `translateY(${delta}px)`;
  }

  function onDragEnd() {
    if (!dragging) return;
    dragging = false;

    const dragged = Math.abs(currentTranslate);
    const threshold = getScreenHeight() * UNLOCK_THRESHOLD_RATIO;

    if (dragged >= threshold) {
      unlockSuccess();
    } else {
      // 未達門檻:回彈,不解鎖、不播放鈴聲
      lockScreenEl.classList.add('spring-back');
      lockScreenEl.style.transform = 'translateY(0)';
      currentTranslate = 0;
    }
  }

  function unlockSuccess() {
    lockScreenEl.classList.add('unlocking');
    lockScreenEl.style.transform = 'translateY(-100%)';

    // 解鎖動作是使用者手勢的直接延續,在此同步呼叫 play() 才符合瀏覽器自動播放政策
    ringtoneAudio.play().catch(() => {});

    const onTransitionEnd = () => {
      lockScreenEl.removeEventListener('transitionend', onTransitionEnd);
      showScreen('calling');
    };
    lockScreenEl.addEventListener('transitionend', onTransitionEnd);
  }

  swipeHandle.addEventListener('touchstart', e => onDragStart(e.touches[0].clientY), { passive: true });
  swipeHandle.addEventListener('touchmove', e => onDragMove(e.touches[0].clientY), { passive: true });
  swipeHandle.addEventListener('touchend', onDragEnd);

  // 桌機測試用滑鼠事件
  swipeHandle.addEventListener('mousedown', e => onDragStart(e.clientY));
  window.addEventListener('mousemove', e => onDragMove(e.clientY));
  window.addEventListener('mouseup', onDragEnd);

  // ================= 接聽:電話 / 視訊 =================
  function vibrateIfEnabled() {
    if (config.vibrateOnRing && navigator.vibrate) navigator.vibrate([200, 80, 200]);
  }

  function stopRingtone() {
    ringtoneAudio.pause();
    ringtoneAudio.currentTime = 0;
  }

  let callStartTime = null;
  let callTimerInterval = null;

  function startCallTimer() {
    callStartTime = Date.now();
    callDurationEl.textContent = '00:00';
    callTimerInterval = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - callStartTime) / 1000);
      const m = pad(Math.floor(elapsedSec / 60));
      const s = pad(elapsedSec % 60);
      callDurationEl.textContent = `${m}:${s}`;
    }, 1000);
  }

  function stopCallTimer() {
    clearInterval(callTimerInterval);
    callTimerInterval = null;
  }

  answerPhoneBtn.addEventListener('click', () => {
    vibrateIfEnabled();
    stopRingtone();
    showScreen('phoneCall');
    startCallTimer();
    callAudio.currentTime = 0;
    callAudio.play().catch(() => {});
  });

  answerVideoBtn.addEventListener('click', () => {
    vibrateIfEnabled();
    stopRingtone();
    showScreen('video');
    callVideo.currentTime = 0;
    callVideo.play().catch(() => {});
  });

  // ================= 電話通話畫面互動 =================
  function toggleGridItem(el) {
    el.classList.toggle('active');
  }
  muteToggle.addEventListener('click', () => toggleGridItem(muteToggle));
  speakerToggle.addEventListener('click', () => toggleGridItem(speakerToggle));
  holdToggle.addEventListener('click', () => toggleGridItem(holdToggle));

  hangupBtn.addEventListener('click', () => {
    callAudio.pause();
    stopCallTimer();
    showScreen('ending');
  });

  // ================= 影片播完 → 結尾畫面 =================
  callVideo.addEventListener('ended', () => {
    if (!config.loopVideo) showScreen('ending');
  });

  // 通話音檔播完(非循環時)也視為結束通話
  callAudio.addEventListener('ended', () => {
    if (!config.loopCallAudio) {
      stopCallTimer();
      showScreen('ending');
    }
  });

  // ================= 重新播放 =================
  replayBtn.addEventListener('click', () => {
    // 回到鎖屏,重新走一次完整流程
    lockScreenEl.classList.remove('unlocking', 'spring-back');
    lockScreenEl.style.transform = 'translateY(0)';
    showScreen('lock');
  });
})();
