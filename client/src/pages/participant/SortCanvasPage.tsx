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
      <div className="min-h-screen bg-brand-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank you!</h1>
          <p className="text-gray-500 text-sm">Your card sort has been submitted successfully.</p>
          <p className="text-gray-400 text-xs mt-4">Powered by <span className="font-semibold text-brand-400">akendi</span></p>
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
