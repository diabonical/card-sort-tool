import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStudies, deleteStudy } from '../../api/studies';
import NavBar from '../../components/NavBar';
import Button from '../../components/Button';
import type { Study } from '../../types';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-800',
  PUBLISHED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-700',
};

const typeLabels: Record<string, string> = {
  OPEN: 'Open',
  CLOSED: 'Closed',
  HYBRID: 'Hybrid',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: studies = [], isLoading } = useQuery({ queryKey: ['studies'], queryFn: getStudies });
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const deleteMutation = useMutation({
    mutationFn: deleteStudy,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['studies'] });
      setDeletingId(null);
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Studies</h1>
          <Button onClick={() => navigate('/studies/new')}>+ New Study</Button>
        </div>

        {isLoading ? (
          <p className="text-gray-500">Loading...</p>
        ) : studies.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg mb-2">No studies yet</p>
            <p className="text-sm">Create your first study to get started.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Participants</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Cards</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {studies.map((study: Study) => (
                  <tr key={study.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{study.title}</td>
                    <td className="px-4 py-3 text-gray-600">{typeLabels[study.type]}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[study.status]}`}>
                        {study.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{study._count?.sessions ?? 0}</td>
                    <td className="px-4 py-3 text-gray-600">{study._count?.cards ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Link
                          to={`/studies/${study.id}/edit`}
                          className="text-blue-600 hover:underline text-xs"
                        >
                          Edit
                        </Link>
                        <Link
                          to={`/studies/${study.id}/results`}
                          className="text-green-600 hover:underline text-xs"
                        >
                          Results
                        </Link>
                        {deletingId === study.id ? (
                          <span className="flex items-center gap-1">
                            <button
                              className="text-red-600 text-xs"
                              onClick={() => deleteMutation.mutate(study.id)}
                            >
                              Confirm
                            </button>
                            <button className="text-gray-400 text-xs" onClick={() => setDeletingId(null)}>
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            className="text-gray-400 hover:text-red-500 text-xs"
                            onClick={() => setDeletingId(study.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
