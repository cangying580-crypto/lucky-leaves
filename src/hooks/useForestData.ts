import { useCallback, useEffect, useMemo, useState } from 'react';
import { backend } from '../lib/backend';
import { nextSlot } from '../lib/treeGen';
import { sound } from '../lib/sound';
import { useToast } from '../context/ToastContext';
import type { Forest, GrowthEvent, Session, Tree, TreeCategory } from '../types';

export interface ForestStats {
  treeCount: number;
  eventCount: number;
  doneCount: number;
  rate: number;
  streak: number;
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function useForestData(session: Session) {
  const { toast } = useToast();
  const [forest, setForest] = useState<Forest | null>(null);
  const [trees, setTrees] = useState<Tree[]>([]);
  const [events, setEvents] = useState<GrowthEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setReady(false);
    (async () => {
      try {
        const f = await backend.getForest(session.userId);
        if (!alive) return;
        setForest(f);
        if (f) {
          const [t, e] = await Promise.all([
            backend.listTrees(f.id),
            backend.listEvents(session.userId),
          ]);
          if (!alive) return;
          setTrees(t);
          setEvents(e);
        } else {
          setTrees([]);
          setEvents([]);
        }
      } catch (err) {
        if (alive) toast(err instanceof Error ? err.message : '数据加载失败', 'error');
      } finally {
        if (alive) {
          setLoading(false);
          setReady(true);
        }
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.userId]);

  const createForest = useCallback(
    async (name: string) => {
      const f = await backend.createForest(session.userId, name);
      const slot = nextSlot([], 'life-tree');
      const lifeTree: Tree = {
        id: crypto.randomUUID(),
        forestId: f.id,
        userId: session.userId,
        title: '生命之树',
        category: 'growth',
        x: slot.x,
        y: slot.y,
        scale: slot.s,
        seed: `life-${session.userId.slice(0, 8)}`,
        plantedAt: new Date().toISOString(),
      };
      await backend.createTree(lifeTree);
      const firstEvent: GrowthEvent = {
        id: crypto.randomUUID(),
        treeId: lifeTree.id,
        userId: session.userId,
        title: '写下第一个成长目标',
        note: '每完成一件事，树上就会有一片叶子变黄。',
        dueDate: null,
        completedAt: null,
        createdAt: new Date().toISOString(),
      };
      await backend.createEvent(firstEvent);
      setForest(f);
      setTrees([lifeTree]);
      setEvents([firstEvent]);
      sound.plant();
      toast('森林创建成功，生命之树已种下', 'success');
      return f;
    },
    [session.userId, toast],
  );

  const plantTree = useCallback(
    async (title: string, category: TreeCategory) => {
      if (!forest) throw new Error('请先创建森林');
      const seed = crypto.randomUUID();
      const slot = nextSlot(trees, seed);
      const tree: Tree = {
        id: crypto.randomUUID(),
        forestId: forest.id,
        userId: session.userId,
        title,
        category,
        x: slot.x,
        y: slot.y,
        scale: slot.s,
        seed,
        plantedAt: new Date().toISOString(),
      };
      setTrees((prev) => [...prev, tree]);
      try {
        await backend.createTree(tree);
        sound.plant();
        toast(`「${title}」已种下`, 'success');
      } catch (err) {
        setTrees((prev) => prev.filter((t) => t.id !== tree.id));
        toast(err instanceof Error ? err.message : '种树失败', 'error');
        throw err;
      }
      return tree;
    },
    [forest, trees, session.userId, toast],
  );

  const removeTree = useCallback(
    async (treeId: string) => {
      const tree = trees.find((t) => t.id === treeId);
      if (!tree) return;
      const removedEvents = events.filter((e) => e.treeId === treeId);
      setTrees((prev) => prev.filter((t) => t.id !== treeId));
      setEvents((prev) => prev.filter((e) => e.treeId !== treeId));
      try {
        await backend.deleteTree(treeId);
        toast(`「${tree.title}」已移出森林`, 'info');
      } catch (err) {
        setTrees((prev) => [...prev, tree]);
        setEvents((prev) => [...prev, ...removedEvents]);
        toast(err instanceof Error ? err.message : '移除失败', 'error');
      }
    },
    [trees, events, toast],
  );

  const addEvent = useCallback(
    async (treeId: string, title: string, note: string, dueDate: string | null) => {
      const event: GrowthEvent = {
        id: crypto.randomUUID(),
        treeId,
        userId: session.userId,
        title,
        note,
        dueDate,
        completedAt: null,
        createdAt: new Date().toISOString(),
      };
      setEvents((prev) => [...prev, event]);
      try {
        await backend.createEvent(event);
        sound.tick();
        toast('事件已添加', 'success');
      } catch (err) {
        setEvents((prev) => prev.filter((e) => e.id !== event.id));
        toast(err instanceof Error ? err.message : '添加失败', 'error');
        throw err;
      }
      return event;
    },
    [session.userId, toast],
  );

  const toggleEvent = useCallback(
    async (eventId: string) => {
      const ev = events.find((e) => e.id === eventId);
      if (!ev) return;
      const next = ev.completedAt ? null : new Date().toISOString();
      setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, completedAt: next } : e)));
      if (next) sound.complete();
      else sound.tick();
      try {
        await backend.setEventCompleted(eventId, next);
      } catch (err) {
        setEvents((prev) =>
          prev.map((e) => (e.id === eventId ? { ...e, completedAt: ev.completedAt } : e)),
        );
        toast(err instanceof Error ? err.message : '更新失败', 'error');
      }
    },
    [events, toast],
  );

  const editEvent = useCallback(
    async (eventId: string, patch: { title: string; note: string; dueDate: string | null }) => {
      const ev = events.find((e) => e.id === eventId);
      if (!ev) return;
      setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, ...patch } : e)));
      try {
        await backend.updateEvent(eventId, patch);
        sound.tick();
        toast('事件已更新', 'success');
      } catch (err) {
        setEvents((prev) => prev.map((e) => (e.id === eventId ? ev : e)));
        toast(err instanceof Error ? err.message : '编辑失败', 'error');
        throw err;
      }
    },
    [events, toast],
  );

  const removeEvent = useCallback(
    async (eventId: string) => {
      const ev = events.find((e) => e.id === eventId);
      if (!ev) return;
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      try {
        await backend.deleteEvent(eventId);
        sound.undo();
        toast('事件已删除', 'info', {
          label: '撤销',
          run: () => {
            setEvents((prev) => [...prev, ev]);
            void backend.createEvent(ev).catch(() => {
              setEvents((prev) => prev.filter((e) => e.id !== ev.id));
              toast('撤销失败，请重试', 'error');
            });
          },
        });
      } catch (err) {
        setEvents((prev) => [...prev, ev]);
        toast(err instanceof Error ? err.message : '删除失败', 'error');
      }
    },
    [events, toast],
  );

  const eventsByTree = useMemo(() => {
    const map = new Map<string, GrowthEvent[]>();
    for (const e of events) {
      const list = map.get(e.treeId) ?? [];
      list.push(e);
      map.set(e.treeId, list);
    }
    return map;
  }, [events]);

  const stats: ForestStats = useMemo(() => {
    const done = events.filter((e) => e.completedAt);
    const days = new Set(done.map((e) => dayKey(e.completedAt!)));
    let streak = 0;
    const cursor = new Date();
    if (!days.has(dayKey(cursor.toISOString()))) cursor.setDate(cursor.getDate() - 1);
    while (days.has(dayKey(cursor.toISOString()))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return {
      treeCount: trees.length,
      eventCount: events.length,
      doneCount: done.length,
      rate: events.length ? done.length / events.length : 0,
      streak,
    };
  }, [trees, events]);

  return {
    forest,
    trees,
    events,
    eventsByTree,
    stats,
    loading,
    ready,
    createForest,
    plantTree,
    removeTree,
    addEvent,
    editEvent,
    toggleEvent,
    removeEvent,
  };
}

export type ForestData = ReturnType<typeof useForestData>;