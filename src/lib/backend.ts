import { supabase, isCloud } from './supabase';
import type { Forest, GrowthEvent, Profile, Session, Tree, TreeCategory } from '../types';
import { TREE_SLOTS } from './treeGen';

/* ---------- 通用工具 ---------- */

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* ---------- 本地模式 ---------- */

interface LocalUser {
  id: string;
  hash: string;
  profile: Profile;
}

interface LocalData {
  forest: Forest | null;
  trees: Tree[];
  events: GrowthEvent[];
}

const usersKey = 'll_users';
const sessionKey = 'll_session';
const dataKey = (uid: string) => `ll_data_${uid}`;

function localUsers(): Record<string, LocalUser> {
  return readJSON(usersKey, {});
}

function localData(uid: string): LocalData {
  return readJSON(dataKey(uid), { forest: null, trees: [], events: [] });
}

function saveLocalData(uid: string, data: LocalData) {
  writeJSON(dataKey(uid), data);
}

const DEMO_EMAIL = 'demo@lucky.leaves';
const DEMO_PASSWORD = 'lucky123';

async function ensureDemo() {
  const users = localUsers();
  if (users[DEMO_EMAIL]) return;
  const id = crypto.randomUUID();
  const profile: Profile = { id, nickname: '小满', birthYear: 1996 };
  users[DEMO_EMAIL] = { id, hash: await sha256(DEMO_PASSWORD + DEMO_EMAIL), profile };
  writeJSON(usersKey, users);

  const forest: Forest = {
    id: crypto.randomUUID(),
    userId: id,
    name: '小满的幸运森林',
    createdAt: new Date(Date.now() - 86400000 * 240).toISOString(),
  };

  const mkTree = (
    title: string,
    category: TreeCategory,
    slotIdx: number,
    daysAgo: number,
    seed: string,
  ): Tree => ({
    id: crypto.randomUUID(),
    forestId: forest.id,
    userId: id,
    title,
    category,
    x: TREE_SLOTS[slotIdx].x,
    y: TREE_SLOTS[slotIdx].y,
    scale: TREE_SLOTS[slotIdx].s,
    seed,
    plantedAt: new Date(Date.now() - 86400000 * daysAgo).toISOString(),
  });

  const t1 = mkTree('生命之树', 'growth', 13, 2920, 'demo-life');
  const t2 = mkTree('考研之路', 'study', 1, 1095, 'demo-study');
  const t3 = mkTree('第一份工作', 'career', 14, 730, 'demo-career');
  const t4 = mkTree('晨跑计划', 'health', 7, 400, 'demo-health');
  const t5 = mkTree('环游世界', 'dream', 8, 300, 'demo-dream');
  const t6 = mkTree('给家人的信', 'relation', 11, 150, 'demo-relation');

  const mkEvent = (
    tree: Tree,
    title: string,
    note: string,
    daysAgo: number,
    doneDaysAgo: number | null,
    dueInDays: number | null = null,
  ): GrowthEvent => ({
    id: crypto.randomUUID(),
    treeId: tree.id,
    userId: id,
    title,
    note,
    dueDate:
      dueInDays === null
        ? null
        : new Date(Date.now() + 86400000 * dueInDays).toISOString().slice(0, 10),
    completedAt:
      doneDaysAgo === null ? null : new Date(Date.now() - 86400000 * doneDaysAgo).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * daysAgo).toISOString(),
  });

  const events: GrowthEvent[] = [
    mkEvent(t1, '写下年度关键词：扎根', '像树一样，先把根扎深。', 230, 220),
    mkEvent(t1, '坚持记录 100 天成长日记', '每天三行，写给未来的自己。', 200, 96),
    mkEvent(t1, '完成一次独自旅行', '去山里住了三天，学会和自己相处。', 150, 100),
    mkEvent(t1, '读完 12 本书', '每月一本，题材不限。', 120, null, 40),
    mkEvent(t2, '背完考研核心词汇', '5500 词，每天 80 个。', 190, 150),
    mkEvent(t2, '完成数学一轮复习', '错题本已经写了半本。', 170, 130),
    mkEvent(t2, '英语真题正确率稳定 80%', '近五年真题二刷。', 150, null, 25),
    mkEvent(t2, '参加初试', '十二月，全力以赴。', 140, null, 30),
    mkEvent(t3, '拿到第一份 offer', '产品经理助理，虽然薪水不高。', 150, 140),
    mkEvent(t3, '独立负责第一个功能上线', '从需求到验收全流程。', 120, 60),
    mkEvent(t3, '完成一次跨部门分享', '主题：如何写好一份 PRD。', 90, null, 12),
    mkEvent(t4, '连续晨跑 21 天', '从 1 公里开始，不追求速度。', 110, 88),
    mkEvent(t4, '跑完第一个 10 公里', '配速 6\'30"，比想象中轻松。', 80, 30),
    mkEvent(t4, '报名城市半程马拉松', '明年春天，目标完赛。', 60, null, 90),
    mkEvent(t5, '学会基础的旅行英语', '点餐、问路、值机不再慌张。', 70, 40),
    mkEvent(t5, '存下第一笔旅行基金', '目标：一万元。', 60, null, 120),
    mkEvent(t6, '给妈妈写一封手写信', '有些话当面说不出口。', 40, 20),
    mkEvent(t6, '安排一次全家体检', '健康是给家人最好的礼物。', 30, null, 7),
  ];

  saveLocalData(id, { forest, trees: [t1, t2, t3, t4, t5, t6], events });
}

const localBackend = {
  async signUp(email: string, password: string, nickname: string, birthYear: number): Promise<Session> {
    const users = localUsers();
    const key = email.trim().toLowerCase();
    if (users[key]) throw new Error('该邮箱已注册，请直接登录');
    if (password.length < 6) throw new Error('密码至少需要 6 位');
    const id = crypto.randomUUID();
    const profile: Profile = { id, nickname: nickname.trim() || '旅行者', birthYear };
    users[key] = { id, hash: await sha256(password + key), profile };
    writeJSON(usersKey, users);
    writeJSON(sessionKey, { userId: id, email: key });
    return { userId: id, email: key, profile };
  },

  async signIn(email: string, password: string): Promise<Session> {
    const key = email.trim().toLowerCase();
    const user = localUsers()[key];
    if (!user || user.hash !== (await sha256(password + key))) {
      throw new Error('邮箱或密码不正确');
    }
    writeJSON(sessionKey, { userId: user.id, email: key });
    return { userId: user.id, email: key, profile: user.profile };
  },

  async signOut(): Promise<void> {
    localStorage.removeItem(sessionKey);
  },

  async restoreSession(): Promise<Session | null> {
    const s = readJSON<{ userId: string; email: string } | null>(sessionKey, null);
    if (!s) return null;
    const user = localUsers()[s.email];
    if (!user || user.id !== s.userId) return null;
    return { userId: user.id, email: s.email, profile: user.profile };
  },

  async getForest(userId: string): Promise<Forest | null> {
    return localData(userId).forest;
  },

  async createForest(userId: string, name: string): Promise<Forest> {
    const data = localData(userId);
    if (data.forest) return data.forest;
    const forest: Forest = {
      id: crypto.randomUUID(),
      userId,
      name,
      createdAt: new Date().toISOString(),
    };
    data.forest = forest;
    saveLocalData(userId, data);
    return forest;
  },

  async listTrees(forestId: string): Promise<Tree[]> {
    const s = readJSON<{ userId: string } | null>(sessionKey, null);
    if (!s) return [];
    return localData(s.userId).trees.filter((t) => t.forestId === forestId);
  },

  async createTree(tree: Tree): Promise<Tree> {
    const data = localData(tree.userId);
    data.trees.push(tree);
    saveLocalData(tree.userId, data);
    return tree;
  },

  async deleteTree(treeId: string): Promise<void> {
    const s = readJSON<{ userId: string } | null>(sessionKey, null);
    if (!s) return;
    const data = localData(s.userId);
    data.trees = data.trees.filter((t) => t.id !== treeId);
    data.events = data.events.filter((e) => e.treeId !== treeId);
    saveLocalData(s.userId, data);
  },

  async listEvents(userId: string): Promise<GrowthEvent[]> {
    return localData(userId).events;
  },

  async createEvent(event: GrowthEvent): Promise<GrowthEvent> {
    const data = localData(event.userId);
    data.events.push(event);
    saveLocalData(event.userId, data);
    return event;
  },

  async setEventCompleted(eventId: string, completedAt: string | null): Promise<void> {
    const s = readJSON<{ userId: string } | null>(sessionKey, null);
    if (!s) return;
    const data = localData(s.userId);
    const ev = data.events.find((e) => e.id === eventId);
    if (ev) ev.completedAt = completedAt;
    saveLocalData(s.userId, data);
  },

  async updateEvent(eventId: string, patch: { title: string; note: string; dueDate: string | null }): Promise<void> {
    const s = readJSON<{ userId: string } | null>(sessionKey, null);
    if (!s) return;
    const data = localData(s.userId);
    const ev = data.events.find((e) => e.id === eventId);
    if (ev) {
      ev.title = patch.title;
      ev.note = patch.note;
      ev.dueDate = patch.dueDate;
    }
    saveLocalData(s.userId, data);
  },

  async deleteEvent(eventId: string): Promise<void> {
    const s = readJSON<{ userId: string } | null>(sessionKey, null);
    if (!s) return;
    const data = localData(s.userId);
    data.events = data.events.filter((e) => e.id !== eventId);
    saveLocalData(s.userId, data);
  },

  async ensureDemo() {
    await ensureDemo();
  },

  demoCredentials: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
};

/* ---------- Supabase 云端模式 ---------- */

interface TreeRow {
  id: string;
  forest_id: string;
  user_id: string;
  title: string;
  category: string;
  x: number;
  y: number;
  scale: number;
  seed: string;
  planted_at: string;
}

interface EventRow {
  id: string;
  tree_id: string;
  user_id: string;
  title: string;
  note: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
}

function rowToTree(r: TreeRow): Tree {
  return {
    id: r.id,
    forestId: r.forest_id,
    userId: r.user_id,
    title: r.title,
    category: r.category as TreeCategory,
    x: r.x,
    y: r.y,
    scale: r.scale,
    seed: r.seed,
    plantedAt: r.planted_at,
  };
}

function rowToEvent(r: EventRow): GrowthEvent {
  return {
    id: r.id,
    treeId: r.tree_id,
    userId: r.user_id,
    title: r.title,
    note: r.note,
    dueDate: r.due_date,
    completedAt: r.completed_at,
    createdAt: r.created_at,
  };
}

function fail(message: string, error: { message: string } | null): never {
  throw new Error(error ? `${message}（${error.message}）` : message);
}

const cloudBackend = {
  async signUp(email: string, password: string, nickname: string, birthYear: number): Promise<Session> {
    const sb = supabase!;
    const { data, error } = await sb.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { nickname: nickname.trim() || '旅行者', birth_year: birthYear } },
    });
    if (error) fail('注册失败', error);
    if (!data.session) throw new Error('注册成功！请前往邮箱点击确认链接后再登录');
    const profile = await fetchProfile(sb, data.user!.id, nickname, birthYear);
    return { userId: data.user!.id, email: data.user!.email ?? email, profile };
  },

  async signIn(email: string, password: string): Promise<Session> {
    const sb = supabase!;
    const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (error) fail('登录失败', error);
    const profile = await fetchProfile(sb, data.user.id);
    return { userId: data.user.id, email: data.user.email ?? email, profile };
  },

  async signOut(): Promise<void> {
    await supabase!.auth.signOut();
  },

  async restoreSession(): Promise<Session | null> {
    const sb = supabase!;
    const { data } = await sb.auth.getSession();
    if (!data.session) return null;
    const profile = await fetchProfile(sb, data.session.user.id);
    return {
      userId: data.session.user.id,
      email: data.session.user.email ?? '',
      profile,
    };
  },

  async getForest(userId: string): Promise<Forest | null> {
    const { data, error } = await supabase!
      .from('forests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) fail('读取森林失败', error);
    if (!data) return null;
    return { id: data.id, userId: data.user_id, name: data.name, createdAt: data.created_at };
  },

  async createForest(userId: string, name: string): Promise<Forest> {
    const { data, error } = await supabase!
      .from('forests')
      .insert({ user_id: userId, name })
      .select()
      .single();
    if (error) fail('创建森林失败', error);
    return { id: data.id, userId: data.user_id, name: data.name, createdAt: data.created_at };
  },

  async listTrees(forestId: string): Promise<Tree[]> {
    const { data, error } = await supabase!
      .from('trees')
      .select('*')
      .eq('forest_id', forestId)
      .order('planted_at', { ascending: true });
    if (error) fail('读取树木失败', error);
    return (data as TreeRow[]).map(rowToTree);
  },

  async createTree(tree: Tree): Promise<Tree> {
    const { data, error } = await supabase!
      .from('trees')
      .insert({
        id: tree.id,
        forest_id: tree.forestId,
        user_id: tree.userId,
        title: tree.title,
        category: tree.category,
        x: tree.x,
        y: tree.y,
        scale: tree.scale,
        seed: tree.seed,
        planted_at: tree.plantedAt,
      })
      .select()
      .single();
    if (error) fail('种树失败', error);
    return rowToTree(data as TreeRow);
  },

  async deleteTree(treeId: string): Promise<void> {
    const { error } = await supabase!.from('trees').delete().eq('id', treeId);
    if (error) fail('移除树木失败', error);
  },

  async listEvents(userId: string): Promise<GrowthEvent[]> {
    const { data, error } = await supabase!
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (error) fail('读取事件失败', error);
    return (data as EventRow[]).map(rowToEvent);
  },

  async createEvent(event: GrowthEvent): Promise<GrowthEvent> {
    const { data, error } = await supabase!
      .from('events')
      .insert({
        id: event.id,
        tree_id: event.treeId,
        user_id: event.userId,
        title: event.title,
        note: event.note,
        due_date: event.dueDate,
        completed_at: event.completedAt,
        created_at: event.createdAt,
      })
      .select()
      .single();
    if (error) fail('添加事件失败', error);
    return rowToEvent(data as EventRow);
  },

  async setEventCompleted(eventId: string, completedAt: string | null): Promise<void> {
    const { error } = await supabase!
      .from('events')
      .update({ completed_at: completedAt })
      .eq('id', eventId);
    if (error) fail('更新事件失败', error);
  },

  async updateEvent(eventId: string, patch: { title: string; note: string; dueDate: string | null }): Promise<void> {
    const { error } = await supabase!
      .from('events')
      .update({ title: patch.title, note: patch.note, due_date: patch.dueDate })
      .eq('id', eventId);
    if (error) fail('编辑事件失败', error);
  },

  async deleteEvent(eventId: string): Promise<void> {
    const { error } = await supabase!.from('events').delete().eq('id', eventId);
    if (error) fail('删除事件失败', error);
  },

  async ensureDemo(): Promise<void> {
    /* 云端模式不提供本地演示账号 */
  },

  demoCredentials: null as { email: string; password: string } | null,
};

async function fetchProfile(
  sb: NonNullable<typeof supabase>,
  userId: string,
  fallbackNickname?: string,
  fallbackBirthYear?: number,
): Promise<Profile> {
  for (let i = 0; i < 3; i++) {
    const { data } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data) {
      return { id: data.id, nickname: data.nickname, birthYear: data.birth_year };
    }
    await new Promise((r) => setTimeout(r, 350));
  }
  return {
    id: userId,
    nickname: fallbackNickname ?? '旅行者',
    birthYear: fallbackBirthYear ?? 2000,
  };
}

export const backend = isCloud ? cloudBackend : localBackend;
export { isCloud };