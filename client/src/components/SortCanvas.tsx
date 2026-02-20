import React, { useState, useEffect, useRef } from 'react';
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
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import Button from './Button';
import type { Card, Category } from '../types';

export interface ParticipantCategory {
  id?: number;
  tempId: string;
  label: string;
  cardIds: number[];
  position: { x: number; y: number };
}

export interface SortState {
  sorts: { cardId: number; categoryId?: number | string | null }[];
  categories: { id?: number; tempId?: string; label: string }[];
}

interface SortCanvasProps {
  studyTitle: string;
  studyType: string;
  allowUnsorted: boolean;
  cards: Card[];
  researcherCategories: Category[];
  /** Called when participant clicks Submit. Omit in preview mode. */
  onSubmit?: (state: SortState) => Promise<void>;
  /** Called when researcher clicks Exit Preview. */
  onExitPreview?: () => void;
  preview?: boolean;
}

export default function SortCanvas({
  studyTitle,
  studyType,
  allowUnsorted,
  cards,
  researcherCategories,
  onSubmit,
  onExitPreview,
  preview = false,
}: SortCanvasProps) {
  const [unsortedCards, setUnsortedCards] = useState<number[]>([]);
  const [categories, setCategories] = useState<ParticipantCategory[]>([]);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  useEffect(() => {
    setUnsortedCards(cards.map((c) => c.id));
    if (studyType !== 'OPEN' && researcherCategories.length > 0) {
      setCategories(
        researcherCategories.map((cat, i) => ({
          tempId: `researcher_${cat.id}`,
          label: cat.label,
          cardIds: [],
          position: { x: 20 + (i % 3) * 240, y: 20 + Math.floor(i / 3) * 200 },
        }))
      );
    }
  }, [cards, studyType, researcherCategories]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const allSorted = unsortedCards.length === 0;
  const canSubmit = allowUnsorted || allSorted;

  const makeNewCategory = (x: number, y: number, firstCardId: number): ParticipantCategory => ({
    tempId: `cat_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    label: 'New Group',
    cardIds: [firstCardId],
    position: { x, y },
  });

  const handleDragStart = (event: DragStartEvent) => {
    const card = cards.find((c) => c.id === event.active.id);
    setActiveCard(card ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const cardId = active.id as number;
    const overId = over.id as string;

    setUnsortedCards((prev) => prev.filter((id) => id !== cardId));
    setCategories((prev) => prev.map((cat) => ({
      ...cat,
      cardIds: cat.cardIds.filter((id) => id !== cardId),
    })));

    if (overId === 'unsorted') {
      setUnsortedCards((prev) => [...prev, cardId]);
      return;
    }

    if (overId.startsWith('cat_') || overId.startsWith('researcher_')) {
      setCategories((prev) =>
        prev.map((cat) =>
          cat.tempId === overId ? { ...cat, cardIds: [...cat.cardIds, cardId] } : cat
        )
      );
      return;
    }

    if (overId.startsWith('card_')) {
      const targetCardId = parseInt(overId.replace('card_', ''));
      const existingCat = categories.find((c) => c.cardIds.includes(targetCardId));
      if (existingCat) {
        setCategories((prev) =>
          prev.map((cat) =>
            cat.tempId === existingCat.tempId ? { ...cat, cardIds: [...cat.cardIds, cardId] } : cat
          )
        );
      } else {
        const rect = document.getElementById(`card-node-${targetCardId}`)?.getBoundingClientRect();
        const newCat = makeNewCategory(
          rect ? rect.left + 60 : 100,
          rect ? rect.top - 60 : 100,
          targetCardId
        );
        newCat.cardIds.push(cardId);
        setUnsortedCards((prev) => prev.filter((id) => id !== targetCardId));
        setCategories((prev) => [...prev, newCat]);
      }
      return;
    }

    if (overId === 'canvas') {
      const x = (event.delta.x + 200) % 600 + 50;
      const y = (event.delta.y + 100) % 400 + 50;
      setCategories((prev) => [...prev, makeNewCategory(x, y, cardId)]);
    }
  };

  const handleSubmit = async () => {
    if (!onSubmit) return;
    setSubmitting(true);
    try {
      const sorts = cards.map((card) => {
        const cat = categories.find((c) => c.cardIds.includes(card.id));
        return { cardId: card.id, categoryId: cat ? (cat.id ?? cat.tempId) : null };
      });
      const catsPayload = categories.map((c) => ({ id: c.id, tempId: c.tempId, label: c.label }));
      await onSubmit({ sorts, categories: catsPayload });
    } catch {
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

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Preview banner */}
      {preview && (
        <div className="bg-amber-400 text-amber-900 text-sm font-medium px-4 py-2 flex items-center justify-between shrink-0">
          <span>Preview Mode — this is how participants will see your study. No data is saved.</span>
          <button
            onClick={onExitPreview}
            className="text-amber-900 hover:text-amber-700 underline text-sm"
          >
            Exit Preview
          </button>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="font-semibold text-gray-900 text-sm">{studyTitle}</h1>
          <p className="text-xs text-gray-400">
            {unsortedCards.length} unsorted · {categories.length} groups
          </p>
        </div>
        {preview ? (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
            Preview
          </span>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            loading={submitting}
            size="sm"
          >
            Submit
          </Button>
        )}
      </header>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 overflow-hidden">
          <UnsortedPanel cards={cards.filter((c) => unsortedCards.includes(c.id))} />
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
    <div ref={setNodeRef} className={`w-52 shrink-0 bg-white border-r border-gray-200 flex flex-col ${isOver ? 'bg-blue-50' : ''}`}>
      <div className="px-3 py-2 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Unsorted ({cards.length})</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {cards.length === 0
          ? <p className="text-xs text-gray-300 text-center pt-8">All cards sorted!</p>
          : cards.map((card) => <DraggableCard key={card.id} card={card} inUnsorted />)
        }
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

function CanvasArea({ cards, categories, editingCatId, editLabel, onStartEdit, onSaveEdit, onRemoveCategory, onSetLabel }: CanvasAreaProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas' });
  return (
    <div ref={setNodeRef} className={`flex-1 relative overflow-auto ${isOver ? 'bg-blue-50/30' : 'bg-gray-50'}`} style={{ minHeight: '100%' }}>
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

function CategoryCard({ cat, cards, isEditing, editLabel, onStartEdit, onSaveEdit, onRemove, onSetLabel }: CategoryCardProps) {
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
      className={`absolute select-none rounded-xl border-2 shadow-sm transition-shadow ${isOver ? 'border-blue-400 bg-blue-50 shadow-md' : 'border-gray-200 bg-white'}`}
      style={{ left: pos.x, top: pos.y, minWidth: 180, maxWidth: 240, cursor: 'grab' }}
      onMouseDown={onMouseDown}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        {isEditing ? (
          <div data-no-drag className="flex items-center gap-1 flex-1">
            <input autoFocus value={editLabel} onChange={(e) => onSetLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSaveEdit(); }}
              className="flex-1 text-sm border border-blue-400 rounded px-1 py-0.5 focus:outline-none" />
            <button onClick={onSaveEdit} className="text-blue-600 text-xs px-1">✓</button>
          </div>
        ) : (
          <button data-no-drag onClick={onStartEdit}
            className="text-sm font-medium text-gray-800 truncate flex-1 text-left hover:text-blue-600">
            {cat.label}
          </button>
        )}
        <button data-no-drag onClick={onRemove} className="text-gray-300 hover:text-red-400 text-xs ml-1 shrink-0">✕</button>
      </div>
      <div className="p-2 space-y-1 min-h-[40px]">
        {cards.map((card) => <DraggableCard key={card.id} card={card} inCategory />)}
        {cards.length === 0 && <p className="text-xs text-gray-300 text-center py-1">Drop cards here</p>}
      </div>
    </div>
  );
}

// ─── Draggable Card ───────────────────────────────────────────────────────────

function DraggableCard({ card, inUnsorted, inCategory }: { card: Card; inUnsorted?: boolean; inCategory?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id });
  const { setNodeRef: dropRef, isOver } = useDroppable({ id: `card_${card.id}` });

  const ref = (node: HTMLDivElement | null) => { setNodeRef(node); dropRef(node); };

  return (
    <div
      ref={ref}
      id={`card-node-${card.id}`}
      {...listeners}
      {...attributes}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }}
      className={`px-3 py-2 rounded-lg text-sm font-medium cursor-grab active:cursor-grabbing select-none transition-colors ${
        inUnsorted ? 'bg-blue-50 border border-blue-200 text-blue-800 hover:bg-blue-100' : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
      } ${isOver ? 'ring-2 ring-blue-400' : ''}`}
    >
      {card.name}
      {card.description && <p className="text-xs text-gray-400 mt-0.5 font-normal">{card.description}</p>}
    </div>
  );
}
