import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useForestData } from '../hooks/useForestData';
import { ForestScene, type Burst } from '../components/scene/ForestScene';
import { LogoSign } from '../components/chrome/LogoSign';
import { UserChip } from '../components/chrome/UserChip';
import { StatsCard } from '../components/stats/StatsCard';
import { EventPanel } from '../components/events/EventPanel';
import { EventForm } from '../components/events/EventForm';
import { PlantTreeModal } from '../components/tree/PlantTreeModal';
import { JournalModal } from '../components/journal/JournalModal';
import { Onboarding } from '../components/Onboarding';
import { Fab } from '../components/ui/Fab';
import { generateTreeVisual } from '../lib/treeGen';
import { sound } from '../lib/sound';
import type { GrowthEvent } from '../types';

export function HomePage() {
  const { session, signOut } = useAuth();
  const data = useForestData(session!);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState<'event' | 'plant' | 'journal' | null>(null);
  const [eventTreeId, setEventTreeId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<GrowthEvent | null>(null);
  const [burst, setBurst] = useState<Burst | null>(null);
  const [muted, setMuted] = useState(sound.isMuted());
  const [statsOpen, setStatsOpen] = useState(false);
  const burstTimer = useRef(0);

  const selectedTree = data.trees.find((t) => t.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId && !data.trees.some((t) => t.id === selectedId)) setSelectedId(null);
  }, [selectedId, data.trees]);

  useEffect(() => () => window.clearTimeout(burstTimer.current), []);

  const handleToggle = useCallback(
    (eventId: string) => {
      const ev = data.events.find((e) => e.id === eventId);
      if (ev && !ev.completedAt) {
        const tree = data.trees.find((t) => t.id === ev.treeId);
        if (tree) {
          const visual = generateTreeVisual(tree.seed, session!.profile.birthYear);
          const y = tree.y - (visual.height + visual.canopy[0].r * 0.4) * tree.scale;
          setBurst({ key: Date.now(), x: tree.x, y });
          window.clearTimeout(burstTimer.current);
          burstTimer.current = window.setTimeout(() => setBurst(null), 1500);
        }
      }
      void data.toggleEvent(eventId);
    },
    [data, session],
  );

  const openAddEvent = () => {
    sound.open();
    setEditingEvent(null);
    setEventTreeId(selectedId);
    setModal('event');
  };

  const openPlant = () => {
    sound.open();
    setModal('plant');
  };

  const toggleMute = () => {
    const next = !muted;
    sound.setMuted(next);
    setMuted(next);
    if (!next) sound.tick();
  };

  if (data.loading || !data.ready) {
    return (
      <div className="splash">
        <svg viewBox="0 0 64 64" width="64" height="64" className="splash-leaf">
          <path d="M32 4 C50 14 58 34 32 60 C6 34 14 14 32 4 Z" fill="#5aa845" />
          <path d="M32 10 L32 54 M32 24 L22 18 M32 24 L42 18 M32 36 L20 29 M32 36 L44 29" stroke="#fdf6e3" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        </svg>
        <p>正在唤醒森林…</p>
      </div>
    );
  }

  return (
    <div className={`home ${selectedTree ? 'home-with-panel' : ''}`}>
      <main className="home-scene">
        <ForestScene
          trees={data.trees}
          eventsByTree={data.eventsByTree}
          birthYear={session!.profile.birthYear}
          selectedTreeId={selectedId}
          onSelect={(id) => {
            if (id) sound.open();
            setSelectedId(id);
          }}
          burst={burst}
        />
        {data.forest && data.trees.length === 0 && (
          <div className="empty-hint">
            <p>森林还空着，种下第一棵树吧</p>
            <button className="btn btn-primary" onClick={openPlant}>
              种下第一棵树
            </button>
          </div>
        )}
        {!selectedTree && data.trees.length > 0 && (
          <div className="hint-pill">
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden>
              <rect x="7" y="3" width="10" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
              <line x1="12" y1="7" x2="12" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="hint-desktop">点击一棵树，查看或添加你的事件吧!</span>
            <span className="hint-mobile">点击树木查看事件</span>
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
              <path d="M12 3 C18 7 20 13 12 21 C4 13 6 7 12 3 Z" fill="#8fce6f" />
            </svg>
          </div>
        )}
      </main>

      <LogoSign />
      <UserChip
        nickname={session!.profile.nickname}
        muted={muted}
        onToggleMute={toggleMute}
        onSignOut={() => void signOut()}
        onToggleStats={() => setStatsOpen((v) => !v)}
        statsOpen={statsOpen}
      />
      <StatsCard stats={data.stats} open={statsOpen} />

      {selectedTree && (
        <EventPanel
          tree={selectedTree}
          events={data.eventsByTree.get(selectedTree.id) ?? []}
          onClose={() => setSelectedId(null)}
          onToggle={handleToggle}
          onEdit={(ev) => {
            sound.open();
            setEditingEvent(ev);
            setModal('event');
          }}
          onDelete={(id) => void data.removeEvent(id)}
          onQuickAdd={(title) => data.addEvent(selectedTree.id, title, '', null)}
          onRemoveTree={(id) => {
            setSelectedId(null);
            void data.removeTree(id);
          }}
        />
      )}

      <Fab
        onAddEvent={openAddEvent}
        onPlantTree={openPlant}
        onOpenJournal={() => {
          sound.open();
          setModal('journal');
        }}
        disabled={!data.forest}
      />

      {modal === 'event' && (
        <EventForm
          trees={data.trees}
          initialTreeId={eventTreeId}
          editing={editingEvent}
          onClose={() => {
            setModal(null);
            setEditingEvent(null);
          }}
          onSubmit={
            editingEvent
              ? (_treeId, title, note, dueDate) => data.editEvent(editingEvent.id, { title, note, dueDate })
              : data.addEvent
          }
          onGoPlant={() => setModal('plant')}
        />
      )}
      {modal === 'plant' && (
        <PlantTreeModal birthYear={session!.profile.birthYear} onClose={() => setModal(null)} onSubmit={data.plantTree} />
      )}
      {modal === 'journal' && <JournalModal trees={data.trees} events={data.events} onClose={() => setModal(null)} />}
      {!data.forest && (
        <Onboarding nickname={session!.profile.nickname} birthYear={session!.profile.birthYear} onCreate={data.createForest} />
      )}
    </div>
  );
}