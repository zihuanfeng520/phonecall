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
  const videoHangupBtn = document.getElementById('videoHangupBtn');
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

  // ===== 依背景圖亮度自動決定文字要黑字還是白字 =====
  // 把圖片畫進一張很小的 canvas(40x40 就夠了,不用整張原圖尺寸),
  // 讀出所有像素算加權平均亮度(人眼對綠色最敏感、藍色最不敏感,
  // 所以用 0.299R + 0.587G + 0.114B 這組常見的感知亮度公式),
  // 亮度偏高(圖片整體偏亮)→ 用深色文字;偏暗 → 用白色文字。
  function sampleImageBrightness(url, callback) {
    const img = new Image();
    img.onload = () => {
      try {
        const size = 40;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        let total = 0;
        for (let i = 0; i < data.length; i += 4) {
          total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }
        callback(total / (data.length / 4)); // 平均亮度,範圍 0~255
      } catch (e) {
        // 常見於圖片跨網域且該網域沒開放 CORS,瀏覽器會把 canvas 標記為「已汙染」
        // 禁止讀取像素資料;這種情況就放棄偵測,維持 CSS 預設白字
        console.error('讀取圖片亮度失敗(可能是跨網域圖片沒有 CORS 授權)', e);
        callback(null);
      }
    };
    img.onerror = () => callback(null);
    img.src = url;
  }

  function applyAdaptiveTextColor(screenEl, imageUrl) {
    if (!imageUrl) return; // 沒設定背景圖,維持 CSS 預設值,不用偵測
    sampleImageBrightness(imageUrl, (avgBrightness) => {
      if (avgBrightness === null) return;
      const isBright = avgBrightness > 150;
      const textColor = isBright ? '#1a1a1a' : '#ffffff';
      // 給半透明的裝飾元件(進度條軌道等)用的「25% 透明度版本」
      const textColor25 = isBright ? 'rgba(26,26,26,.25)' : 'rgba(255,255,255,.25)';
      screenEl.style.setProperty('--text-color', textColor);
      screenEl.style.setProperty('--text-color-25', textColor25);
    });
  }

  applyAdaptiveTextColor(screens.lock, config.lockBackground);
  applyAdaptiveTextColor(screens.calling, config.callingBackground);
  applyAdaptiveTextColor(screens.phoneCall, config.phoneCallBackground);
  applyAdaptiveTextColor(screens.ending, config.endingBackground);
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

  // ================= 鎖屏:上滑解鎖手勢(改用淡出淡入,不做方向性平移揭示) =================
  let dragging = false;
  let startY = 0;
  let dragDelta = 0; // 往上拖為負值
  const UNLOCK_THRESHOLD_RATIO = 0.28; // 需滑超過螢幕高度的 28% 才算解鎖成功

  function getThresholdPx() { return window.innerHeight * UNLOCK_THRESHOLD_RATIO; }
  function getProgress() { return Math.min(1, Math.abs(dragDelta) / getThresholdPx()); }

  // 保險機制:transitionend 在「數值其實沒有變化」時不會觸發(例如拖曳過程
  // 已經把透明度即時降到 0,放開手時再設一次同樣的 0,瀏覽器不會視為有變化)。
  // 這裡改成「動畫真的結束」或「時間到了」兩者取先發生的那個,一定會執行收尾,
  // 避免鎖屏卡成一層看不見但還擋著點擊的透明層。
  function afterTransition(el, fallbackMs, callback) {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      el.removeEventListener('transitionend', onEnd);
      clearTimeout(timer);
      callback();
    };
    const onEnd = (e) => { if (e.target === el) finish(); };
    el.addEventListener('transitionend', onEnd);
    const timer = setTimeout(finish, fallbackMs);
  }

  function onDragStart(clientY) {
    dragging = true;
    startY = clientY;
    dragDelta = 0;

    // 放開手才會有的過渡動畫先清掉,確保拖曳當下是 1:1 跟手指走、沒有動畫延遲
    lockScreenEl.classList.remove('animating');
    swipeHandle.classList.remove('snap');
    screens.calling.classList.remove('crossfading');

    // 響鈴畫面先墊在底下(opacity:0),拖曳時兩層用透明度做溶接,不是平移揭示,
    // 所以不會有「畫面下緣的按鈕先被曝出來」的方向性問題。
    screens.calling.classList.add('active');
    screens.calling.style.opacity = '0';
  }

  function applyDragVisuals() {
    const progress = getProgress(); // 0~1
    lockScreenEl.style.opacity = String(1 - progress);
    lockScreenEl.style.transform = `scale(${1 + progress * 0.03})`;
    screens.calling.style.opacity = String(progress);
    swipeHandle.style.transform = `translateY(${Math.max(dragDelta, -90)}px)`;
  }

  function onDragMove(clientY) {
    if (!dragging) return;
    let delta = clientY - startY;
    if (delta > 0) delta = 0; // 不允許往下拖
    dragDelta = delta;
    applyDragVisuals();
  }

  function onDragEnd() {
    if (!dragging) return;
    dragging = false;

    if (getProgress() >= 1) {
      unlockSuccess();
    } else {
      springBack();
    }
  }

  function springBack() {
    // 未達門檻:淡回滿版鎖屏,不解鎖、不播放鈴聲
    lockScreenEl.classList.add('animating');
    swipeHandle.classList.add('snap');
    lockScreenEl.style.opacity = '1';
    lockScreenEl.style.transform = 'scale(1)';
    swipeHandle.style.transform = 'translateY(0)';
    screens.calling.classList.add('crossfading');
    screens.calling.style.opacity = '0';

    afterTransition(lockScreenEl, 350, () => {
      lockScreenEl.classList.remove('animating');
      screens.calling.classList.remove('active', 'crossfading');
      screens.calling.style.opacity = '';
    });
  }

  function unlockSuccess() {
    // 達門檻:確定要解鎖了 → 立刻讓鎖屏不再吃點擊事件,
    // 避免它變成看不見但還蓋在上面、擋住下面按鈕的透明層
    lockScreenEl.style.pointerEvents = 'none';

    // 繼續淡到底,鎖屏完全透明、響鈴畫面完全不透明
    lockScreenEl.classList.add('animating');
    swipeHandle.classList.add('snap');
    lockScreenEl.style.opacity = '0';
    lockScreenEl.style.transform = 'scale(1.03)';
    screens.calling.classList.add('crossfading');
    screens.calling.style.opacity = '1';

    // 解鎖動作是使用者手勢的直接延續,在此同步呼叫 play() 才符合瀏覽器自動播放政策
    ringtoneAudio.play().catch(() => {});

    afterTransition(lockScreenEl, 350, () => {
      lockScreenEl.classList.remove('animating');
      lockScreenEl.style.opacity = '';
      lockScreenEl.style.transform = '';
      lockScreenEl.style.pointerEvents = '';
      screens.calling.classList.remove('crossfading');
      screens.calling.style.opacity = '';
      showScreen('calling');
    });
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
  let holdPausedAt = null; // 暫停通話的當下時間點,用來把暫停期間從總秒數扣掉

  function tickDuration() {
    const elapsedSec = Math.floor((Date.now() - callStartTime) / 1000);
    const m = pad(Math.floor(elapsedSec / 60));
    const s = pad(elapsedSec % 60);
    callDurationEl.textContent = `${m}:${s}`;
  }

  function startCallTimer() {
    callStartTime = Date.now();
    callDurationEl.textContent = '00:00';
    callTimerInterval = setInterval(tickDuration, 1000);
  }

  function stopCallTimer() {
    clearInterval(callTimerInterval);
    callTimerInterval = null;
  }

  // ===== 暫停通話:計時器停止 + 通話音檔暫停,再按一次恢復兩者 =====
  function pauseCallForHold() {
    holdPausedAt = Date.now();
    clearInterval(callTimerInterval);
    callTimerInterval = null;
    callAudio.pause();
  }

  function resumeCallFromHold() {
    if (holdPausedAt !== null) {
      // 把暫停期間的時長補回 callStartTime,秒數才會接著暫停前繼續算,不會多跳
      callStartTime += (Date.now() - holdPausedAt);
      holdPausedAt = null;
    }
    callAudio.play().catch(() => {});
    callTimerInterval = setInterval(tickDuration, 1000);
  }

  // ===== 擴音:用 Web Audio 的 GainNode 做訊號放大,一般 audio.volume 最大只能到
  // 原始音量的 100%,沒辦法「比平常大聲」,只有走這條路才能真的放大超過 100% =====
  let audioCtx = null;
  let gainNode = null;
  let audioGraphReady = false;

  function ensureAudioGraph() {
    if (audioGraphReady) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
      const source = audioCtx.createMediaElementSource(callAudio);
      gainNode = audioCtx.createGain();
      gainNode.gain.value = 1; // 預設 = 原始音量
      source.connect(gainNode).connect(audioCtx.destination);
      audioGraphReady = true;
    } catch (e) {
      console.error('無法建立音量增益節點,擴音將維持原本音量', e);
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  }

  answerPhoneBtn.addEventListener('click', () => {
    vibrateIfEnabled();
    stopRingtone();
    showScreen('phoneCall');
    startCallTimer();
    ensureAudioGraph(); // 必須在使用者手勢(這次點擊)當下建立,瀏覽器才允許出聲
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

  // 靜音:僅視覺切換(這裡指的是「靜音麥克風」,網頁本來就不會收音,故無實際功能)
  muteToggle.addEventListener('click', () => toggleGridItem(muteToggle));

  // 擴音:切換 GainNode 的放大倍率,開啟時比原始音量大 50%
  speakerToggle.addEventListener('click', () => {
    const isOn = speakerToggle.classList.toggle('active');
    if (gainNode) {
      gainNode.gain.value = isOn ? 1.5 : 1;
    }
  });

  // 暫停通話:真的暫停計時器 + 暫停音檔,再按一次恢復
  holdToggle.addEventListener('click', () => {
    const isHeld = holdToggle.classList.toggle('active');
    if (isHeld) {
      pauseCallForHold();
    } else {
      resumeCallFromHold();
    }
  });

  function endPhoneCall() {
    callAudio.pause();
    stopCallTimer();
    holdPausedAt = null;
    holdToggle.classList.remove('active');
    speakerToggle.classList.remove('active');
    muteToggle.classList.remove('active');
    if (gainNode) gainNode.gain.value = 1;
    showScreen('ending');
  }

  hangupBtn.addEventListener('click', endPhoneCall);

  // ================= 視訊畫面:掛斷 =================
  videoHangupBtn.addEventListener('click', () => {
    callVideo.pause();
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
    // 回到鎖屏,重新走一次完整流程,並清掉所有拖曳/動畫留下的行內樣式
    lockScreenEl.classList.remove('animating');
    lockScreenEl.style.opacity = '';
    lockScreenEl.style.transform = '';
    lockScreenEl.style.pointerEvents = '';
    swipeHandle.classList.remove('snap');
    swipeHandle.style.transform = '';
    screens.calling.classList.remove('active', 'crossfading');
    screens.calling.style.opacity = '';
    showScreen('lock');
  });
})();
