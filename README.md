# Phonecall

https://zihuanfeng520.github.io/phonecall/

模擬「視訊來電 → 接聽 → 播放影片」互動頁面的靜態網站範本。
純前端(HTML/CSS/JS),可直接部署到 GitHub Pages,不需要伺服器。

## 專案結構

```
phonecall/
├── index.html          # 主頁面(來電畫面 / 影片畫面 / 結尾畫面)
├── style.css            # 樣式與動畫
├── script.js             # 邏輯(讀取 config.json、控制畫面切換)
├── config.json           # ★ 你唯一需要編輯的設定檔
└── assets/
    ├── avatars/
    │   └── avatar.jpg    # 來電頭像圖片
    ├── bg/
    │   └── background.jpg # 背景圖(紅底祝福紋理之類)
    ├── audio/
    │   └── ringtone.mp3   # 鈴聲音效
    └── videos/
        └── message.mp4    # 接聽後播放的影片
```

## 如何放入你自己的素材

**你不需要修改 HTML/CSS/JS**,只要把檔案放進對應資料夾,並依需要調整
`config.json` 內的路徑與文字即可。

| 素材類型 | 放置路徑(檔名可自訂,但建議統一小寫英數) | 建議格式 |
|---|---|---|
| 頭像 | `assets/avatars/你的檔名.jpg` | jpg/png,建議正方形,至少 360×360px |
| 背景圖 | `assets/bg/你的檔名.jpg` | jpg/png,直向手機比例(建議 1080×1920 以上) |
| 鈴聲 | `assets/audio/你的檔名.mp3` | mp3,建議 5–15 秒可循環 |
| 影片 | `assets/videos/你的檔名.mp4` | mp4(H.264),檔案盡量壓縮,行動網路載入才不會太慢 |

### config.json 設定說明

```json
{
  "callerName": "顯示的來電者姓名",
  "callerAvatar": "assets/avatars/avatar.jpg",
  "backgroundImage": "assets/bg/background.jpg",
  "ringtone": "assets/audio/ringtone.mp3",
  "video": "assets/videos/message.mp4",
  "callingText": "邀請你視訊通話...",
  "endingText": "影片播完後顯示的祝福文字",
  "vibrateOnRing": true,
  "loopVideo": false
}
```

- `callerName` / `callingText` / `endingText`:畫面上顯示的文字,直接改字串即可
- `callerAvatar` / `backgroundImage` / `ringtone` / `video`:填入相對路徑(照上表放好檔案後,路徑對應更新即可)
- `vibrateOnRing`:是否在使用者按下接聽時觸發手機震動(僅支援部分行動瀏覽器)
- `loopVideo`:影片播完是否自動重播(`true`)或跳到結尾畫面(`false`)

> 若你想做「多個不同來電對象」的版本,可以複製整個資料夾為 `person-a/`、`person-b/`,
> 各自放一份 `config.json` 與 `assets/`,GitHub Pages 會依資料夾產生對應網址,
> 例如 `你的帳號.github.io/phonecall/person-a/`。

## 部署到 GitHub Pages

1. 將所有檔案 push 到 `phonecall` 這個 repo 的 `main` 分支
2. 到 repo 的 **Settings → Pages**
3. Source 選擇 `Deploy from a branch`,分支選 `main`,資料夾選 `/ (root)`
4. 儲存後,幾分鐘內即可透過
   `https://你的帳號.github.io/phonecall/`
   開啟頁面

## 本機測試

由於使用 `fetch()` 讀取 `config.json`,直接用瀏覽器開啟 `index.html`(`file://`)
在部分瀏覽器會因 CORS 限制而讀不到設定檔。建議用簡易本機伺服器測試,例如:

```bash
# 在 phonecall 資料夾內執行
python3 -m http.server 8000
```

然後瀏覽器開啟 `http://localhost:8000`。

## 注意事項

- 首次接聽鈴聲需要使用者互動(部分瀏覽器政策限制自動播放聲音),
  頁面載入時會嘗試自動播放,若失敗屬正常現象,不影響接聽後的影片播放。
- 請確保你放入的頭像、影片、音效等素材皆為你有權使用的內容(自己拍攝、取得授權,
  或使用開放授權素材),避免侵權或誤導他人的疑慮。
