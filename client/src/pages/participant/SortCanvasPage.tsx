import React, { useEffect, useCallback, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getStudyByToken, saveSortState, submitSession } from '../../api/participant';
import SortCanvas, { SortState } from '../../components/SortCanvas';

export default function SortCanvasPage() {
  const { token } = useParams<{ token: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const sessionId: number = location.state?.sessionId;
  const [submitted, setSubmitted] = React.useState(false);

  useEffect(() => {
    if (!sessionId) navigate(`/s/${token}`);
  }, [sessionId, navigate, token]);

  const { data: study } = useQuery({
    queryKey: ['p-study', token],
    queryFn: () => getStudyByToken(token!),
  });

  const handleSubmit = async (state: SortState) => {
    if (!token || !sessionId) return;
    await saveSortState(token, sessionId, state);
    await submitSession(token, sessionId);
    setSubmitted(true);
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

  return (
    <SortCanvas
      studyTitle={study.title}
      studyType={study.type}
      allowUnsorted={study.allowUnsorted}
      cards={study.cards}
      researcherCategories={study.researcherCategories}
      onSubmit={handleSubmit}
    />
  );
}
