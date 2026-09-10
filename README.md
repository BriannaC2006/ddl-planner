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

## 循环作业与中英文切换

在作业表单中选择「重复」，支持每天、每周、每两周、自定义每 N 天／周，多星期选择，以及结束日期或次数（无需同时填写）。每个系列最多 366 次；必须指定一种结束方式，超出范围会提示缩短，不会静默截断。设置 → 语言可立即切换中文／English，默认中文。

### 数据与兼容性

继续使用 `ddl-planner-v1`，无需破坏性迁移。旧记录没有新增字段时仍作为普通作业读取，加载时不会重新生成循环记录。语言单独保存为 `ddl-planner-language`，不会修改课程名、作业标题、备注或完成历史。

`PlannerData.recurrenceSeries` 为可选系列定义数组，每项有稳定 `id`、语言无关的 `rule`（frequency / unit / interval / weekdays / endDate 或 count）、本地时间锚点 `startDate`、模板与 `excludedIndices`。系列定义不计入统计；所有可见记录仍在 `assignments` 中。

每次作业有自己的 `id`、状态、进度与完成元数据，以及可选的 `recurrenceSeriesId`、`occurrenceIndex`、`originalOccurrenceDate`、`recurrenceRule`、`recurrenceException`。单次编辑设置例外标记并保留系列关联。日期调整按原槽位关联已有记录，保留身份和独立进度；之后的日期规则修改会拆分系列，之前的作业保持不变。过去与已完成的作业保留完成状态、进度和日期，作为例外保留。已删除槽位记录在排除列表中，避免后续调整把它们重新生成。

「复制到下周」在本地日历上加 7 天，复制内容，清空完成／进度和所有系列关联。日期计算按本地日历推进，跨夏令时仍保持正常截止时刻。浏览器存储本身仍不跨设备同步。

### 主要文件

- `lib/recurrence.ts`、`types/planner.ts`：生成、范围编辑／删除、复制与系列数据类型。
- `hooks/use-planner.ts`：原有保存／完成流程与循环操作集成。
- `components/planner/recurrence-controls.tsx`、`editors.tsx`：重复规则、预览、编辑范围与复制操作。
- `app/page.tsx`：删除范围、设置语言切换与操作通知。
- `lib/i18n.ts`、`lib/translations.json`、`hooks/use-language.ts`、`lib/dates.ts`：集中翻译、订阅更新、语言偏好和日期／数量格式。
- `components/planner/{views,assignment-list,controls}.tsx` 与对话框／侧栏辅助标签：全站双语显示与重复标识。
- `tests/recurrence.test.mjs`、`tests/i18n.test.mjs`：循环、兼容性与语言回归测试。

### 验证

```sh
TZ=America/Los_Angeles node --experimental-strip-types --test tests/*.test.mjs
npx tsc --noEmit
npm run build:pages
```

回归测试覆盖六个周五、独立完成／恢复、单次例外、之后／整个系列编辑、删除排除、刷新序列化、拆分后再次编辑、各自完成前进度、旧普通记录、独立复制、多星期、隔周、闰年、跨年、夏令时以及语言持久化。浏览器测试使用单独的本地测试来源，覆盖实际表单、完成反馈、范围编辑／删除、恢复、复制、Calendar／Agenda、两种语言、刷新与响应式布局；不修改线上用户课程或作业。
