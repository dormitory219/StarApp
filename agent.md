# StarApp Agent Notes

## Project

StarApp is a mobile-first static H5 clone inspired by the Xingmubiao app. It runs without login or registration and stores all user data in browser localStorage.

## Current Behavior

- Default child profile: `乐乐`, age `5`.
- Initial stars: `0`.
- Main tabs: 首页, 专注, 目标, 心愿, 成长, 家庭.
- 首页今日任务 supports scoring and starting focus timers. Delete actions are intentionally hidden from the home task cards.
- 目标库 keeps goal management, including stopping/deleting goals.
- 番茄钟 is a dedicated 专注 tab, defaulting to `14` minutes with adjustable presets and range controls.
- Default goals include:
  - 算术题
  - 小怪兽学英语
  - 拼音学习
  - 儿童1300字打卡
  - 阅读 20 分钟
  - 整理书包
  - 运动打卡

## Local Run

Serve the app from the repository root:

```sh
python3 -m http.server 4173 --bind 0.0.0.0
```

Local URL:

```text
http://127.0.0.1:4173/
```

LAN URL depends on the machine IP, previously:

```text
http://192.168.3.223:4173/
```

## Cache

`index.html` uses a query string on `assets/js/app.js` to force browser cache refresh. Bump the version after JavaScript changes.

## Data Reset

The app uses `star_wish_growth_state_v3` in localStorage. The reset button removes current and older app storage keys.
