import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  DragOverEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { getStudyByToken, saveSortState, submitSession } from '../../api/participant';
import Button from '../../components/Button';
import type { Card, Category } from '../../types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ParticipantCategory {
  id?: number;
  tempId: string;  // always set; DB id is optional until persisted
  label: string;
  cardIds: number[];
  position: { x: number; y: number };
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function SortCanvasPage() {
  const { token } = useParams<{ token: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const sessionId: number = location.state?.sessionId;

  const { data: study } = useQuery({
    queryKey: ['p-study', token],
    queryFn: () => getStudyByToken(token!),
  });

  const [unsortedCards, setUnsortedCards] = useState<number[]>([]);
  const [categories, setCategories] = useState<ParticipantCategory[]>([]);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Redirect if no session
  useEffect(() => {
    if (!sessionId) navigate(`/s/${token}`);
  }, [sessionId, navigate, token]);

  // Initialize unsorted cards from study
  useEffect(() => {
    if (!study) return;
    const researcherCats = study.researcherCategories ?? [];
    setUnsortedCards(study.cards.map((c) => c.id));

    // For CLOSED/HYBRID: pre-populate researcher-defined categories
    if (study.type !== 'OPEN' && researcherCats.length > 0) {
      setCategories(
        researcherCats.map((cat, i) => ({
          tempId: `researcher_${cat.id}`,
          id: undefined, // we'll create participant-side copies
          label: cat.label,
          cardIds: [],
          position: { x: 20 + (i % 3) * 240, y: 20 + Math.floor(i / 3) * 200 },
        }))
      );
    }
  }, [study]);

  // Auto-save
  const autoSave = useCallback(async () => {
    if (!token || !sessionId || !study) return;
    const sorts = study.cards.map((card) => {
      const cat = categories.find((c) => c.cardIds.includes(card.id));
      return { cardId: card.id, categoryId: cat ? (cat.id ?? cat.tempId) : null };
    });
    const catsPayload = categories.map((c) => ({
      id: c.id,
      tempId: c.tempId,
      label: c.label,
    }));
    await saveSortState(token, sessionId, { sorts, categories: catsPayload });
  }, [token, sessionId, study, categories]);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(autoSave, 1500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [autoSave]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const allSorted = study
    ? unsortedCards.length === 0
    : false;

  const canSubmit = study && (study.allowUnsorted || allSorted);

  const makeNewCategory = (x: number, y: number, firstCardId: number): ParticipantCategory => ({
    tempId: `cat_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    label: 'New Group',
    cardIds: [firstCardId],
    position: { x, y },
  });

  const handleDragStart = (event: DragStartEvent) => {
    if (!study) return;
    const card = study.cards.find((c) => c.id === event.active.id);
    setActiveCard(card ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over || !study) return;

    const cardId = active.id as number;
    const overId = over.id as string;

    // Remove card from wherever it currently is
    setUnsortedCards((prev) => prev.filter((id) => id !== cardId));
    setCategories((prev) => prev.map((cat) => ({
      ...cat,
      cardIds: cat.cardIds.filter((id) => id !== cardId),
    })));

    if (overId === 'unsorted') {
      // Drop back to unsorted pile
      setUnsortedCards((prev) => [...prev, cardId]);
      return;
    }

    if (overId.startsWith('cat_') || overId.startsWith('researcher_')) {
      // Drop onto existing category
      setCategories((prev) =>
        prev.map((cat) =>
          cat.tempId === overId ? { ...cat, cardIds: [...cat.cardIds, cardId] } : cat
        )
      );
      return;
    }

    if (overId.startsWith('card_')) {
      // Drop onto another card — create new category or merge
      const targetCardId = parseInt(overId.replace('card_', ''));
      const existingCat = categories.find((c) => c.cardIds.includes(targetCardId));

      if (existingCat) {
        // Add to that category
        setCategories((prev) =>
          prev.map((cat) =>
            cat.tempId === existingCat.tempId ? { ...cat, cardIds: [...cat.cardIds, cardId] } : cat
          )
        );
      } else {
        // Create new category from the two cards
        const rect = document.getElementById(`card-node-${targetCardId}`)?.getBoundingClientRect();
        const newCat = makeNewCategory(
          rect ? rect.left + 60 : 100,
          rect ? rect.top - 60 : 100,
          targetCardId
        );
        newCat.cardIds.push(cardId);
        // Remove target card from unsorted too
        setUnsortedCards((prev) => prev.filter((id) => id !== targetCardId));
        setCategories((prev) => [...prev, newCat]);
      }
    }

    // Drop onto canvas background — create new category at drop position
    if (overId === 'canvas') {
      const x = (event.delta.x + 200) % 600 + 50;
      const y = (event.delta.y + 100) % 400 + 50;
      const newCat = makeNewCategory(x, y, cardId);
      setCategories((prev) => [...prev, newCat]);
    }
  };

  const handleSubmit = async () => {
    if (!token || !sessionId || !study) return;
    setSubmitting(true);
    try {
      await autoSave();
      await submitSession(token, sessionId);
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      setSubmitting(false);
    }
  };

  const removeCategory = (tempId: string) => {
    const cat = categories.find((c) => c.tempId === tempId);
    if (!cat) return;
    setUnsortedCards((prev) => [...prev, ...cat.cardIds]);
    setCategories((prev) => prev.filter((c) => c.tempId !== tempId));
  };

  const updateCategoryLabel = (tempId: string, label: string) => {
    setCategories((prev) => prev.map((c) => c.tempId === tempId ? { ...c, label } : c));
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank you!</h1>
          <p className="text-gray-600">Your card sort has been submitted successfully.</p>
        </div>
      </div>
    );
  }

  if (!study) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  }

  const cards = study.cards;

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="font-semibold text-gray-900 text-sm">{study.title}</h1>
          <p className="text-xs text-gray-400">
            {unsortedCards.length} unsorted · {categories.length} groups
          </p>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          loading={submitting}
          size="sm"
        >
          Submit
        </Button>
      </header>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel: unsorted cards */}
          <UnsortedPanel
            cards={cards.filter((c) => unsortedCards.includes(c.id))}
          />

          {/* Canvas */}
          <CanvasArea
            cards={cards}
            categories={categories}
            editingCatId={editingCatId}
            editLabel={editLabel}
            onStartEdit={(cat) => { setEditingCatId(cat.tempId); setEditLabel(cat.label); }}
            onSaveEdit={(tempId) => { updateCategoryLabel(tempId, editLabel); setEditingCatId(null); }}
            onRemoveCategory={removeCategory}
            onSetLabel={setEditLabel}
          />
        </div>

        <DragOverlay>
          {activeCard && (
            <div className="bg-white border-2 border-blue-400 rounded-lg px-3 py-2 shadow-xl text-sm font-medium text-gray-800 max-w-[160px]">
              {activeCard.name}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// ─── Unsorted Panel ───────────────────────────────────────────────────────────

function UnsortedPanel({ cards }: { cards: Card[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'unsorted' });

  return (
    <div
      ref={setNodeRef}
      className={`w-52 shrink-0 bg-white border-r border-gray-200 flex flex-col ${isOver ? 'bg-blue-50' : ''}`}
    >
      <div className="px-3 py-2 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Unsorted ({cards.length})
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {cards.length === 0 ? (
          <p className="text-xs text-gray-300 text-center pt-8">All cards sorted!</p>
        ) : (
          cards.map((card) => <DraggableCard key={card.id} card={card} inUnsorted />)
        )}
      </div>
    </div>
  );
}

// ─── Canvas Area ──────────────────────────────────────────────────────────────

interface CanvasAreaProps {
  cards: Card[];
  categories: ParticipantCategory[];
  editingCatId: string | null;
  editLabel: string;
  onStartEdit: (cat: ParticipantCategory) => void;
  onSaveEdit: (tempId: string) => void;
  onRemoveCategory: (tempId: string) => void;
  onSetLabel: (label: string) => void;
}

function CanvasArea({
  cards, categories, editingCatId, editLabel,
  onStartEdit, onSaveEdit, onRemoveCategory, onSetLabel
}: CanvasAreaProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas' });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 relative overflow-auto ${isOver ? 'bg-blue-50/30' : 'bg-gray-50'}`}
      style={{ minHeight: '100%' }}
    >
      {categories.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-gray-300 text-sm">Drag cards here to create groups</p>
        </div>
      )}

      {categories.map((cat) => (
        <CategoryCard
          key={cat.tempId}
          cat={cat}
          cards={cards.filter((c) => cat.cardIds.includes(c.id))}
          isEditing={editingCatId === cat.tempId}
          editLabel={editLabel}
          onStartEdit={() => onStartEdit(cat)}
          onSaveEdit={() => onSaveEdit(cat.tempId)}
          onRemove={() => onRemoveCategory(cat.tempId)}
          onSetLabel={onSetLabel}
        />
      ))}
    </div>
  );
}

// ─── Category Card ────────────────────────────────────────────────────────────

interface CategoryCardProps {
  cat: ParticipantCategory;
  cards: Card[];
  isEditing: boolean;
  editLabel: string;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onRemove: () => void;
  onSetLabel: (label: string) => void;
}

function CategoryCard({
  cat, cards, isEditing, editLabel,
  onStartEdit, onSaveEdit, onRemove, onSetLabel
}: CategoryCardProps) {
  const { setNodeRef, isOver } = useDroppable({ id: cat.tempId });
  const [pos, setPos] = useState(cat.position);
  const dragging = useRef(false);
  const startPos = useRef({ mx: 0, my: 0, cx: 0, cy: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
    dragging.current = true;
    startPos.current = { mx: e.clientX, my: e.clientY, cx: pos.x, cy: pos.y };
    e.preventDefault();
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - startPos.current.mx;
      const dy = e.clientY - startPos.current.my;
      setPos({ x: Math.max(0, startPos.current.cx + dx), y: Math.max(0, startPos.current.cy + dy) });
    };
    const onMouseUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, []);

  return (
    <div
      ref={setNodeRef}
      className={`absolute select-none rounded-xl border-2 shadow-sm transition-shadow ${
        isOver ? 'border-blue-400 bg-blue-50 shadow-md' : 'border-gray-200 bg-white'
      }`}
      style={{ left: pos.x, top: pos.y, minWidth: 180, maxWidth: 240, cursor: 'grab' }}
      onMouseDown={onMouseDown}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        {isEditing ? (
          <div data-no-drag className="flex items-center gap-1 flex-1">
            <input
              autoFocus
              value={editLabel}
              onChange={(e) => onSetLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSaveEdit(); }}
              className="flex-1 text-sm border border-blue-400 rounded px-1 py-0.5 focus:outline-none"
            />
            <button onClick={onSaveEdit} className="text-blue-600 text-xs px-1">✓</button>
          </div>
        ) : (
          <button
            data-no-drag
            onDoubleClick={onStartEdit}
            onClick={onStartEdit}
            className="text-sm font-medium text-gray-800 truncate flex-1 text-left hover:text-blue-600"
          >
            {cat.label}
          </button>
        )}
        <button
          data-no-drag
          onClick={onRemove}
          className="text-gray-300 hover:text-red-400 text-xs ml-1 shrink-0"
        >
          ✕
        </button>
      </div>

      {/* Cards in category */}
      <div className="p-2 space-y-1 min-h-[40px]">
        {cards.map((card) => (
          <DraggableCard key={card.id} card={card} inCategory />
        ))}
        {cards.length === 0 && (
          <p className="text-xs text-gray-300 text-center py-1">Drop cards here</p>
        )}
      </div>
    </div>
  );
}

// ─── Draggable Card ───────────────────────────────────────────────────────────

function DraggableCard({ card, inUnsorted, inCategory }: { card: Card; inUnsorted?: boolean; inCategory?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
  });

  const { setNodeRef: dropRef, isOver } = useDroppable({ id: `card_${card.id}` });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  // Merge refs
  const ref = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    dropRef(node);
  };

  return (
    <div
      ref={ref}
      id={`card-node-${card.id}`}
      {...listeners}
      {...attributes}
      style={style}
      className={`px-3 py-2 rounded-lg text-sm font-medium cursor-grab active:cursor-grabbing select-none transition-colors ${
        inUnsorted
          ? 'bg-blue-50 border border-blue-200 text-blue-800 hover:bg-blue-100'
          : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
      } ${isOver ? 'ring-2 ring-blue-400' : ''}`}
    >
      {card.name}
      {card.description && (
        <p className="text-xs text-gray-400 mt-0.5 font-normal">{card.description}</p>
      )}
    </div>
  );
}
