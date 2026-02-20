import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getStudy } from '../../api/studies';
import SortCanvas from '../../components/SortCanvas';

export default function StudyPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const studyId = parseInt(id!);
  const navigate = useNavigate();

  const { data: study, isLoading } = useQuery({
    queryKey: ['study', studyId],
    queryFn: () => getStudy(studyId),
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  }

  if (!study) {
    return <div className="min-h-screen flex items-center justify-center text-red-400">Study not found</div>;
  }

  return (
    <SortCanvas
      studyTitle={study.title}
      studyType={study.type}
      allowUnsorted={study.allowUnsorted}
      cards={study.cards ?? []}
      researcherCategories={study.researcherCategories ?? []}
      preview
      onExitPreview={() => navigate(`/studies/${studyId}/edit`)}
    />
  );
}
