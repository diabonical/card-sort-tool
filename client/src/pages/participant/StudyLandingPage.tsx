import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getStudyByToken, createSession, giveConsent, startSession } from '../../api/participant';
import Button from '../../components/Button';

export default function StudyLandingPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [consent, setConsent] = useState(false);
  const [starting, setStarting] = useState(false);

  const { data: study, isLoading, error } = useQuery({
    queryKey: ['p-study', token],
    queryFn: () => getStudyByToken(token!),
    retry: false,
  });

  const handleStart = async () => {
    if (!consent || !token) return;
    setStarting(true);
    try {
      const { sessionId } = await createSession(token);
      await giveConsent(token, sessionId);
      await startSession(token, sessionId);
      navigate(`/s/${token}/sort`, { state: { sessionId } });
    } catch (e) {
      console.error(e);
      setStarting(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading study...</div>;
  }

  if (error || !study) {
    const msg = (error as any)?.response?.data?.error || 'Study not found or unavailable.';
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-700 mb-2">Unable to load study</p>
          <p className="text-sm text-gray-500">{msg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{study.title}</h1>
        {study.description && (
          <p className="text-gray-600 mb-6 text-sm leading-relaxed">{study.description}</p>
        )}

        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-blue-800 mb-2 text-sm">Instructions</h2>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• You will be shown a set of cards</li>
            <li>• Drag cards into groups that make sense to you</li>
            {study.type !== 'CLOSED' && <li>• You can create and name your own groups</li>}
            {study.type === 'CLOSED' && <li>• Sort cards into the provided categories</li>}
            {!study.allowUnsorted && <li>• All cards must be sorted before submitting</li>}
            <li>• Your responses are completely anonymous</li>
          </ul>
        </div>

        <div className="flex items-start gap-3 mb-6">
          <input
            type="checkbox"
            id="consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="consent" className="text-sm text-gray-600">
            I consent to participate in this research study. I understand my responses are anonymous
            and will be used for research purposes.
          </label>
        </div>

        <Button
          className="w-full justify-center"
          disabled={!consent}
          loading={starting}
          onClick={handleStart}
        >
          Start Sorting
        </Button>

        <p className="text-xs text-gray-400 text-center mt-4">
          {study.cards.length} cards to sort
        </p>
      </div>
    </div>
  );
}
