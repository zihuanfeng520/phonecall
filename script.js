(async function () {
  const callingScreen = document.getElementById('callingScreen');
  const videoScreen = document.getElementById('videoScreen');
  const endingScreen = document.getElementById('endingScreen');

  const avatarImg = document.getElementById('avatarImg');
  const callerNameEl = document.getElementById('callerName');
  const callingTextEl = document.getElementById('callingText');
  const bgLayer = document.getElementById('bgLayer');
  const bgLayerEnd = document.getElementById('bgLayerEnd');
  const endingTextEl = document.getElementById('endingText');

  const answerBtn = document.getElementById('answerBtn');
  const replayBtn = document.getElementById('replayBtn');

  const ringtoneAudio = document.getElementById('ringtoneAudio');
  const callVideo = document.getElementById('callVideo');

  let config = {};

  // 讀取設定檔(套用你自己的頭像/姓名/影片路徑)
  try {
    const res = await fetch('config.json', { cache: 'no-store' });
    config = await res.json();
  } catch (e) {
    console.error('讀取 config.json 失敗', e);
    return;
  }

  // 套用內容
  avatarImg.src = config.callerAvatar || '';
  callerNameEl.textContent = config.callerName || '';
  callingTextEl.textContent = config.callingText || '邀請你視訊通話...';
  endingTextEl.textContent = config.endingText || '';
  if (config.backgroundImage) {
    bgLayer.style.backgroundImage = `url("${config.backgroundImage}")`;
    bgLayerEnd.style.backgroundImage = `url("${config.backgroundImage}")`;
  }
  if (config.ringtone) {
    ringtoneAudio.src = config.ringtone;
  }
  if (config.video) {
    callVideo.src = config.video;
  }
  callVideo.loop = !!config.loopVideo;

  // 嘗試自動播放鈴聲(部分瀏覽器需使用者手動互動才能出聲,失敗則忽略)
  ringtoneAudio.play().catch(() => {});

  function showScreen(el) {
    [callingScreen, videoScreen, endingScreen].forEach(s => s.classList.remove('active'));
    el.classList.add('active');
  }

  // 接聽
  answerBtn.addEventListener('click', () => {
    if (config.vibrateOnRing && navigator.vibrate) {
      navigator.vibrate([200, 80, 200]);
    }
    ringtoneAudio.pause();
    ringtoneAudio.currentTime = 0;

    showScreen(videoScreen);
    callVideo.play().catch(() => {});
  });

  // 影片播完 → 結尾畫面
  callVideo.addEventListener('ended', () => {
    if (!config.loopVideo) {
      showScreen(endingScreen);
    }
  });

  // 重新播放
  replayBtn.addEventListener('click', () => {
    showScreen(videoScreen);
    callVideo.currentTime = 0;
    callVideo.play().catch(() => {});
  });
})();
