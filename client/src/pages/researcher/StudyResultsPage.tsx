import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as d3 from 'd3';
import { getStudy, getResultsSummary, getSimilarity, getClustering, exportJson, exportExcel } from '../../api/studies';
import NavBar from '../../components/NavBar';
import Button from '../../components/Button';
import type { Session, SimilarityResult, ClusteringResult, DendrogramNode } from '../../types';

type Tab = 'overview' | 'similarity' | 'dendrogram' | 'clustered' | 'export';

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

        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit flex-wrap">
          {(['overview', 'similarity', 'dendrogram', 'clustered', 'export'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
                tab === t ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}>{t}</button>
          ))}
        </div>

        {tab === 'overview' && <OverviewTab studyId={studyId} />}
        {tab === 'similarity' && <SimilarityTab studyId={studyId} />}
        {tab === 'dendrogram' && <DendrogramTab studyId={studyId} />}
        {tab === 'clustered' && <ClusteredTab studyId={studyId} />}
        {tab === 'export' && <ExportTab studyId={studyId} />}
      </main>
    </div>
  );
}

// ─── Overview ────────────────────────────────────────────────────────────────

function OverviewTab({ studyId }: { studyId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['results-summary', studyId],
    queryFn: () => getResultsSummary(studyId),
  });

  if (isLoading) return <p className="text-gray-400">Loading...</p>;
  const sessions: Session[] = data?.sessions ?? [];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <p className="text-sm text-gray-500 mb-1">Total submissions</p>
        <p className="text-4xl font-bold text-gray-900">{sessions.length}</p>
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
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cards sorted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sessions.map((s: Session) => (
                <tr key={s.id}>
                  <td className="px-4 py-2 font-mono text-xs">{s.participantRef}</td>
                  <td className="px-4 py-2 text-gray-500">
                    {s.completedAt ? new Date(s.completedAt).toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {s.durationSecs != null ? `${Math.round(s.durationSecs / 60)}m ${s.durationSecs % 60}s` : '-'}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {s.sortItems.filter(i => i.categoryId !== null).length} / {s.sortItems.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
  const cellSize = Math.max(24, Math.min(60, Math.floor(600 / n)));

  function color(v: number) {
    const r = Math.round(255 - v * 180);
    const g = Math.round(255 - v * 80);
    const b = 255;
    return `rgb(${r},${g},${b})`;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 overflow-auto">
      <h2 className="font-medium text-gray-800 mb-4">Similarity Matrix</h2>
      <div style={{ display: 'grid', gridTemplateColumns: `120px repeat(${n}, ${cellSize}px)` }}>
        {/* Header row */}
        <div />
        {cards.map((c) => (
          <div key={c.id} style={{ width: cellSize, height: 80 }} className="flex items-end justify-center">
            <span className="text-xs text-gray-600 rotate-[-60deg] origin-bottom-left block whitespace-nowrap">
              {c.name.length > 12 ? c.name.slice(0, 12) + '…' : c.name}
            </span>
          </div>
        ))}
        {/* Data rows */}
        {matrix.map((row, i) => (
          <React.Fragment key={i}>
            <div className="flex items-center pr-2">
              <span className="text-xs text-gray-600 truncate">{cards[i].name}</span>
            </div>
            {row.map((val, j) => (
              <div
                key={j}
                style={{ width: cellSize, height: cellSize, backgroundColor: color(val) }}
                className="flex items-center justify-center border border-white"
                title={`${cards[i].name} × ${cards[j].name}: ${(val * 100).toFixed(0)}%`}
              >
                {cellSize >= 32 && (
                  <span className="text-xs text-gray-700">{(val * 100).toFixed(0)}</span>
                )}
              </div>
            ))}
          </React.Fragment>
        ))}
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

  useEffect(() => {
    if (!data || !svgRef.current) return;
    renderDendrogram(svgRef.current, data.dendrogram);
  }, [data]);

  if (isLoading) return <p className="text-gray-400">Loading...</p>;
  if (!data || data.cards.length < 2) return <p className="text-gray-400">Need at least 2 cards and 1 submission.</p>;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 overflow-auto">
      <h2 className="font-medium text-gray-800 mb-4">Dendrogram</h2>
      <svg ref={svgRef} />
    </div>
  );
}

function renderDendrogram(svgEl: SVGSVGElement, root: DendrogramNode) {
  const margin = { top: 20, right: 200, bottom: 20, left: 60 };
  const width = 800;
  const height = 500;

  d3.select(svgEl).selectAll('*').remove();
  const svg = d3.select(svgEl)
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Convert our custom tree to d3 hierarchy
  function toD3Node(node: DendrogramNode): any {
    return {
      name: node.name || '',
      height: node.height,
      children: node.children?.map(toD3Node),
    };
  }

  const hierarchy = d3.hierarchy(toD3Node(root));
  const cluster = d3.cluster<any>().size([height, width - margin.right]);
  cluster(hierarchy);

  // Scale x by height
  const maxHeight = root.height;
  const xScale = d3.scaleLinear().domain([0, maxHeight || 1]).range([0, width - margin.right]);

  // Reposition nodes by height
  hierarchy.each((d: any) => {
    d.y = xScale(maxHeight - d.data.height);
  });

  // Links
  svg.selectAll('.link')
    .data(hierarchy.links())
    .enter().append('path')
    .attr('class', 'link')
    .attr('fill', 'none')
    .attr('stroke', '#94a3b8')
    .attr('stroke-width', 1.5)
    .attr('d', (d: any) =>
      `M${d.source.y},${d.source.x}H${d.target.y}V${d.target.x}H${d.target.y}`
    );

  // Nodes
  const node = svg.selectAll('.node')
    .data(hierarchy.descendants())
    .enter().append('g')
    .attr('class', 'node')
    .attr('transform', (d: any) => `translate(${d.y},${d.x})`);

  node.append('circle').attr('r', 3).attr('fill', '#3b82f6');

  // Labels for leaves
  node.filter((d: any) => !d.children)
    .append('text')
    .attr('x', 8)
    .attr('dy', '0.32em')
    .attr('font-size', 11)
    .attr('fill', '#374151')
    .text((d: any) => d.data.name);
}

// ─── Clustered Matrix ─────────────────────────────────────────────────────────

function ClusteredTab({ studyId }: { studyId: number }) {
  const { data, isLoading } = useQuery<ClusteringResult>({
    queryKey: ['clustering', studyId],
    queryFn: () => getClustering(studyId),
  });

  if (isLoading) return <p className="text-gray-400">Loading...</p>;
  if (!data || data.cards.length === 0) return <p className="text-gray-400">No data yet.</p>;

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500">Cards reordered by clustering (most similar cards are adjacent).</p>
      <MatrixHeatmap cards={data.cards} matrix={data.clusteredMatrix} />
    </div>
  );
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
