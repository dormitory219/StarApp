const STORAGE_KEY = "star_wish_growth_state_v3";
const DEFAULT_FOCUS_MINUTES = 14;
const todayKey = () => new Date().toISOString().slice(0, 10);
const uid = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;

const templates = [
  { category: "学习", title: "算术题", stars: 6, note: "完成当天约定的口算或计算练习", icon: "算" },
  { category: "学习", title: "小怪兽学英语", stars: 6, note: "完成一次英语听说读练习", icon: "英" },
  { category: "学习", title: "拼音学习", stars: 5, note: "完成拼读、认读或书写练习", icon: "拼" },
  { category: "学习", title: "儿童1300字打卡", stars: 5, note: "完成当天汉字认读或复习", icon: "字" },
  { category: "学习", title: "阅读 20 分钟", stars: 5, note: "培养稳定阅读习惯", icon: "读" },
  { category: "学习", title: "背诵古诗", stars: 6, note: "每天完成一首或一段", icon: "诗" },
  { category: "学习", title: "整理错题", stars: 8, note: "记录错误原因和订正", icon: "题" },
  { category: "学习", title: "完成作业", stars: 10, note: "专注完成当天作业", icon: "写" },
  { category: "生活", title: "早睡早起", stars: 6, note: "保持规律作息", icon: "睡" },
  { category: "生活", title: "整理书包", stars: 4, note: "自己准备第二天物品", icon: "包" },
  { category: "生活", title: "刷牙洗脸", stars: 3, note: "早晚独立完成", icon: "净" },
  { category: "生活", title: "控制零食", stars: 5, note: "按约定选择零食", icon: "食" },
  { category: "兴趣", title: "练琴 30 分钟", stars: 8, note: "完成练习曲或指法", icon: "琴" },
  { category: "兴趣", title: "运动打卡", stars: 6, note: "跳绳、跑步或球类运动", icon: "动" },
  { category: "兴趣", title: "画画创作", stars: 5, note: "完成一幅小作品", icon: "画" },
  { category: "家务", title: "饭后收拾", stars: 5, note: "帮忙收碗或擦桌", icon: "家" }
];

const defaultGoalTitles = [
  "算术题",
  "小怪兽学英语",
  "拼音学习",
  "儿童1300字打卡",
  "阅读 20 分钟",
  "整理书包",
  "运动打卡"
];

const wishPresets = [
  { title: "亲子电影夜", cost: 40, category: "陪伴" },
  { title: "周末公园半日游", cost: 70, category: "户外" },
  { title: "选择一次晚餐", cost: 35, category: "特权" },
  { title: "一本喜欢的新书", cost: 55, category: "成长" },
  { title: "30 分钟游戏时间", cost: 45, category: "特权" },
  { title: "小玩具奖励", cost: 90, category: "礼物" }
];

const badges = [
  { id: "first_check", icon: "初", title: "第一次打卡", desc: "完成任意一次评分打卡", test: (s, c) => checkinsOf(s, c.id).length >= 1 },
  { id: "star_50", icon: "50", title: "星星小富翁", desc: "累计获得 50 颗星星", test: (s, c) => c.totalStars >= 50 },
  { id: "wish_1", icon: "愿", title: "心愿启航", desc: "兑换 1 个心愿", test: (s, c) => redemptionsOf(s, c.id).length >= 1 },
  { id: "pet_2", icon: "宠", title: "伙伴升级", desc: "成长伙伴达到 2 级", test: (s, c) => c.pet.level >= 2 },
  { id: "focus_3", icon: "专", title: "专注练习生", desc: "完成 3 次番茄钟", test: (s, c) => timerSessionsOf(s, c.id).length >= 3 },
  { id: "week_5", icon: "连", title: "连续坚持", desc: "连续 5 天有打卡", test: (s, c) => streakFor(s, c.id) >= 5 }
];

let state = loadState();
let activeChildId = state.activeChildId;
let activeView = "home";
let activeTemplateCategory = "学习";
let modalType = null;
let timer = {
  seconds: (state.settings?.focusMinutes || DEFAULT_FOCUS_MINUTES) * 60,
  total: (state.settings?.focusMinutes || DEFAULT_FOCUS_MINUTES) * 60,
  running: false,
  interval: null
};

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    return normalizeState(JSON.parse(saved));
  }

  const childId = uid("child");
  const goals = defaultGoalTitles.map((title) => createGoal(childId, templates.find((item) => item.title === title)));

  return {
    activeChildId: childId,
    settings: {
      focusMinutes: DEFAULT_FOCUS_MINUTES,
      defaultGoalsSeeded: true
    },
    children: [
      {
        id: childId,
        name: "乐乐",
        age: 5,
        avatar: "星",
        currentStars: 0,
        totalStars: 0,
        pet: { name: "小星", level: 1, exp: 0, food: 0 }
      }
    ],
    goals,
    wishes: wishPresets.map((wish) => ({
      id: uid("wish"),
      childId,
      title: wish.title,
      category: wish.category,
      cost: wish.cost,
      status: "available",
      createdAt: Date.now()
    })),
    checkins: [],
    ledger: [],
    redemptions: [],
    timers: []
  };
}

function normalizeState(nextState) {
  nextState.settings = nextState.settings || {};
  nextState.settings.focusMinutes = clampMinutes(nextState.settings.focusMinutes || DEFAULT_FOCUS_MINUTES);
  nextState.goals = (nextState.goals || []).map((goal) => ({
    ...goal,
    timerMinutes: Number(goal.timerMinutes || DEFAULT_FOCUS_MINUTES) === 25 ? DEFAULT_FOCUS_MINUTES : clampMinutes(goal.timerMinutes || DEFAULT_FOCUS_MINUTES)
  }));
  nextState.timers = nextState.timers || [];
  nextState.ledger = nextState.ledger || [];
  seedDefaultGoals(nextState);
  return nextState;
}

function seedDefaultGoals(nextState) {
  if (nextState.settings.defaultGoalsSeeded) return;
  (nextState.children || []).forEach((child) => {
    const childGoals = nextState.goals.filter((goal) => goal.childId === child.id);
    defaultGoalTitles.forEach((title) => {
      if (!childGoals.some((goal) => goal.title === title)) {
        const template = templates.find((item) => item.title === title);
        if (template) {
          nextState.goals.push(createGoal(child.id, template));
        }
      }
    });
  });
  nextState.settings.defaultGoalsSeeded = true;
}

function saveState() {
  state.activeChildId = activeChildId;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createGoal(childId, source) {
  return {
    id: uid("goal"),
    childId,
    title: source.title,
    category: source.category,
    stars: Number(source.stars || 5),
    note: source.note || "",
    icon: source.icon || "星",
    schedule: "daily",
    weeklyLimit: 7,
    timerMinutes: source.timerMinutes || DEFAULT_FOCUS_MINUTES,
    active: true,
    createdAt: Date.now()
  };
}

function activeChild() {
  return state.children.find((child) => child.id === activeChildId) || state.children[0];
}

function goalsOf(childId) {
  return state.goals.filter((goal) => goal.childId === childId && goal.active);
}

function checkinsOf(s, childId) {
  return s.checkins.filter((checkin) => checkin.childId === childId);
}

function redemptionsOf(s, childId) {
  return s.redemptions.filter((item) => item.childId === childId);
}

function timerSessionsOf(s, childId) {
  return s.timers.filter((item) => item.childId === childId);
}

function clampMinutes(value) {
  return Math.max(5, Math.min(60, Number(value) || DEFAULT_FOCUS_MINUTES));
}

function todaysCheckin(goalId) {
  return state.checkins.find((item) => item.goalId === goalId && item.date === todayKey());
}

function addLedger(childId, delta, type, reason) {
  const child = state.children.find((item) => item.id === childId);
  child.currentStars = Math.max(0, child.currentStars + delta);
  if (delta > 0) {
    child.totalStars += delta;
    child.pet.food += Math.max(1, Math.floor(delta / 5));
  }
  state.ledger.unshift({ id: uid("ledger"), childId, delta, type, reason, createdAt: Date.now() });
}

function scoreGoal(goalId, level) {
  const goal = state.goals.find((item) => item.id === goalId);
  const child = activeChild();
  if (todaysCheckin(goalId)) {
    toast("今天这个目标已经评分了");
    return;
  }
  const multiplier = level === "great" ? 1 : level === "ok" ? 0.7 : 0;
  const delta = Math.round(goal.stars * multiplier);
  state.checkins.push({
    id: uid("check"),
    childId: child.id,
    goalId,
    date: todayKey(),
    score: level,
    stars: delta,
    createdAt: Date.now()
  });
  if (delta > 0) {
    addLedger(child.id, delta, "checkin", `${goal.title} 打卡`);
  }
  unlockBadges();
  saveState();
  render();
  toast(delta > 0 ? `获得 ${delta} 颗星星` : "已记录，明天继续加油");
}

function redeemWish(wishId) {
  const child = activeChild();
  const wish = state.wishes.find((item) => item.id === wishId);
  if (wish.status !== "available") return;
  if (child.currentStars < wish.cost) {
    toast("星星还不够，继续努力");
    return;
  }
  wish.status = "pending";
  addLedger(child.id, -wish.cost, "redemption", `兑换心愿：${wish.title}`);
  state.redemptions.unshift({
    id: uid("redeem"),
    childId: child.id,
    wishId: wish.id,
    title: wish.title,
    cost: wish.cost,
    status: "pending",
    createdAt: Date.now()
  });
  unlockBadges();
  saveState();
  render();
  toast("心愿已兑换，等待兑现");
}

function fulfillWish(wishId) {
  const wish = state.wishes.find((item) => item.id === wishId);
  const redemption = state.redemptions.find((item) => item.wishId === wishId && item.status === "pending");
  wish.status = "fulfilled";
  if (redemption) {
    redemption.status = "fulfilled";
    redemption.fulfilledAt = Date.now();
  }
  saveState();
  render();
  toast("心愿已兑现");
}

function feedPet() {
  const child = activeChild();
  if (child.pet.food <= 0) {
    toast("星粮不足，完成任务可获得星粮");
    return;
  }
  child.pet.food -= 1;
  child.pet.exp += 25;
  while (child.pet.exp >= 100) {
    child.pet.exp -= 100;
    child.pet.level += 1;
    toast(`成长伙伴升到 ${child.pet.level} 级`);
  }
  unlockBadges();
  saveState();
  render();
}

function unlockBadges() {
  const child = activeChild();
  child.badges = child.badges || [];
  badges.forEach((badge) => {
    if (!child.badges.includes(badge.id) && badge.test(state, child)) {
      child.badges.push(badge.id);
    }
  });
}

function streakFor(s, childId) {
  const days = [...new Set(s.checkins.filter((item) => item.childId === childId).map((item) => item.date))].sort().reverse();
  let streak = 0;
  const cursor = new Date(todayKey());
  for (let i = 0; i < 60; i += 1) {
    const key = cursor.toISOString().slice(0, 10);
    if (!days.includes(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function render() {
  renderChildren();
  renderHome();
  renderFocus();
  renderTemplates();
  renderGoals();
  renderWishes();
  renderGrowth();
  renderFamily();
}

function renderChildren() {
  const strip = document.querySelector("#childStrip");
  strip.innerHTML = state.children.map((child) => `
    <button class="child-chip ${child.id === activeChildId ? "active" : ""}" data-child="${child.id}" type="button">
      <span class="avatar">${child.avatar}</span>
      <span>${child.name}<br><small>${child.age} 岁</small></span>
    </button>
  `).join("");
}

function renderHome() {
  const child = activeChild();
  const goals = goalsOf(child.id);
  const done = goals.filter((goal) => todaysCheckin(goal.id)).length;
  document.querySelector("#heroTitle").textContent = `${child.name}，今天也闪闪发光`;
  document.querySelector("#heroText").textContent = `星粮 ${child.pet.food} 份 · ${child.pet.name} Lv.${child.pet.level}`;
  document.querySelector("#currentStars").textContent = child.currentStars;
  document.querySelector("#todayDone").textContent = `${done}/${goals.length}`;
  document.querySelector("#streakDays").textContent = `${streakFor(state, child.id)} 天`;
  document.querySelector("#todayTasks").innerHTML = goals.length ? goals.map(renderTaskCard).join("") : empty("还没有目标，先从目标库添加一个。");
}

function renderTaskCard(goal) {
  const checkin = todaysCheckin(goal.id);
  const status = checkin ? `已得 ${checkin.stars} 星` : `最高 ${goal.stars} 星`;
  return `
    <article class="task-card ${checkin ? "completed" : ""}">
      <div class="task-top">
        <div>
          <div class="task-title">${goal.icon} ${goal.title}</div>
          <div class="task-meta">${goal.category} · ${status} · ${goal.timerMinutes} 分钟</div>
        </div>
        <button class="icon-button" data-start-timer="${goal.id}" type="button">计</button>
      </div>
      ${checkin ? renderCheckinSummary(checkin) : `
        <div class="score-row">
          <button data-score="${goal.id}:try" type="button">需努力</button>
          <button data-score="${goal.id}:ok" type="button">完成</button>
          <button data-score="${goal.id}:great" type="button">很棒</button>
        </div>
      `}
    </article>
  `;
}

function renderCheckinSummary(checkin) {
  const label = scoreText(checkin.score);
  const tone = checkin.score === "great" ? "great" : checkin.score === "ok" ? "ok" : "try";
  const title = checkin.score === "great" ? "闪闪完成" : checkin.score === "ok" ? "已完成" : "已记录";
  return `
    <div class="checkin-summary ${tone}">
      <div class="checkin-mark">${checkin.score === "try" ? "·" : "✓"}</div>
      <div>
        <strong>${title}</strong>
        <span>今日评价：${label}</span>
      </div>
      <div class="star-chip" aria-label="获得 ${checkin.stars} 颗星星">${"★".repeat(checkin.stars)}</div>
    </div>
  `;
}

function renderFocus() {
  const child = activeChild();
  const goals = goalsOf(child.id);
  const selectedGoalId = timer.goalId && goals.some((goal) => goal.id === timer.goalId) ? timer.goalId : "";
  document.querySelector("#timerGoalSelect").innerHTML = [
    `<option value="">自由专注 · ${state.settings.focusMinutes} 分钟</option>`,
    ...goals.map((goal) => `<option value="${goal.id}" ${goal.id === selectedGoalId ? "selected" : ""}>${goal.icon} ${goal.title} · ${goal.timerMinutes} 分钟</option>`)
  ].join("");
  document.querySelector("#focusGoals").innerHTML = goals.map((goal) => `
    <article class="task-card">
      <div class="task-top">
        <div>
          <div class="task-title">${goal.icon} ${goal.title}</div>
          <div class="task-meta">${goal.category} · ${goal.timerMinutes} 分钟 · 完成奖励 ${goal.stars} 星</div>
        </div>
        <button class="icon-button" data-start-timer="${goal.id}" type="button">计</button>
      </div>
    </article>
  `).join("") || empty("还没有可计时的目标，先到目标库添加一个。");
  document.querySelector("#focusHistory").innerHTML = timerSessionsOf(state, child.id)
    .slice(0, 10)
    .map((item) => {
      const goal = state.goals.find((goalItem) => goalItem.id === item.goalId);
      const minutes = Math.round(item.duration / 60);
      return `
        <div class="ledger-item">
          <span>${goal ? goal.title : "自由专注"}<br><small>${new Date(item.createdAt).toLocaleString("zh-CN")}</small></span>
          <strong class="plus">${minutes} 分钟</strong>
        </div>
      `;
    }).join("") || empty("暂无专注记录。");
  updateTimerUi();
}

function scoreText(score) {
  return score === "great" ? "很棒" : score === "ok" ? "完成" : "需努力";
}

function renderTemplates() {
  const categories = [...new Set(templates.map((item) => item.category))];
  document.querySelector("#templateTabs").innerHTML = categories.map((cat) => `
    <button class="${cat === activeTemplateCategory ? "active" : ""}" data-template-tab="${cat}" type="button">${cat}</button>
  `).join("");
  document.querySelector("#templateGrid").innerHTML = templates
    .filter((item) => item.category === activeTemplateCategory)
    .map((item, index) => `
      <button class="template-card" data-template="${activeTemplateCategory}:${index}" type="button">
        <div class="avatar">${item.icon}</div>
        <strong>${item.title}</strong>
        <span>${item.note} · ${item.stars} 星</span>
      </button>
    `).join("");
}

function renderGoals() {
  const child = activeChild();
  document.querySelector("#goalList").innerHTML = goalsOf(child.id).map((goal) => `
    <article class="goal-card">
      <div class="task-title">${goal.icon} ${goal.title}</div>
      <div class="goal-meta">${goal.category} · 每日目标 · ${goal.stars} 星 · 周上限 ${goal.weeklyLimit} 次</div>
      <div class="card-actions">
        <button data-start-timer="${goal.id}" type="button">计时</button>
        <button data-edit-goal="${goal.id}" type="button">编辑</button>
        <button data-delete-goal="${goal.id}" type="button">停用</button>
      </div>
    </article>
  `).join("") || empty("暂无目标。");
}

function renderWishes() {
  const child = activeChild();
  document.querySelector("#wishStars").textContent = child.currentStars;
  const list = state.wishes.filter((wish) => wish.childId === child.id);
  document.querySelector("#wishList").innerHTML = list.map((wish) => {
    const action = wish.status === "available"
      ? `<button data-redeem="${wish.id}" type="button">兑换</button>`
      : wish.status === "pending"
        ? `<button data-fulfill="${wish.id}" type="button">兑现</button>`
        : `<button disabled type="button">已兑现</button>`;
    return `
      <article class="wish-card">
        <div class="wish-top">
          <div>
            <div class="wish-title">${wish.title}</div>
            <div class="wish-meta">${wish.category} · ${wish.cost} 星 · ${wishStatus(wish.status)}</div>
          </div>
          <span class="avatar">愿</span>
        </div>
        <div class="card-actions">${action}</div>
      </article>
    `;
  }).join("") || empty("还没有心愿，添加一个孩子真正期待的奖励。");
}

function wishStatus(status) {
  return status === "available" ? "可兑换" : status === "pending" ? "待兑现" : "已兑现";
}

function renderGrowth() {
  const child = activeChild();
  document.querySelector("#petName").textContent = child.pet.name;
  document.querySelector("#petLevel").textContent = `Lv.${child.pet.level} · ${child.pet.exp}/100 经验 · 星粮 ${child.pet.food}`;
  document.querySelector("#petProgress").style.width = `${child.pet.exp}%`;
  document.querySelector("#chartBars").innerHTML = recentSevenDays(child.id).map((item) => `
    <div class="bar-wrap">
      <div class="bar" style="height:${Math.max(8, item.stars * 4)}px"></div>
      <span>${item.label}</span>
    </div>
  `).join("");
  document.querySelector("#badgeGrid").innerHTML = badges.map((badge) => {
    const unlocked = (child.badges || []).includes(badge.id);
    return `
      <article class="badge ${unlocked ? "" : "locked"}">
        <div class="badge-icon">${badge.icon}</div>
        <strong>${badge.title}</strong>
        <p class="task-meta">${badge.desc}</p>
      </article>
    `;
  }).join("");
}

function recentSevenDays(childId) {
  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    const stars = state.checkins.filter((item) => item.childId === childId && item.date === key).reduce((sum, item) => sum + item.stars, 0);
    days.push({ label: `${date.getMonth() + 1}/${date.getDate()}`, stars });
  }
  return days;
}

function renderFamily() {
  const child = activeChild();
  document.querySelector("#ledgerList").innerHTML = state.ledger
    .filter((item) => item.childId === child.id)
    .slice(0, 30)
    .map((item) => `
      <div class="ledger-item">
        <span>${item.reason}<br><small>${new Date(item.createdAt).toLocaleString("zh-CN")}</small></span>
        <strong class="${item.delta >= 0 ? "plus" : "minus"}">${item.delta >= 0 ? "+" : ""}${item.delta}</strong>
      </div>
    `).join("") || empty("暂无星星流水。");
}

function empty(text) {
  return `<div class="empty-state">${text}</div>`;
}

function openModal(type, payload = {}) {
  modalType = type;
  const title = document.querySelector("#modalTitle");
  const fields = document.querySelector("#modalFields");
  const child = activeChild();
  const goal = payload.goalId ? state.goals.find((item) => item.id === payload.goalId) : null;
  const field = (label, name, value = "", input = "input", attrs = "") => `
    <div class="field">
      <label for="${name}">${label}</label>
      ${input === "textarea"
        ? `<textarea id="${name}" name="${name}" ${attrs}>${value}</textarea>`
        : `<${input} id="${name}" name="${name}" value="${value}" ${attrs}></${input}>`}
    </div>
  `;

  if (type === "child") {
    title.textContent = "添加孩子";
    fields.innerHTML = field("昵称", "name", "", "input", "required maxlength='12'") +
      field("年龄", "age", "5", "input", "type='number' min='1' max='18'") +
      field("头像文字", "avatar", "星", "input", "maxlength='2'");
  }
  if (type === "goal") {
    title.textContent = goal ? "编辑目标" : "创建目标";
    fields.innerHTML = field("目标名称", "title", goal?.title || "", "input", "required maxlength='24'") +
      field("分类", "category", goal?.category || "学习", "input", "required") +
      field("图标文字", "icon", goal?.icon || "星", "input", "maxlength='2'") +
      field("完成星星", "stars", goal?.stars || 5, "input", "type='number' min='1' max='99'") +
      field("番茄钟分钟", "timerMinutes", goal?.timerMinutes || DEFAULT_FOCUS_MINUTES, "input", "type='number' min='5' max='60'") +
      field("说明", "note", goal?.note || "", "textarea", "maxlength='80'") +
      `<input type="hidden" name="goalId" value="${goal?.id || ""}">`;
  }
  if (type === "wish") {
    title.textContent = "添加心愿";
    fields.innerHTML = field("心愿名称", "title", "", "input", "required maxlength='24'") +
      field("分类", "category", "成长", "input", "required") +
      field("需要星星", "cost", "50", "input", "type='number' min='1' max='999'");
  }
  document.querySelector("#modalBackdrop").hidden = false;
  setTimeout(() => document.querySelector(".modal input")?.focus(), 80);
}

function closeModal() {
  document.querySelector("#modalBackdrop").hidden = true;
  modalType = null;
}

function handleModalSubmit(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  const child = activeChild();
  if (modalType === "child") {
    const newChild = {
      id: uid("child"),
      name: data.name,
      age: Number(data.age || 5),
      avatar: data.avatar || data.name.slice(0, 1),
      currentStars: 20,
      totalStars: 20,
      pet: { name: "小星", level: 1, exp: 0, food: 1 },
      badges: []
    };
    state.children.push(newChild);
    activeChildId = newChild.id;
    state.wishes.push(...wishPresets.slice(0, 3).map((wish) => ({ id: uid("wish"), childId: newChild.id, title: wish.title, category: wish.category, cost: wish.cost, status: "available", createdAt: Date.now() })));
    addLedger(newChild.id, 20, "bonus", "新孩子星星礼包");
  }
  if (modalType === "goal") {
    if (data.goalId) {
      const goal = state.goals.find((item) => item.id === data.goalId);
      Object.assign(goal, {
        title: data.title,
        category: data.category,
        icon: data.icon || "星",
        stars: Number(data.stars),
        timerMinutes: clampMinutes(data.timerMinutes),
        note: data.note
      });
    } else {
      state.goals.push(createGoal(child.id, {
        title: data.title,
        category: data.category,
        icon: data.icon || "星",
        stars: Number(data.stars),
        timerMinutes: clampMinutes(data.timerMinutes),
        note: data.note
      }));
    }
  }
  if (modalType === "wish") {
    state.wishes.unshift({
      id: uid("wish"),
      childId: child.id,
      title: data.title,
      category: data.category,
      cost: Number(data.cost),
      status: "available",
      createdAt: Date.now()
    });
  }
  saveState();
  closeModal();
  render();
  toast("已保存");
}

function switchView(viewName) {
  activeView = viewName;
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.dataset.view === activeView));
  document.querySelectorAll("#tabbar button").forEach((button) => button.classList.toggle("active", button.dataset.nav === activeView));
}

function startTimer(goalId = "") {
  const goal = state.goals.find((item) => item.id === goalId);
  const minutes = clampMinutes(goal?.timerMinutes || state.settings.focusMinutes);
  timer.seconds = minutes * 60;
  timer.total = timer.seconds;
  timer.goalId = goal?.id || "";
  timer.running = false;
  clearInterval(timer.interval);
  switchView("focus");
  renderFocus();
  toast(`已准备 ${minutes} 分钟番茄钟`);
}

function toggleTimer() {
  if (timer.running) {
    clearInterval(timer.interval);
    timer.running = false;
    updateTimerUi();
    return;
  }
  timer.running = true;
  timer.interval = setInterval(() => {
    timer.seconds -= 1;
    if (timer.seconds <= 0) {
      clearInterval(timer.interval);
      timer.running = false;
      timer.seconds = 0;
      state.timers.push({ id: uid("timer"), childId: activeChild().id, goalId: timer.goalId || null, duration: timer.total, createdAt: Date.now() });
      addLedger(activeChild().id, 3, "focus", "完成一次番茄钟");
      unlockBadges();
      saveState();
      render();
      toast("番茄钟完成，奖励 3 星");
    }
    updateTimerUi();
  }, 1000);
  updateTimerUi();
}

function resetTimer() {
  clearInterval(timer.interval);
  const goal = state.goals.find((item) => item.id === timer.goalId);
  timer.seconds = clampMinutes(goal?.timerMinutes || state.settings.focusMinutes) * 60;
  timer.total = timer.seconds;
  timer.running = false;
  updateTimerUi();
}

function setTimerMinutes(value, options = {}) {
  if (timer.running) return;
  const minutes = clampMinutes(value);
  const goal = state.goals.find((item) => item.id === timer.goalId);
  if (goal && options.updateGoal) {
    goal.timerMinutes = minutes;
  }
  if (!goal) {
    state.settings.focusMinutes = minutes;
  }
  timer.seconds = minutes * 60;
  timer.total = timer.seconds;
  saveState();
  updateTimerUi();
  renderFocus();
}

function updateTimerUi() {
  const minutes = String(Math.floor(timer.seconds / 60)).padStart(2, "0");
  const seconds = String(timer.seconds % 60).padStart(2, "0");
  const display = document.querySelector("#timerDisplay");
  const toggle = document.querySelector("#timerToggle");
  const status = document.querySelector("#timerStatus");
  const progress = document.querySelector("#timerProgress");
  const label = document.querySelector("#timerMinutesLabel");
  const range = document.querySelector("#timerMinutesRange");
  const tune = document.querySelector("#timerTune");
  if (!display || !toggle || !status || !progress || !label || !range || !tune) return;
  display.textContent = `${minutes}:${seconds}`;
  toggle.textContent = timer.running ? "暂停" : timer.seconds === 0 ? "再来一次" : "开始专注";
  status.textContent = timer.running ? "专注中" : timer.seconds === 0 ? "已完成" : "准备中";
  const used = timer.total ? (timer.total - timer.seconds) / timer.total : 0;
  progress.style.width = `${Math.max(0, Math.min(100, used * 100))}%`;
  const currentMinutes = clampMinutes(Math.round(timer.total / 60));
  label.textContent = `${currentMinutes} 分钟`;
  range.value = currentMinutes;
  range.disabled = timer.running;
  tune.querySelectorAll("button").forEach((button) => {
    button.disabled = timer.running;
    button.classList.toggle("active", Number(button.dataset.timerPreset) === currentMinutes);
  });
}

function exportCsv() {
  const child = activeChild();
  const rows = [["日期", "类型", "原因", "星星变化"]];
  state.ledger.filter((item) => item.childId === child.id).forEach((item) => {
    rows.push([new Date(item.createdAt).toLocaleString("zh-CN"), item.type, item.reason, item.delta]);
  });
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${child.name}-成长星星流水.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function toast(message) {
  const node = document.querySelector("#toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove("show"), 1800);
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;

  if (target.dataset.nav) {
    switchView(target.dataset.nav);
  }
  if (target.dataset.child) {
    activeChildId = target.dataset.child;
    saveState();
    render();
  }
  if (target.dataset.open) openModal(target.dataset.open);
  if (target.dataset.score) {
    const [goalId, level] = target.dataset.score.split(":");
    scoreGoal(goalId, level);
  }
  if (target.dataset.templateTab) {
    activeTemplateCategory = target.dataset.templateTab;
    renderTemplates();
  }
  if (target.dataset.timerStep) {
    setTimerMinutes(Math.round(timer.total / 60) + Number(target.dataset.timerStep));
  }
  if (target.dataset.timerPreset) {
    setTimerMinutes(Number(target.dataset.timerPreset));
  }
  if (target.dataset.template) {
    const [, index] = target.dataset.template.split(":");
    const item = templates.filter((template) => template.category === activeTemplateCategory)[Number(index)];
    state.goals.push(createGoal(activeChild().id, item));
    saveState();
    render();
    toast("已加入今日目标");
  }
  if (target.dataset.editGoal) openModal("goal", { goalId: target.dataset.editGoal });
  if (target.dataset.deleteGoal) {
    const goal = state.goals.find((item) => item.id === target.dataset.deleteGoal);
    if (!goal) return;
    if (!confirm(`确定删除「${goal.title}」吗？`)) return;
    goal.active = false;
    saveState();
    render();
    toast("目标已删除");
  }
  if (target.dataset.redeem) redeemWish(target.dataset.redeem);
  if (target.dataset.fulfill) fulfillWish(target.dataset.fulfill);
  if (target.dataset.startTimer) startTimer(target.dataset.startTimer);
  if (target.dataset.bonus) {
    addLedger(activeChild().id, Number(target.dataset.bonus), "manual", Number(target.dataset.bonus) > 0 ? "快捷奖励" : "快捷扣星");
    unlockBadges();
    saveState();
    render();
  }
});

document.querySelector("#modalForm").addEventListener("submit", handleModalSubmit);
document.querySelector("#closeModal").addEventListener("click", closeModal);
document.querySelector("#modalBackdrop").addEventListener("click", (event) => {
  if (event.target.id === "modalBackdrop") closeModal();
});
document.querySelector("#feedPet").addEventListener("click", feedPet);
document.querySelector("#exportData").addEventListener("click", exportCsv);
document.querySelector("#timerToggle").addEventListener("click", toggleTimer);
document.querySelector("#timerReset").addEventListener("click", resetTimer);
document.querySelector("#timerGoalSelect").addEventListener("change", (event) => {
  startTimer(event.target.value);
});
document.querySelector("#timerMinutesRange").addEventListener("input", (event) => {
  setTimerMinutes(event.target.value);
});
document.querySelector("#resetDemo").addEventListener("click", () => {
  if (confirm("确定重置所有本地数据吗？")) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("star_wish_growth_state_v2");
    localStorage.removeItem("star_wish_growth_state_v1");
    state = loadState();
    activeChildId = state.activeChildId;
    saveState();
    render();
  }
});

unlockBadges();
saveState();
render();
updateTimerUi();
