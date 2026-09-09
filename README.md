# DDL Planner

A responsive student planner with a focus dashboard, assignment CRUD, courses, month calendar, agenda, filters, completion and progress, and device-local persistence.

## Run locally

Requires Node.js 22.13 or newer.

```sh
npm install
npm run dev
```

Open the Local URL shown in the terminal (normally http://localhost:3000).

```sh
npx tsc --noEmit
npm run build
```

The project uses React, TypeScript, Tailwind, shadcn/Base UI, Lucide, and the Sites Vinext implementation of the Next.js App Router. It requires no database or account for planner data.

## Structure

- `app/page.tsx`: app state and navigation
- `components/planner/`: editors, dashboard, calendar, agenda and shared controls
- `types/planner.ts`: models and replaceable product name
- `lib/storage.ts`: storage adapter and relative-date demo seed
- `lib/urgency.ts`: overdue-first ranking using deadline, priority and remaining work
- `lib/dates.ts`: local calendar dates and formatting

`ddl-planner-v1` in localStorage is the data boundary. Replace the storage adapter to integrate a remote database. Data stays in one browser on one device. Clearing browser data removes it. Seed data is created only when the storage key is absent. Course deletion confirms how many assignments will also be deleted.

Month view is included. Week view, accounts, sync, and dark mode are intentionally outside this MVP. Theme variables are centralized for future styling.

## Verification

TypeScript compilation and production build; browser checks for creating/editing assignments, deadline changes reflected in the calendar, progress updates, completion and status filters, deleting assignments and courses with confirmation, course creation, persistence after refresh, and mobile navigation/layout at 390px. Temporary test records removed. WebMCP start-assignment tool checked with valid and invalid input.

## 中文界面与完成流程更新

- 界面标签与日期使用简体中文；现有课程名称、作业标题、备注和 ID 原样保留。
- 沿用 `ddl-planner-v1`。新增可选字段 `previousStatus`、`previousProgress`、`completedAt`，读取已有数据时无需迁移或重写。
- 勾选后立即保存完成状态，保留 420ms 的过渡，再移出待完成列表；8 秒内可从提示点击“撤销”。
- “作业 → 已完成”可随时搜索、筛选和恢复任务；恢复时保留完成前的状态与进度。
- 旧版已完成任务没有完成时间时，不会被虚构为今天完成；仍可在已完成列表查找，缺少历史状态时恢复为未开始。
- 首页新增“今天已完成”折叠区。删除仍需要独立确认。

运行回归测试（Node.js 22.13+）：

```sh
node --experimental-strip-types --test tests/completion.test.mjs
```

本次浏览器验证涵盖：创建作业、40% 进度、420ms 完成反馈、立即撤销、提示消失后恢复、完成后刷新、恢复后刷新、已完成搜索、旧记录保留、日历日期预选、中文界面与手机布局。测试使用单独创建的临时作业；该测试记录已清理。

## GitHub Pages

发布地址：https://briannac2006.github.io/ddl-planner/

推送到 main 后，GitHub Actions 自动构建并部署。仓库 Settings → Pages 的 Source 使用 GitHub Actions。

```sh
npm run build:pages
```

静态文件输出到 `out/`，部署路径为 `/ddl-planner/`。默认本地运行方式保持不变。
课程和作业仅保存在当前网址的浏览器 localStorage，不上传到 GitHub，也不会跨设备同步。localhost 的数据不会自动转移到线上网址。
