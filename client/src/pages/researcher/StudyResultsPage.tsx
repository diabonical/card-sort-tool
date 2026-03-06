import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as d3 from 'd3';
import { getStudy, getResultsSummary, getSimilarity, getClustering, exportJson, exportExcel, setSessionExclusion, getIASuggestion, exportIAExcel } from '../../api/studies';
import NavBar from '../../components/NavBar';
import Button from '../../components/Button';
import type { Session, SimilarityResult, ClusteringResult, DendrogramNode, IAGroup, IACard, IASubGroup } from '../../types';

type Tab = 'overview' | 'responses' | 'similarity' | 'dendrogram' | 'ia' | 'export';

export default function StudyResultsPage() {
  const { id } = useParams<{ id: string }>();
  const studyId = parseInt(id!);
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');

  const { data: study } = useQuery({ queryKey: ['study', studyId], queryFn: () => getStudy(studyId) });

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
          <h1 className="text-2xl font-bold text-gray-900">{study?.title} — Results</h1>
        </div>

        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
          {(['overview', 'responses', 'similarity', 'dendrogram', 'ia', 'export'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                tab === t ? 'bg-white shadow text-brand-500' : 'text-gray-500 hover:text-gray-800'
              }`}>{t}</button>
          ))}
        </div>

        {tab === 'overview' && <OverviewTab studyId={studyId} />}
        {tab === 'responses' && <ResponsesTab studyId={studyId} />}
        {tab === 'similarity' && <SimilarityTab studyId={studyId} />}
        {tab === 'dendrogram' && <DendrogramTab studyId={studyId} />}
        {tab === 'ia' && <IATab studyId={studyId} />}
        {tab === 'export' && <ExportTab studyId={studyId} />}
      </main>
    </div>
  );
}

// ─── Overview ────────────────────────────────────────────────────────────────

function OverviewTab({ studyId }: { studyId: number }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['results-summary', studyId],
    queryFn: () => getResultsSummary(studyId),
  });

  const toggleExclusion = useMutation({
    mutationFn: ({ sessionId, excluded }: { sessionId: number; excluded: boolean }) =>
      setSessionExclusion(studyId, sessionId, excluded),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['results-summary', studyId] });
      queryClient.invalidateQueries({ queryKey: ['similarity', studyId] });
      queryClient.invalidateQueries({ queryKey: ['clustering', studyId] });
    },
  });

  if (isLoading) return <p className="text-gray-400">Loading...</p>;
  const sessions: Session[] = data?.sessions ?? [];

  const included = sessions.filter((s) => !s.excluded).length;
  const excluded = sessions.filter((s) => s.excluded).length;

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-1">Total submitted</p>
          <p className="text-3xl font-bold text-gray-900">{sessions.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-1">Included in analysis</p>
          <p className="text-3xl font-bold text-green-600">{included}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-1">Excluded</p>
          <p className="text-3xl font-bold text-gray-400">{excluded}</p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <p className="text-gray-400 text-sm">No submissions yet.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Participant</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Completed</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Duration</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Sorted</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Unsorted</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Groups</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sessions.map((s: Session) => {
                const sorted = s.sortItems.filter((i) => i.categoryId !== null).length;
                const unsorted = s.sortItems.filter((i) => i.categoryId === null).length;
                const groups = s.categories.length;
                return (
                  <tr key={s.id} className={s.excluded ? 'opacity-50 bg-gray-50' : ''}>
                    <td className="px-4 py-2 font-mono text-xs">{s.participantRef.slice(0, 16)}</td>
                    <td className="px-4 py-2 text-gray-500">
                      {s.completedAt ? new Date(s.completedAt).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                      {s.durationSecs != null
                        ? `${Math.floor(s.durationSecs / 60)}m ${s.durationSecs % 60}s`
                        : '-'}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{sorted}</td>
                    <td className="px-4 py-2 text-gray-500">{unsorted}</td>
                    <td className="px-4 py-2 text-gray-500">{groups}</td>
                    <td className="px-4 py-2">
                      {s.excluded ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-400">
                          Excluded
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                          Included
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => toggleExclusion.mutate({ sessionId: s.id, excluded: !s.excluded })}
                        disabled={toggleExclusion.isPending}
                        className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                          s.excluded
                            ? 'border-brand-300 text-brand-600 hover:bg-brand-50'
                            : 'border-gray-300 text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {s.excluded ? 'Re-include' : 'Exclude'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Individual Responses ─────────────────────────────────────────────────────

function ResponsesTab({ studyId }: { studyId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['results-summary', studyId],
    queryFn: () => getResultsSummary(studyId),
  });
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (isLoading) return <p className="text-gray-400">Loading...</p>;
  const sessions: Session[] = data?.sessions ?? [];
  if (sessions.length === 0) return <p className="text-gray-400 text-sm">No submissions yet.</p>;

  const selected = sessions.find((s) => s.id === selectedId) ?? sessions[0];

  // Group sort items by category label
  const groups = new Map<string, string[]>();
  for (const item of selected.sortItems) {
    const label = item.category?.label ?? '— Unsorted —';
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(item.card.name);
  }
  // Put unsorted last
  const unsortedCards = groups.get('— Unsorted —') ?? [];
  groups.delete('— Unsorted —');
  const sortedGroups = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  if (unsortedCards.length > 0) sortedGroups.push(['— Unsorted —', unsortedCards]);

  return (
    <div className="flex gap-4 min-h-0">
      {/* Sidebar: participant list */}
      <div className="w-56 shrink-0 bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Participants</p>
        </div>
        <div className="divide-y divide-gray-50">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                s.id === (selectedId ?? sessions[0].id)
                  ? 'bg-brand-50 text-brand-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <p className="font-mono text-xs truncate">{s.participantRef.slice(0, 16)}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {s.completedAt ? new Date(s.completedAt).toLocaleDateString() : '—'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Main: card groupings for selected participant */}
      <div className="flex-1 bg-white rounded-xl shadow-sm p-6 overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-400 font-mono">{selected.participantRef}</p>
            <p className="text-xs text-gray-400">
              {selected.completedAt ? new Date(selected.completedAt).toLocaleString() : '—'}
              {selected.durationSecs != null && ` · ${Math.round(selected.durationSecs / 60)}m ${selected.durationSecs % 60}s`}
            </p>
          </div>
          <span className="text-xs text-gray-400">
            {selected.sortItems.filter((i) => i.categoryId !== null).length} / {selected.sortItems.length} cards sorted
          </span>
        </div>

        {sortedGroups.length === 0 ? (
          <p className="text-gray-400 text-sm">No sort data available.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedGroups.map(([label, cardNames]) => (
              <div key={label} className={`rounded-xl border p-4 ${label === '— Unsorted —' ? 'border-dashed border-gray-200 bg-gray-50' : 'border-gray-200 bg-white'}`}>
                <p className={`text-xs font-semibold mb-3 ${label === '— Unsorted —' ? 'text-gray-400' : 'text-gray-700'}`}>
                  {label}
                  <span className="ml-1.5 font-normal text-gray-400">({cardNames.length})</span>
                </p>
                <div className="space-y-1.5">
                  {cardNames.map((name) => (
                    <div key={name} className="bg-gray-50 rounded-lg px-3 py-1.5 text-sm text-gray-700 border border-gray-100">
                      {name}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Similarity Matrix ────────────────────────────────────────────────────────

function SimilarityTab({ studyId }: { studyId: number }) {
  const { data, isLoading } = useQuery<SimilarityResult>({
    queryKey: ['similarity', studyId],
    queryFn: () => getSimilarity(studyId),
  });

  if (isLoading) return <p className="text-gray-400">Loading...</p>;
  if (!data || data.cards.length === 0) return <p className="text-gray-400">No data yet.</p>;

  return <MatrixHeatmap cards={data.cards} matrix={data.matrix} />;
}

function MatrixHeatmap({ cards, matrix }: { cards: { id: number; name: string }[]; matrix: number[][] }) {
  const n = cards.length;
  const baseCellSize = Math.max(24, Math.min(56, Math.floor(600 / n)));
  const labelCol = 128;
  const [hovered, setHovered] = useState<{ row: number; col: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const cellSize = Math.round(baseCellSize * zoom);

  // Ctrl+wheel zoom (non-passive so we can preventDefault)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((z) => Math.min(4, Math.max(0.25, z * (e.deltaY < 0 ? 1.1 : 0.9))));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  function cellColor(v: number) {
    return `rgb(${Math.round(255 - v * 180)},${Math.round(255 - v * 80)},255)`;
  }

  const HL_BG   = '#eff6ff'; // blue-50
  const HL_TEXT = '#2563eb'; // blue-600

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium text-gray-800">Similarity Matrix</h2>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoom((z) => Math.max(0.25, z / 1.25))}
            className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 text-base leading-none transition-colors"
            title="Zoom out"
          >−</button>
          <span className="text-xs text-gray-500 w-10 text-center tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(4, z * 1.25))}
            className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 text-base leading-none transition-colors"
            title="Zoom in"
          >+</button>
          {zoom !== 1 && (
            <button
              onClick={() => setZoom(1)}
              className="ml-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              title="Reset zoom"
            >Reset</button>
          )}
          <span className="ml-2 text-xs text-gray-300" title="Ctrl+scroll to zoom">Ctrl+scroll</span>
        </div>
      </div>
      <div
        ref={containerRef}
        className="overflow-auto rounded border border-gray-100"
        style={{ maxHeight: 'calc(100vh - 280px)' }}
        onMouseLeave={() => setHovered(null)}
      >
        <table className="border-collapse" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: labelCol }} />
            {cards.map((c) => <col key={c.id} style={{ width: cellSize }} />)}
          </colgroup>

          <thead>
            <tr>
              {/* Sticky corner */}
              <th style={{
                position: 'sticky', top: 0, left: 0, zIndex: 30,
                background: 'white', boxShadow: '1px 1px 0 #e5e7eb',
              }} />
              {cards.map((c, j) => {
                const active = hovered?.col === j;
                return (
                  <th key={c.id} style={{
                    position: 'sticky', top: 0, zIndex: 20,
                    height: 88, verticalAlign: 'bottom', padding: '0 0 4px',
                    backgroundColor: active ? HL_BG : 'white',
                    boxShadow: '0 1px 0 #e5e7eb',
                    overflow: 'visible',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', height: 88, paddingBottom: 4 }}>
                      <span style={{
                        display: 'block',
                        transform: 'rotate(-55deg)',
                        transformOrigin: 'bottom left',
                        whiteSpace: 'nowrap',
                        fontSize: 11,
                        color: active ? HL_TEXT : '#4b5563',
                        fontWeight: active ? 600 : undefined,
                      }}>
                        {c.name.length > 14 ? c.name.slice(0, 14) + '…' : c.name}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {matrix.map((row, i) => {
              const rowActive = hovered?.row === i;
              return (
                <tr key={i}>
                  {/* Sticky row label */}
                  <td style={{
                    position: 'sticky', left: 0, zIndex: 10,
                    height: cellSize, paddingRight: 8,
                    backgroundColor: rowActive ? HL_BG : 'white',
                    boxShadow: '1px 0 0 #e5e7eb',
                  }}>
                    <span style={{
                      display: 'block', overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      maxWidth: labelCol - 10,
                      fontSize: 11,
                      color: rowActive ? HL_TEXT : '#4b5563',
                      fontWeight: rowActive ? 600 : undefined,
                    }}>
                      {cards[i].name}
                    </span>
                  </td>

                  {row.map((val, j) => {
                    const colActive = hovered?.col === j;
                    return (
                      <td
                        key={j}
                        title={`${cards[i].name} × ${cards[j].name}: ${(val * 100).toFixed(0)}%`}
                        onMouseEnter={() => setHovered({ row: i, col: j })}
                        style={{
                          width: cellSize, height: cellSize,
                          backgroundColor: cellColor(val),
                          boxShadow: (rowActive || colActive)
                            ? 'inset 0 0 0 2px rgba(59,130,246,0.55)'
                            : 'inset 0 0 0 1px white',
                          textAlign: 'center', cursor: 'default',
                        }}
                      >
                        {cellSize >= 32 && (
                          <span style={{ fontSize: 10, color: '#374151' }}>
                            {(val * 100).toFixed(0)}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Dendrogram ───────────────────────────────────────────────────────────────

function DendrogramTab({ studyId }: { studyId: number }) {
  const { data, isLoading } = useQuery<ClusteringResult>({
    queryKey: ['clustering', studyId],
    queryFn: () => getClustering(studyId),
  });
  const svgRef = useRef<SVGSVGElement>(null);
  const [info, setInfo] = useState<{ similarity: number; groups: number } | null>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;
    renderDendrogram(svgRef.current, data.dendrogram, setInfo);
  }, [data]);

  if (isLoading) return <p className="text-gray-400">Loading...</p>;
  if (!data || data.cards.length < 2) return <p className="text-gray-400">Need at least 2 cards and 1 submission.</p>;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium text-gray-800">Dendrogram</h2>
        {info ? (
          <div className="text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg tabular-nums">
            <span className="font-semibold">{info.similarity}%</span> similarity threshold
            &rarr; <span className="font-semibold">{info.groups}</span> group{info.groups !== 1 ? 's' : ''}
          </div>
        ) : (
          <p className="text-xs text-gray-400">Hover over the chart to see groups at a similarity threshold</p>
        )}
      </div>
      <div className="overflow-auto">
        <svg ref={svgRef} />
      </div>
    </div>
  );
}

function renderDendrogram(
  svgEl: SVGSVGElement,
  root: DendrogramNode,
  onInfo: (info: { similarity: number; groups: number } | null) => void,
) {
  function countLeaves(n: DendrogramNode): number {
    if (!n.children || n.children.length === 0) return 1;
    return n.children.reduce((s, c) => s + countLeaves(c), 0);
  }

  function toD3Node(n: DendrogramNode): any {
    return { id: n.id, name: n.name || '', height: n.height, children: n.children?.map(toD3Node) };
  }

  const nLeaves = countLeaves(root);
  const rowH = 18;
  const margin = { top: 20, right: 60, bottom: 44, left: 170 };
  const drawH = nLeaves * rowH;
  const drawW = 560;
  const totalW = drawW + margin.left + margin.right;
  const totalH = drawH + margin.top + margin.bottom;

  d3.select(svgEl).selectAll('*').remove();
  const svg = d3.select(svgEl).attr('width', totalW).attr('height', totalH);
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const hierarchy = d3.hierarchy(toD3Node(root));
  d3.cluster<any>().size([drawH, drawW])(hierarchy);

  // Leaves on LEFT (distance 0), root on RIGHT (distance 1).
  // xScale: distance [0,1] → pixel x [0, drawW]
  const xScale = d3.scaleLinear().domain([0, 1]).range([0, drawW]);
  hierarchy.each((d: any) => { d.y = xScale(d.data.height); });

  const colorScale = d3.scaleOrdinal<string>(d3.schemeTableau10);

  // Links
  g.selectAll('.lnk')
    .data(hierarchy.links())
    .enter().append('path')
    .attr('fill', 'none')
    .attr('stroke', '#cbd5e1')
    .attr('stroke-width', 1.5)
    .attr('d', (d: any) => `M${d.source.y},${d.source.x}H${d.target.y}V${d.target.x}H${d.target.y}`);

  const leaves = hierarchy.leaves();

  // Leaf dots
  const dotSel = g.selectAll('.dot')
    .data(leaves)
    .enter().append('circle')
    .attr('cx', (d: any) => d.y)
    .attr('cy', (d: any) => d.x)
    .attr('r', 2.5)
    .attr('fill', '#94a3b8');

  // Leaf labels to the LEFT of each leaf node
  const labelSel = g.selectAll('.lbl')
    .data(leaves)
    .enter().append('text')
    .attr('x', (d: any) => d.y - 6)
    .attr('y', (d: any) => d.x)
    .attr('dy', '0.32em')
    .attr('text-anchor', 'end')
    .attr('font-size', 11)
    .attr('fill', '#374151')
    .text((d: any) => d.data.name);

  // Vertical cursor line (hidden until hover)
  const cursorLine = g.append('line')
    .attr('y1', 0).attr('y2', drawH)
    .attr('stroke', '#3b82f6').attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '4,3').attr('opacity', 0);

  // Compute which group each leaf belongs to at a given distance threshold
  function getGroupMap(threshold: number): Map<string, number> {
    const map = new Map<string, number>();
    let idx = 0;
    function cut(n: any) {
      if (!n.children || n.children.length === 0 || n.data.height <= threshold) {
        const assign = (ll: any) => {
          if (!ll.children || ll.children.length === 0) map.set(ll.data.id, idx);
          else ll.children.forEach(assign);
        };
        assign(n); idx++;
      } else {
        n.children.forEach(cut);
      }
    }
    cut(hierarchy);
    return map;
  }

  // Transparent overlay captures mouse events over the drawing area
  svg.append('rect')
    .attr('x', margin.left).attr('y', margin.top)
    .attr('width', drawW).attr('height', drawH)
    .attr('fill', 'transparent')
    .style('cursor', 'crosshair')
    .on('mousemove', function(event) {
      const [mx] = d3.pointer(event, g.node()!);
      const distance = Math.max(0, Math.min(1, xScale.invert(mx)));
      const similarity = Math.round((1 - distance) * 100);

      cursorLine.attr('x1', mx).attr('x2', mx).attr('opacity', 1);

      const gMap = getGroupMap(distance);
      const numGroups = new Set(gMap.values()).size;

      labelSel.attr('fill', (d: any) => {
        const gi = gMap.get(d.data.id);
        return gi !== undefined ? colorScale(String(gi)) : '#374151';
      });
      dotSel.attr('fill', (d: any) => {
        const gi = gMap.get(d.data.id);
        return gi !== undefined ? colorScale(String(gi)) : '#94a3b8';
      });

      onInfo({ similarity, groups: numGroups });
    })
    .on('mouseleave', function() {
      cursorLine.attr('opacity', 0);
      labelSel.attr('fill', '#374151');
      dotSel.attr('fill', '#94a3b8');
      onInfo(null);
    });

  // X axis: similarity % (100% left → 0% right)
  const axisScale = d3.scaleLinear().domain([1, 0]).range([0, drawW]);
  g.append('g')
    .attr('transform', `translate(0,${drawH + 8})`)
    .call(
      d3.axisBottom(axisScale)
        .tickFormat((d) => `${Math.round((d as number) * 100)}%`)
        .ticks(6)
    )
    .call((ax) => ax.select('.domain').attr('stroke', '#e2e8f0'))
    .call((ax) => ax.selectAll('line').attr('stroke', '#e2e8f0'))
    .call((ax) => ax.selectAll('text').attr('font-size', 10).attr('fill', '#9ca3af'));

  g.append('text')
    .attr('x', drawW / 2).attr('y', drawH + 38)
    .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#9ca3af')
    .text('← Higher agreement                                 Lower agreement →');
}

// ─── Export ───────────────────────────────────────────────────────────────────

function ExportTab({ studyId }: { studyId: number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
      <h2 className="font-medium text-gray-800">Export Results</h2>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => exportJson(studyId)}>
          Download JSON
        </Button>
        <Button variant="secondary" onClick={() => exportExcel(studyId)}>
          Download Excel (.xlsx)
        </Button>
      </div>
    </div>
  );
}

// ─── IA Tab ───────────────────────────────────────────────────────────────────

const UNGROUPED_ID = '__ungrouped__';

function genId(): string { return crypto.randomUUID(); }

interface ViewProps {
  groups: IAGroup[];
  editingId: string | null;
  editingName: string;
  movingCardKey: string | null;
  onStartEdit: (id: string, name: string) => void;
  onEditNameChange: (name: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onMoveCardKey: (key: string | null) => void;
  onMoveCard: (card: IACard, fromGroupId: string, fromSubGroupId: string | undefined, dest: string) => void;
  getMoveOptions: () => { value: string; label: string }[];
  onAddSubGroup: (groupId: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onDeleteSubGroup: (groupId: string, sgId: string) => void;
}

function InlineEdit({
  editKey, currentName, editingId, editingName,
  onStartEdit, onEditNameChange, onCommitEdit, onCancelEdit,
  className = '',
}: {
  editKey: string; currentName: string; editingId: string | null; editingName: string;
  onStartEdit: (id: string, name: string) => void;
  onEditNameChange: (name: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  className?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (editingId === editKey) inputRef.current?.focus();
  }, [editingId, editKey]);

  if (editingId === editKey) {
    return (
      <input
        ref={inputRef}
        value={editingName}
        onChange={(e) => onEditNameChange(e.target.value)}
        onBlur={onCommitEdit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onCommitEdit();
          if (e.key === 'Escape') onCancelEdit();
        }}
        className={`border border-brand-300 rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400 ${className}`}
      />
    );
  }
  return (
    <span
      onClick={() => onStartEdit(editKey, currentName)}
      className={`cursor-pointer hover:text-brand-600 hover:underline decoration-dashed ${className}`}
      title="Click to rename"
    >
      {currentName}
    </span>
  );
}

function MoveSelect({
  cardKey, card, fromGroupId, fromSubGroupId,
  movingCardKey, onMoveCardKey, onMoveCard, getMoveOptions,
}: {
  cardKey: string; card: IACard; fromGroupId: string; fromSubGroupId?: string;
  movingCardKey: string | null;
  onMoveCardKey: (key: string | null) => void;
  onMoveCard: (card: IACard, fromGroupId: string, fromSubGroupId: string | undefined, dest: string) => void;
  getMoveOptions: () => { value: string; label: string }[];
}) {
  if (movingCardKey === cardKey) {
    return (
      <select
        autoFocus
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) onMoveCard(card, fromGroupId, fromSubGroupId, e.target.value);
          onMoveCardKey(null);
        }}
        onBlur={() => onMoveCardKey(null)}
        className="text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-400"
      >
        <option value="">— Move to —</option>
        {getMoveOptions().map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }
  return (
    <button
      onClick={() => onMoveCardKey(cardKey)}
      className="text-xs text-gray-400 hover:text-brand-500 px-1.5 py-0.5 rounded hover:bg-brand-50 transition-colors"
      title="Move card"
    >
      →
    </button>
  );
}

// ─── Table View ───────────────────────────────────────────────────────────────

type FlatRow = {
  key: string;
  renderGroupCell: boolean;
  groupRowSpan: number;
  groupId: string;
  groupName: string;
  renderSgCell: boolean;
  sgRowSpan: number;
  sgId?: string;
  sgName?: string;
  isDirectCard: boolean;
  isEmpty: boolean;
  card: IACard;
  fromGroupId: string;
  fromSubGroupId?: string;
};

function flattenGroups(groups: IAGroup[]): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const g of groups) {
    const directCount = g.cards.length;
    const sgCount = g.subGroups.reduce((s, sg) => s + Math.max(sg.cards.length, 1), 0);
    const totalRows = Math.max(1, directCount + sgCount);
    let isFirstGroupRow = true;

    if (g.cards.length === 0 && g.subGroups.length === 0) {
      rows.push({
        key: `${g.id}-empty`, renderGroupCell: true, groupRowSpan: 1,
        groupId: g.id, groupName: g.name, renderSgCell: true, sgRowSpan: 1,
        isDirectCard: true, isEmpty: true,
        card: { id: -1, name: '' }, fromGroupId: g.id,
      });
      continue;
    }

    for (const card of g.cards) {
      rows.push({
        key: `${g.id}-d-${card.id}`,
        renderGroupCell: isFirstGroupRow, groupRowSpan: totalRows,
        groupId: g.id, groupName: g.name,
        renderSgCell: true, sgRowSpan: 1,
        isDirectCard: true, isEmpty: false,
        card, fromGroupId: g.id,
      });
      isFirstGroupRow = false;
    }

    for (const sg of g.subGroups) {
      const sgRows = Math.max(sg.cards.length, 1);
      if (sg.cards.length === 0) {
        rows.push({
          key: `${g.id}-sg-${sg.id}-empty`,
          renderGroupCell: isFirstGroupRow, groupRowSpan: totalRows,
          groupId: g.id, groupName: g.name,
          renderSgCell: true, sgRowSpan: 1,
          sgId: sg.id, sgName: sg.name,
          isDirectCard: false, isEmpty: true,
          card: { id: -1, name: '' }, fromGroupId: g.id, fromSubGroupId: sg.id,
        });
        isFirstGroupRow = false;
      } else {
        let isFirstSgRow = true;
        for (const card of sg.cards) {
          rows.push({
            key: `${g.id}-sg-${sg.id}-${card.id}`,
            renderGroupCell: isFirstGroupRow, groupRowSpan: totalRows,
            groupId: g.id, groupName: g.name,
            renderSgCell: isFirstSgRow, sgRowSpan: sgRows,
            sgId: sg.id, sgName: sg.name,
            isDirectCard: false, isEmpty: false,
            card, fromGroupId: g.id, fromSubGroupId: sg.id,
          });
          isFirstGroupRow = false;
          isFirstSgRow = false;
        }
      }
    }
  }
  return rows;
}

function IATableView({ groups, onAddGroup, ...props }: ViewProps & { onAddGroup: () => void }) {
  const rows = flattenGroups(groups);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600 w-48">Group</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 w-40">Sub-group</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Card</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 w-20">Move</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className={row.groupId === UNGROUPED_ID ? 'bg-amber-50' : ''}>
                {row.renderGroupCell && (
                  <td
                    rowSpan={row.groupRowSpan}
                    className={`px-4 py-2 align-top border-b border-gray-100 border-r ${
                      row.groupId === UNGROUPED_ID ? 'bg-amber-50' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-1.5">
                      <InlineEdit
                        editKey={`g-${row.groupId}`}
                        currentName={row.groupName}
                        {...props}
                        className="font-medium text-gray-800"
                      />
                      {row.groupId === UNGROUPED_ID && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">⚠</span>
                      )}
                      {row.groupId !== UNGROUPED_ID && (
                        <button
                          onClick={() => props.onDeleteGroup(row.groupId)}
                          className="ml-auto text-gray-300 hover:text-red-400 transition-colors text-xs shrink-0"
                          title="Delete group"
                        >🗑</button>
                      )}
                    </div>
                  </td>
                )}
                {row.renderSgCell && (
                  <td
                    rowSpan={row.sgRowSpan}
                    className="px-4 py-2 align-top border-b border-gray-100 border-r text-gray-500"
                  >
                    {row.sgId ? (
                      <div className="flex items-start gap-1">
                        <InlineEdit
                          editKey={`sg-${row.sgId}`}
                          currentName={row.sgName!}
                          {...props}
                          className="text-gray-600"
                        />
                        <button
                          onClick={() => props.onDeleteSubGroup(row.groupId, row.sgId!)}
                          className="ml-auto text-gray-300 hover:text-red-400 text-xs shrink-0"
                          title="Delete sub-group"
                        >🗑</button>
                      </div>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                )}
                <td className="px-4 py-2 border-b border-gray-100 text-gray-700">
                  {row.isEmpty ? <span className="text-gray-300 text-xs italic">empty</span> : row.card.name}
                </td>
                <td className="px-4 py-2 border-b border-gray-100">
                  {!row.isEmpty && (
                    <MoveSelect
                      cardKey={row.key}
                      card={row.card}
                      fromGroupId={row.fromGroupId}
                      fromSubGroupId={row.fromSubGroupId}
                      {...props}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        onClick={onAddGroup}
        className="text-sm text-brand-500 hover:text-brand-700 border border-dashed border-brand-300 rounded-lg px-4 py-2 w-full hover:bg-brand-50 transition-colors"
      >
        + Add Group
      </button>
    </div>
  );
}

// ─── Tree View ────────────────────────────────────────────────────────────────

function IATreeView({ groups, onAddGroup, ...props }: ViewProps & { onAddGroup: () => void }) {
  return (
    <div className="space-y-2">
      {groups.map((g) => (
        <div key={g.id} className={`bg-white rounded-xl shadow-sm p-4 ${g.id === UNGROUPED_ID ? 'border border-amber-200 bg-amber-50' : ''}`}>
          {/* Group header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-gray-400 text-xs">▼</span>
            <InlineEdit
              editKey={`g-${g.id}`}
              currentName={g.name}
              {...props}
              className="font-semibold text-gray-800"
            />
            {g.id === UNGROUPED_ID && (
              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">⚠ ungrouped</span>
            )}
            <div className="ml-auto flex items-center gap-1">
              {g.id !== UNGROUPED_ID && (
                <button
                  onClick={() => props.onAddSubGroup(g.id)}
                  className="text-xs text-gray-500 hover:text-brand-600 px-2 py-1 rounded hover:bg-brand-50 transition-colors"
                >
                  + Subgroup
                </button>
              )}
              {g.id !== UNGROUPED_ID && (
                <button
                  onClick={() => props.onDeleteGroup(g.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors text-sm px-1"
                  title="Delete group"
                >🗑</button>
              )}
            </div>
          </div>

          {/* Direct cards */}
          {g.cards.map((card) => {
            const cardKey = `tree-${g.id}-d-${card.id}`;
            return (
              <div key={card.id} className="ml-5 flex items-center gap-2 py-0.5">
                <span className="text-gray-300 text-xs">•</span>
                <span className="text-sm text-gray-700">{card.name}</span>
                <div className="ml-auto">
                  <MoveSelect cardKey={cardKey} card={card} fromGroupId={g.id} {...props} />
                </div>
              </div>
            );
          })}

          {/* Subgroups */}
          {g.subGroups.map((sg) => (
            <div key={sg.id} className="ml-2 mt-1">
              <div className="flex items-center gap-2 py-0.5">
                <span className="text-gray-400 text-xs">▼</span>
                <InlineEdit
                  editKey={`sg-${sg.id}`}
                  currentName={sg.name}
                  {...props}
                  className="text-gray-600 text-sm font-medium"
                />
                <div className="ml-auto">
                  <button
                    onClick={() => props.onDeleteSubGroup(g.id, sg.id)}
                    className="text-gray-300 hover:text-red-400 text-xs px-1"
                    title="Delete sub-group"
                  >🗑</button>
                </div>
              </div>
              {sg.cards.length === 0 && (
                <div className="ml-5 py-0.5 text-xs text-gray-300 italic">empty</div>
              )}
              {sg.cards.map((card) => {
                const cardKey = `tree-${g.id}-sg-${sg.id}-${card.id}`;
                return (
                  <div key={card.id} className="ml-5 flex items-center gap-2 py-0.5">
                    <span className="text-gray-300 text-xs">•</span>
                    <span className="text-sm text-gray-600">{card.name}</span>
                    <div className="ml-auto">
                      <MoveSelect cardKey={cardKey} card={card} fromGroupId={g.id} fromSubGroupId={sg.id} {...props} />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {g.cards.length === 0 && g.subGroups.length === 0 && (
            <div className="ml-5 py-0.5 text-xs text-gray-300 italic">no cards</div>
          )}
        </div>
      ))}
      <button
        onClick={onAddGroup}
        className="text-sm text-brand-500 hover:text-brand-700 border border-dashed border-brand-300 rounded-lg px-4 py-2 w-full hover:bg-brand-50 transition-colors"
      >
        + Add Group
      </button>
    </div>
  );
}

// ─── IATab ────────────────────────────────────────────────────────────────────

function IATab({ studyId }: { studyId: number }) {
  const [sliderVal, setSliderVal] = useState(0.5);
  const [threshold, setThreshold] = useState(0.5);
  const [view, setView] = useState<'table' | 'tree'>('table');
  const [groups, setGroups] = useState<IAGroup[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [movingCardKey, setMovingCardKey] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['ia-suggestion', studyId, threshold],
    queryFn: () => getIASuggestion(studyId, threshold),
  });

  useEffect(() => {
    if (!data) return;
    setGroups(
      data.groups.map((g) => ({
        id: genId(),
        name: g.name,
        cards: [...g.cards],
        subGroups: [],
      }))
    );
    setEditingId(null);
    setMovingCardKey(null);
  }, [data]);

  const startEdit = (id: string, name: string) => { setEditingId(id); setEditingName(name); };
  const commitEdit = () => {
    if (!editingId) return;
    const name = editingName.trim() || 'Unnamed';
    setGroups((prev) => {
      if (!prev) return prev;
      return prev.map((g) => {
        if (`g-${g.id}` === editingId) return { ...g, name };
        return {
          ...g,
          subGroups: g.subGroups.map((sg) =>
            `sg-${sg.id}` === editingId ? { ...sg, name } : sg
          ),
        };
      });
    });
    setEditingId(null);
  };
  const cancelEdit = () => setEditingId(null);

  const addGroup = () => {
    setGroups((prev) => [
      ...(prev ?? []),
      { id: genId(), name: 'New Group', cards: [], subGroups: [] },
    ]);
  };

  const deleteGroup = (groupId: string) => {
    setGroups((prev) => {
      if (!prev) return prev;
      const group = prev.find((g) => g.id === groupId);
      if (!group) return prev;
      const orphans: IACard[] = [...group.cards, ...group.subGroups.flatMap((sg) => sg.cards)];
      let updated = prev.filter((g) => g.id !== groupId);
      if (orphans.length > 0) {
        const idx = updated.findIndex((g) => g.id === UNGROUPED_ID);
        if (idx >= 0) {
          updated = updated.map((g, i) => i === idx ? { ...g, cards: [...g.cards, ...orphans] } : g);
        } else {
          updated = [...updated, { id: UNGROUPED_ID, name: 'Ungrouped', cards: orphans, subGroups: [] }];
        }
      }
      return updated;
    });
  };

  const addSubGroup = (groupId: string) => {
    setGroups((prev) =>
      prev?.map((g) =>
        g.id === groupId
          ? { ...g, subGroups: [...g.subGroups, { id: genId(), name: 'Sub-group', cards: [] }] }
          : g
      ) ?? prev
    );
  };

  const deleteSubGroup = (groupId: string, sgId: string) => {
    setGroups((prev) =>
      prev?.map((g) => {
        if (g.id !== groupId) return g;
        const sg = g.subGroups.find((s) => s.id === sgId);
        if (!sg) return g;
        return { ...g, cards: [...g.cards, ...sg.cards], subGroups: g.subGroups.filter((s) => s.id !== sgId) };
      }) ?? prev
    );
  };

  const handleMoveCard = (card: IACard, fromGroupId: string, fromSubGroupId: string | undefined, dest: string) => {
    setGroups((prev) => {
      if (!prev) return prev;
      const updated = prev.map((g) => ({
        ...g, cards: [...g.cards],
        subGroups: g.subGroups.map((sg) => ({ ...sg, cards: [...sg.cards] })),
      }));
      // Remove from source
      if (fromSubGroupId) {
        const fg = updated.find((g) => g.id === fromGroupId);
        if (fg) {
          const fsg = fg.subGroups.find((sg) => sg.id === fromSubGroupId);
          if (fsg) fsg.cards = fsg.cards.filter((c) => c.id !== card.id);
        }
      } else {
        const fg = updated.find((g) => g.id === fromGroupId);
        if (fg) fg.cards = fg.cards.filter((c) => c.id !== card.id);
      }
      // Add to dest
      if (dest.startsWith('g:')) {
        const dg = updated.find((g) => g.id === dest.slice(2));
        if (dg) dg.cards.push(card);
      } else if (dest.startsWith('sg:')) {
        const parts = dest.split(':');
        const dg = updated.find((g) => g.id === parts[2]);
        if (dg) {
          const dsg = dg.subGroups.find((sg) => sg.id === parts[1]);
          if (dsg) dsg.cards.push(card);
        }
      }
      return updated;
    });
    setMovingCardKey(null);
  };

  const getMoveOptions = (): { value: string; label: string }[] => {
    if (!groups) return [];
    return groups.flatMap((g) => [
      { value: `g:${g.id}`, label: g.name },
      ...g.subGroups.map((sg) => ({ value: `sg:${sg.id}:${g.id}`, label: `${g.name} / ${sg.name}` })),
    ]);
  };

  const hasEdits =
    groups !== null &&
    data !== undefined &&
    JSON.stringify(groups.map((g) => ({ name: g.name, cards: g.cards.map((c) => c.id) }))) !==
      JSON.stringify(data.groups.map((g) => ({ name: g.name, cards: g.cards.map((c) => c.id) })));

  const handleExport = async () => {
    if (!groups) return;
    setExporting(true);
    try { await exportIAExcel(studyId, groups); } finally { setExporting(false); }
  };

  const viewProps: ViewProps = {
    groups: groups ?? [],
    editingId, editingName,
    movingCardKey,
    onStartEdit: startEdit,
    onEditNameChange: setEditingName,
    onCommitEdit: commitEdit,
    onCancelEdit: cancelEdit,
    onMoveCardKey: setMovingCardKey,
    onMoveCard: handleMoveCard,
    getMoveOptions,
    onAddSubGroup: addSubGroup,
    onDeleteGroup: deleteGroup,
    onDeleteSubGroup: deleteSubGroup,
  };

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Threshold:</label>
          <input
            type="range" min={0} max={1} step={0.05}
            value={sliderVal}
            onChange={(e) => setSliderVal(parseFloat(e.target.value))}
            className="w-32 accent-brand-500"
          />
          <span className="text-sm text-gray-700 w-10 tabular-nums">{sliderVal.toFixed(2)}</span>
          <button
            onClick={() => setThreshold(sliderVal)}
            className="px-3 py-1.5 bg-brand-500 text-white text-sm rounded-lg hover:bg-brand-600 transition-colors"
          >
            Apply
          </button>
          {hasEdits && <span className="text-xs text-amber-600">⚠ edits will reset</span>}
        </div>
        <div className="h-6 w-px bg-gray-200" />
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {(['table', 'tree'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded text-sm capitalize transition-colors ${view === v ? 'bg-white shadow text-brand-500' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="h-6 w-px bg-gray-200" />
        <Button
          variant="secondary"
          loading={exporting}
          onClick={handleExport}
          disabled={!groups || groups.length === 0}
        >
          Export Excel
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <p className="text-gray-400">Loading...</p>
      ) : !groups || groups.length === 0 ? (
        <p className="text-gray-400 text-sm">No IA data available. Need at least 2 cards and 1 submission.</p>
      ) : view === 'table' ? (
        <IATableView {...viewProps} onAddGroup={addGroup} />
      ) : (
        <IATreeView {...viewProps} onAddGroup={addGroup} />
      )}
    </div>
  );
}
