import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStudies, deleteStudy } from '../../api/studies';
import NavBar from '../../components/NavBar';
import Button from '../../components/Button';
import type { Study } from '../../types';

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT:     { label: 'Draft',     className: 'bg-amber-100 text-amber-700' },
  PUBLISHED: { label: 'Published', className: 'bg-emerald-100 text-emerald-700' },
  CLOSED:    { label: 'Closed',    className: 'bg-gray-100 text-gray-500' },
};

const typeLabels: Record<string, string> = {
  OPEN: 'Open', CLOSED: 'Closed', HYBRID: 'Hybrid',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: studies = [], isLoading } = useQuery({ queryKey: ['studies'], queryFn: getStudies });
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const deleteMutation = useMutation({
    mutationFn: deleteStudy,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['studies'] }); setDeletingId(null); },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Studies</h1>
            <p className="text-gray-500 text-sm mt-0.5">Manage your card sort research studies</p>
          </div>
          <Button onClick={() => navigate('/studies/new')}>
            + New Study
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-gray-400 text-sm">Loading...</div>
        ) : studies.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-700 font-medium mb-1">No studies yet</p>
            <p className="text-gray-400 text-sm mb-6">Create your first card sort study to get started</p>
            <Button onClick={() => navigate('/studies/new')}>Create a Study</Button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Study</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Participants</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Cards</th>
                  <th className="px-4 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {studies.map((study: Study) => {
                  const status = statusConfig[study.status] ?? statusConfig.DRAFT;
                  return (
                    <tr key={study.id} className="hover:bg-brand-50/40 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900">{study.title}</p>
                        {study.description && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{study.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-gray-500">{typeLabels[study.type]}</td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-500">{study._count?.sessions ?? 0}</td>
                      <td className="px-4 py-4 text-gray-500">{study._count?.cards ?? 0}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3 justify-end">
                          <Link to={`/studies/${study.id}/edit`} className="text-brand-500 hover:text-brand-600 font-medium text-xs">
                            Edit
                          </Link>
                          <Link to={`/studies/${study.id}/results`} className="text-brand-500 hover:text-brand-600 font-medium text-xs">
                            Results
                          </Link>
                          {deletingId === study.id ? (
                            <span className="flex items-center gap-2">
                              <button className="text-red-500 text-xs font-medium" onClick={() => deleteMutation.mutate(study.id)}>
                                Confirm
                              </button>
                              <button className="text-gray-400 text-xs" onClick={() => setDeletingId(null)}>Cancel</button>
                            </span>
                          ) : (
                            <button className="text-gray-300 hover:text-red-400 text-xs transition-colors" onClick={() => setDeletingId(study.id)}>
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
