import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getStudy, updateStudy, publishStudy, closeStudy,
  getCards, createCard, updateCard, deleteCard, bulkUploadCards,
  getCategories, createCategory, updateCategory, deleteCategory,
} from '../../api/studies';
import NavBar from '../../components/NavBar';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import type { Card, Category } from '../../types';

type Tab = 'settings' | 'cards' | 'categories' | 'instructions' | 'share';

export default function StudyEditPage() {
  const { id } = useParams<{ id: string }>();
  const studyId = parseInt(id!);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('settings');

  const { data: study, isLoading } = useQuery({
    queryKey: ['study', studyId],
    queryFn: () => getStudy(studyId),
  });

  const publishMutation = useMutation({
    mutationFn: () => publishStudy(studyId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['study', studyId] }),
  });

  const closeMutation = useMutation({
    mutationFn: () => closeStudy(studyId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['study', studyId] }),
  });

  if (isLoading) return <div className="min-h-screen bg-gray-50"><NavBar /><p className="p-8 text-gray-400 text-sm">Loading...</p></div>;
  if (!study) return <div className="min-h-screen bg-gray-50"><NavBar /><p className="p-8 text-red-400 text-sm">Study not found</p></div>;

  const shareUrl = `${window.location.origin}/s/${study.shareToken}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
            <h1 className="text-2xl font-bold text-gray-900">{study.title}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              study.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700' :
              study.status === 'CLOSED' ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-700'
            }`}>{study.status}</span>
          </div>
          <div className="flex items-center gap-2">
            {study.status === 'DRAFT' && (
              <Button size="sm" onClick={() => publishMutation.mutate()} loading={publishMutation.isPending}>
                Publish
              </Button>
            )}
            {study.status === 'PUBLISHED' && (
              <Button size="sm" variant="danger" onClick={() => closeMutation.mutate()} loading={closeMutation.isPending}>
                Close Study
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/studies/${studyId}/preview`)}
            >
              Preview
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
          {(['settings', 'cards', 'categories', 'instructions', 'share'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                tab === t ? 'bg-white shadow text-brand-500' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'settings' && <SettingsTab study={study} />}
        {tab === 'cards' && <CardsTab studyId={studyId} />}
        {tab === 'categories' && (
          study.type === 'OPEN'
            ? <p className="text-gray-500 text-sm">Categories are participant-defined for Open studies.</p>
            : <CategoriesTab studyId={studyId} />
        )}
        {tab === 'instructions' && <InstructionsTab study={study} />}
        {tab === 'share' && <ShareTab shareUrl={shareUrl} study={study} />}
      </main>
    </div>
  );
}

// ─── Cards Tab ─────────────────────────────────────────────────────────────

function CardsTab({ studyId }: { studyId: number }) {
  const qc = useQueryClient();
  const { data: cards = [] } = useQuery({ queryKey: ['cards', studyId], queryFn: () => getCards(studyId) });
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);

  const addMutation = useMutation({
    mutationFn: () => createCard(studyId, { name: newName, description: newDesc }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cards', studyId] }); setNewName(''); setNewDesc(''); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ cardId, name, description }: { cardId: number; name: string; description: string }) =>
      updateCard(studyId, cardId, { name, description }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cards', studyId] }); setEditingId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (cardId: number) => deleteCard(studyId, cardId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cards', studyId] }),
  });

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setUploading(true);
    try {
      await bulkUploadCards(studyId, file);
      await qc.invalidateQueries({ queryKey: ['cards', studyId] });
    } catch (err: any) {
      setUploadError(err?.response?.data?.error || 'Upload failed. Check your CSV format.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-medium text-gray-800 mb-3">Add Card</h2>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Card name *"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <Button onClick={() => addMutation.mutate()} disabled={!newName.trim()} loading={addMutation.isPending}>
            Add
          </Button>
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
          <span>or</span>
          <label className={`cursor-pointer text-blue-600 hover:underline ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            {uploading ? 'Uploading…' : 'Upload CSV'}
            <input type="file" accept=".csv" onChange={handleBulkUpload} className="hidden" disabled={uploading} />
          </label>
          <span className="text-xs">(columns: name, description)</span>
        </div>
        {uploadError && (
          <p className="mt-2 text-sm text-red-500">{uploadError}</p>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {cards.length === 0 ? (
          <p className="text-gray-400 text-sm p-6 text-center">No cards yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cards.map((card: Card) => (
                <tr key={card.id}>
                  <td className="px-4 py-2">
                    {editingId === card.id ? (
                      <input value={editName} onChange={(e) => setEditName(e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-full" />
                    ) : card.name}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {editingId === card.id ? (
                      <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-full" />
                    ) : card.description}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2 justify-end">
                      {editingId === card.id ? (
                        <>
                          <button className="text-blue-600 text-xs" onClick={() =>
                            updateMutation.mutate({ cardId: card.id, name: editName, description: editDesc })
                          }>Save</button>
                          <button className="text-gray-400 text-xs" onClick={() => setEditingId(null)}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button className="text-blue-600 text-xs" onClick={() => {
                            setEditingId(card.id); setEditName(card.name); setEditDesc(card.description);
                          }}>Edit</button>
                          <button className="text-red-400 text-xs" onClick={() => deleteMutation.mutate(card.id)}>Del</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Categories Tab ─────────────────────────────────────────────────────────

function CategoriesTab({ studyId }: { studyId: number }) {
  const qc = useQueryClient();
  const { data: categories = [] } = useQuery({
    queryKey: ['categories', studyId],
    queryFn: () => getCategories(studyId),
  });
  const [newLabel, setNewLabel] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const addMutation = useMutation({
    mutationFn: () => createCategory(studyId, newLabel),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories', studyId] }); setNewLabel(''); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ catId, label }: { catId: number; label: string }) => updateCategory(studyId, catId, label),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories', studyId] }); setEditingId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (catId: number) => deleteCategory(studyId, catId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories', studyId] }),
  });

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex gap-2">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Category label"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <Button onClick={() => addMutation.mutate()} disabled={!newLabel.trim()}>Add</Button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {categories.length === 0 ? (
          <p className="text-gray-400 text-sm p-6 text-center">No categories yet</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {categories.map((cat: Category) => (
              <li key={cat.id} className="flex items-center px-4 py-3 gap-3">
                {editingId === cat.id ? (
                  <>
                    <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)}
                      className="border rounded px-2 py-1 text-sm flex-1" />
                    <button className="text-blue-600 text-sm" onClick={() =>
                      updateMutation.mutate({ catId: cat.id, label: editLabel })}>Save</button>
                    <button className="text-gray-400 text-sm" onClick={() => setEditingId(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm">{cat.label}</span>
                    <button className="text-blue-600 text-xs" onClick={() => { setEditingId(cat.id); setEditLabel(cat.label); }}>Edit</button>
                    <button className="text-red-400 text-xs" onClick={() => deleteMutation.mutate(cat.id)}>Delete</button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Settings Tab ────────────────────────────────────────────────────────────

function SettingsTab({ study }: { study: ReturnType<typeof useQuery<any>>['data'] }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(study.title);
  const [description, setDescription] = useState(study.description);
  const [type, setType] = useState(study.type);
  const [allowUnsorted, setAllowUnsorted] = useState(study.allowUnsorted);
  const [maxParticipants, setMaxParticipants] = useState(study.maxParticipants?.toString() ?? '');
  const [endsAt, setEndsAt] = useState(study.endsAt ? study.endsAt.slice(0, 10) : '');
  const [saved, setSaved] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () => updateStudy(study.id, {
      title, description, type, allowUnsorted,
      maxParticipants: maxParticipants ? parseInt(maxParticipants) : undefined,
      endsAt: endsAt || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['study', study.id] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Study Type</label>
        <div className="grid grid-cols-3 gap-3">
          {([
            { value: 'OPEN', label: 'Open', desc: 'Participants create all categories' },
            { value: 'CLOSED', label: 'Closed', desc: 'Researcher defines all categories' },
            { value: 'HYBRID', label: 'Hybrid', desc: 'Mix of researcher and participant categories' },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value)}
              className={`text-left p-3 rounded-lg border-2 transition-colors ${
                type === opt.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className={`text-sm font-medium ${type === opt.value ? 'text-blue-700' : 'text-gray-800'}`}>
                {opt.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max participants</label>
          <input type="number" value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value)}
            placeholder="Unlimited" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
          <input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="allowUnsorted" checked={allowUnsorted}
          onChange={(e) => setAllowUnsorted(e.target.checked)} />
        <label htmlFor="allowUnsorted" className="text-sm text-gray-700">
          Allow participants to leave cards unsorted
        </label>
      </div>

      <div className="pt-1">
        <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
          {saved ? 'Saved!' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}

// ─── Instructions Tab ─────────────────────────────────────────────────────────

function InstructionsTab({ study }: { study: ReturnType<typeof useQuery<any>>['data'] }) {
  const qc = useQueryClient();
  const [instructions, setInstructions] = useState(study.instructions ?? '');
  const [saved, setSaved] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () => updateStudy(study.id, { instructions }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['study', study.id] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Participant Instructions
        </label>
        <p className="text-xs text-gray-500 mb-2">
          These instructions are shown to participants on the study landing page, below the description.
          Use this to explain how you'd like them to approach the sorting task.
        </p>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={8}
          placeholder={`e.g. "Please sort these cards into groups that make sense to you. There are no right or wrong answers — we're interested in how you naturally think about these topics."`}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
        {saved ? 'Saved!' : 'Save Instructions'}
      </Button>
    </div>
  );
}

// ─── Share Tab ────────────────────────────────────────────────────────────────

function ShareTab({ shareUrl, study }: { shareUrl: string; study: any }) {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
      <h2 className="font-medium text-gray-800">Share Link</h2>
      {study.status !== 'PUBLISHED' && (
        <p className="text-yellow-600 text-sm bg-yellow-50 rounded-lg p-3">
          Publish the study first to allow participants to access it.
        </p>
      )}
      <div className="flex gap-2">
        <input
          readOnly
          value={shareUrl}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 font-mono"
        />
        <Button variant="secondary" onClick={copyLink}>
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
      <p className="text-sm text-gray-500">
        Share this link with your participants. They can complete the study anonymously.
      </p>
    </div>
  );
}
