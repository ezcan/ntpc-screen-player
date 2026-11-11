# 2026 臺灣教育科技展｜新北展區

Vue 3 + TypeScript + Vite 的單頁投影播放器，使用 Composition API 與 `<script setup>`。主標語為「新北教育｜玩出 AI 好點子」。所有展示資料隨程式一起打包，可部署為純靜態網站。

## 1. 啟動與建置

建議使用 Node.js 24 LTS（最低 24.0；亦支援 Node.js 22.12 以上的 22.x）。

```sh
npm install
npm run dev
```

開啟終端機顯示的網址，預設為 `http://localhost:5173/`。

```sh
npm run build
npm run preview
```

`build` 會先執行 TypeScript 型別檢查，產出 `dist/`。將整個 `dist/` 上傳至任意靜態網站主機即可；Vite 的 `base: './'` 支援部署於子目錄。請透過 HTTP(S) 開啟網站。

## GitHub Pages 發布

網站網址：<https://ezcan.github.io/ntpc-screen-player/>

指定展示單位範例：<https://ezcan.github.io/ntpc-screen-player/?unit=jinshan-hs>

`.github/workflows/pages.yml` 會在推送到 `main` 時，自動安裝鎖定版本的套件、執行單元測試與 TypeScript 檢查、建置後發布至 GitHub Pages。也可在 GitHub 的 Actions 頁面手動執行。GitHub Pages 的發布來源使用 **GitHub Actions**。

發布流程使用 `npm run build -- --base=/ntpc-screen-player/`，確保專案子路徑的 JavaScript 與 CSS 網址正確；本機開發與一般靜態建置仍沿用相對路徑設定。後續修改資料或樣式後，提交並推送到 `main` 即可自動更新網站，不需手動上傳 `dist/`。

## 2. 修改展示單位資料

編輯 `src/data/exhibits.ts`，已完整收錄提供的 30 筆展示資料。每筆資料：

| 欄位 | 說明 |
| --- | --- |
| `id` | 唯一且穩定的網址識別字，例如 `sanmin-hs` |
| `unitName` | 展示單位名稱 |
| `unitType` | `school` 或 `organization`，介面統一稱「展示單位」 |
| `theme` | 展示主題 |
| `zoneId` | 展區識別字，見下表 |
| `order` | 排序數字，由小到大；同序號依 `id` 排序 |
| `subcategory` | 選填，設定後會在舞台的展區旁顯示 |
| `highlightTerms` | 選填，主題中要劃記的原文詞組；設定後取代預設重點詞，空陣列代表不劃記 |

修改資料後重新執行 `npm run build`，再上傳 `dist/`。無資料時舞台與選單會顯示空狀態，切換與輪播停用。

## 3. 設定 zoneId

目前資料依你後續確認，保留工作目錄中既有的四區分類。程式只讀取明確設定的 `zoneId`，不會依主題文字推測分類；尚未決定展區時設為 `unassigned`。只要修改各筆 `zoneId`，選單會自動重組並更新數量。

| zoneId | 展區名稱 |
| --- | --- |
| `future-ai` | AI 教學 |
| `future-digital` | 數位學習 |
| `maker` | 科技手作 |
| `cross-disciplinary` | 跨域探究 |
| `service` | 預留型別；啟用前須在 `zones.ts` 新增展區設定 |
| `unassigned` | 待分類 |

目前前四個展區固定顯示，「待分類」有資料時顯示。可在 `src/data/zones.ts` 調整名稱；如需啟用預留的 `service`，在陣列加入 `{ id: 'service', name: '服務專區', alwaysVisible: false }` 即可。程式的資料邊界會將缺少、未在 `zones.ts` 設定或無效的 `zoneId` 歸入「待分類」；正式資料型別仍要求填入有效值，讓 TypeScript 能提早發現錯字。

「全部展區」是方便跨區搜尋的篩選選項。分區與關鍵字會共同篩選清單；搜尋涵蓋名稱與主題，英文不區分大小寫。改變篩選時保留目前投影，點選展示單位後才切換並收起選單。「上一個／下一個展示單位」及輪播只按照目前篩選結果的排序循環；目前投影不在結果中時，下一個從第一筆、上一個從最後一筆開始。零筆結果時維持舞台並停用切換。

## 4. 用網址指定展示單位

```text
http://localhost:5173/?unit=sanmin-hs
http://localhost:5173/?unit=smart-learning-team&autoplay=true&interval=20
http://localhost:5173/?unit=beitao-jin-team&autoplay=false&interval=15
```

| 參數 | 預設與規則 |
| --- | --- |
| `unit` | 展示單位 `id`；未提供或不存在時回到排序後第一筆 |
| `autoplay` | 僅 `true` 啟用；預設 `false` |
| `interval` | 1～3600 的整數秒數；未提供或不合法時為 15 秒 |

切換後會以 `URLSearchParams` 與 `history.replaceState` 更新網址，重新整理可還原目前投影、輪播開關與秒數。無效參數會正規化；其他 query 與 hash 會保留。搜尋與分區為當前分頁的暫時狀態，重新載入後回到全部展區。

不同大螢幕各自開啟不同 `unit` 網址即可獨立播放。分頁間沒有同步機制，也不使用共用儲存狀態。

## 5. 投影與全螢幕

1. 在 16:9 螢幕開啟網站，預設直接顯示一個展示單位。
2. 點右下角「展示單位選單」或按 `M` 開啟控制抽屜。
3. 選擇展區與展示單位；選單會自動收起。
4. 按 `F`，或在選單中點「進入全螢幕」。全螢幕須由使用者操作啟動，瀏覽器不允許網址自動啟用全螢幕。
5. 再按 `F` 或使用瀏覽器的 `Esc` 可離開全螢幕。系統會監聽瀏覽器全螢幕狀態；不支援 API 或請求失敗時顯示說明。

| 快捷鍵 | 功能 |
| --- | --- |
| `←` / `→` | 上一個／下一個展示單位 |
| `M` | 顯示／隱藏選單 |
| `F` | 切換全螢幕 |
| `Space` | 開啟／關閉自動輪播 |
| `Esc` | 關閉選單 |

輸入搜尋文字、秒數、使用輸入法組字時不觸發快捷鍵。原生抽屜仍支援 `Esc` 關閉。按鈕可用 `Enter` 操作；`Tab` 在選單內移動，關閉時恢復先前焦點。

自動輪播預設關閉，預設每 15 秒切換。開啟選單或分頁隱藏時暫停；關閉／返回後從完整間隔重新計時。手動切換或更改秒數也會重設計時。篩選結果無可切換對象時暫停。輪播時關閉舞台的螢幕閱讀器自動播報，手動切換則使用禮貌播報。

舞台鎖定視窗高度、不可捲動；控制抽屜可以獨立捲動。16:9 為主要投影比例，另外支援平板與手機操作。

背景預設播放 18 顆柔焦散景光點，以 7～14 秒的不同節奏從下方上飄，輕微左右偏移，淡入後在頂端淡出。控制選單內可按「暫停背景光點」／「播放背景光點」，與展示單位自動輪播各自控制。暫停會停在目前位置，恢復或切換展示單位時不重新開始。系統啟用減少動態效果時，隱藏光點並保留靜態暖色背景。

展示主題預設自動依序劃記重點詞：每次用約 0.55 秒從左向右劃過帶斜角、位置偏下的色帶，停留後收回並切換下一詞。色帶沿用網站深藍，覆蓋到的文字同步轉為既有奶油白，避免劃到一半時文字失去對比。主題原文、標點與搜尋資料完整保留。

滑鼠移動或點擊會優先接管並停止自動序列；指向重點詞時劃記，滑開時收回。沒有指向重點詞且閒置 4 秒後恢復循環，即使游標停在主題旁的空白區也能恢復。觸控不會模擬滑鼠懸停。重點詞也可用 `Tab` 聚焦並保持劃記；滑鼠點擊造成的焦點不會鎖住色帶，重新移動滑鼠時會接管原本的鍵盤選取。控制選單內的「暫停主題劃記」獨立控制此自動序列，選單開啟或分頁隱藏時也會暫停。系統偏好減少動態效果時停用自動劃記，滑鼠或鍵盤指定的劃記直接呈現靜態結果。

## 設計師接手

主視覺依提供的配色參考圖，採用奶油白、暖黃、橘、粉紅與淺藍，搭配深藍置中標題。畫面四周為柔色背景與 CSS 散景光點，中央加上靜態亮色閱讀層，維持標題對比。主題使用淺藍底色；維持瀏覽器內建字型。套用 ui-ux-pro-max 的可見焦點、輸入保護與減少動態效果等互動原則。

色彩、字型、字級、圓角、間距、面板尺寸、切換時間等集中於 `src/styles/theme.css` 的 CSS variables。`base.css` 負責結構與響應式排版。

散景設定也集中於 `theme.css`。`--ambient-background` 調整背景配色，`--ambient-reading-veil` 調整中央文字區的亮色遮罩；每一個 `.bokeh-light:nth-child(...)` 使用以下變數：

| 變數 | 用途 |
| --- | --- |
| `--bokeh-size`、`--bokeh-x` | 光點尺寸與初始水平位置 |
| `--bokeh-duration`、`--bokeh-delay` | 上飄週期與負延遲，讓進場時已有分散的光點 |
| `--bokeh-drift`、`--bokeh-sway` | 最終與中途的水平偏移 |
| `--bokeh-opacity`、`--bokeh-blur` | 最大透明度與柔焦程度 |
| `--bokeh-color` | 光點顏色，引用共用配色變數 |

`AmbientBokeh.vue` 只建立裝飾元素，動畫由 CSS 的 `bokeh-rise` keyframes 驅動，沒有動畫計時器、額外套件或圖片素材。光點層位於文字後方、不接受滑鼠事件，且不進入無障礙樹。

主題預設重點詞集中在 `src/data/themeHighlights.ts`，依展示單位 ID 設定；也可直接在該筆展示資料加入 `highlightTerms` 覆寫。詞組必須包含於 `theme` 原文，找不到的詞會略過；沒有重點詞的資料會正常顯示全文。重疊詞組在同一位置以較長者優先，避免巢狀標記。`ExhibitTheme.vue` 以單一文字節點搭配 `<mark>` 和分層背景呈現同步反色，沒有重複的隱藏文字。

劃記可在 `theme.css` 調整 `--highlight-duration`（畫筆過場）、`--highlight-hold`（含畫入的停留時間）、`--highlight-gap`（含收回的間隔）、`--highlight-start`（初始延遲）、`--highlight-idle`（滑鼠閒置時間）與 `--highlight-proximity`（附近範圍，以 px 設定）。色彩由 `--highlight-color` 與 `--highlight-on-color` 引用既有色票；色帶高度、位置及斜角也使用 `--highlight-*` 變數。計時、事件與動畫影格會在切換單位時清理。

保留以下覆寫入口：

```css
.app-shell
.projection-stage
.ambient-layer
.exhibit-meta
.exhibit-unit-name
.exhibit-theme
.control-panel
.zone-menu
.unit-menu
.is-menu-open
.is-fullscreen
.is-motion-enabled
```

`.ambient-layer` 保留為可覆寫的背景入口，`.is-ambient-paused` 控制光點的 `animation-play-state`。展示單位切換使用 Vue `<Transition mode="out-in">`，先淡出再淡入，避免兩個標題交疊；預設 class 為 `.exhibit-enter-active`、`.exhibit-enter-from`、`.exhibit-leave-active`、`.exhibit-leave-to`。可覆寫 class 或調整 `ExhibitStage` 的 `transitionName` prop 更換動畫。前後展示框使用固定定位範圍避免版面跳動；`prefers-reduced-motion: reduce` 會關閉過場與 CSS 動態，並即時回應系統偏好變更。即使偏好減少動態，網址或使用者明確開啟的輪播仍可播放。

## 檔案結構

```text
src/
  types/exhibit.ts
  data/zones.ts
  data/exhibits.ts
  data/themeHighlights.ts
  composables/useExhibitController.ts
  composables/useThemeHighlighter.ts
  utils/themeSegments.ts
  components/ExhibitStage.vue
  components/ExhibitTheme.vue
  components/AmbientBokeh.vue
  components/ExhibitMenu.vue
  components/ProjectionControls.vue
  styles/base.css
  styles/theme.css
  App.vue
  main.ts
tests/
  unit/controller.test.ts
  unit/highlighter.test.ts
  e2e/player.spec.ts
  e2e/highlighter.spec.ts
```

## 驗證

```sh
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
```

瀏覽器測試自動啟動本機 Vite，涵蓋網址還原、搜尋與循環切換、輸入保護、輪播計時、選單焦點、全螢幕、減少動態效果、背景光點暫停／恢復、主題劃記循環與滑鼠接管，以及多種螢幕尺寸的內容邊界。若要使用已安裝的 Chrome，可設定 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 為瀏覽器執行檔完整路徑。

實作參照：[Vite 靜態部署文件](https://vite.dev/guide/static-deploy.html)、[Vue Transition 文件](https://vuejs.org/guide/built-ins/transition.html)。
