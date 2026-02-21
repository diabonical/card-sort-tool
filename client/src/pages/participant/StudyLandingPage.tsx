import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
    return (
      <div className="min-h-screen bg-brand-500 flex items-center justify-center">
        <p className="text-white/70 text-sm">Loading study...</p>
      </div>
    );
  }

  if (error || !study) {
    const msg = (error as any)?.response?.data?.error || 'Study not found or unavailable.';
    return (
      <div className="min-h-screen bg-brand-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="font-semibold text-gray-800 mb-1">Unable to load study</p>
          <p className="text-sm text-gray-500">{msg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-500 flex flex-col">
      {/* Header bar */}
      <header className="px-6 py-4 flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="text-white font-bold tracking-wide">akendi</span>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
          {/* Teal top accent */}
          <div className="h-1.5 bg-gradient-to-r from-brand-400 to-brand-500" />

          <div className="p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{study.title}</h1>

            {study.description && (
              <p className="text-gray-500 text-sm leading-relaxed mb-4">{study.description}</p>
            )}

            {study.instructions && (
              <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 mb-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {study.instructions}
              </div>
            )}

            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <h2 className="font-semibold text-gray-700 mb-2 text-sm">How it works</h2>
              <ul className="text-sm text-gray-500 space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-brand-400 mt-0.5">•</span>
                  You will be shown a set of cards
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand-400 mt-0.5">•</span>
                  Drag cards into groups that make sense to you
                </li>
                {study.type !== 'CLOSED' && (
                  <li className="flex items-start gap-2">
                    <span className="text-brand-400 mt-0.5">•</span>
                    Create and name your own groups
                  </li>
                )}
                {study.type === 'CLOSED' && (
                  <li className="flex items-start gap-2">
                    <span className="text-brand-400 mt-0.5">•</span>
                    Sort cards into the provided categories
                  </li>
                )}
                {!study.allowUnsorted && (
                  <li className="flex items-start gap-2">
                    <span className="text-brand-400 mt-0.5">•</span>
                    All cards must be sorted before submitting
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <span className="text-brand-400 mt-0.5">•</span>
                  Your responses are completely anonymous
                </li>
              </ul>
            </div>

            <div className="flex items-start gap-3 mb-6">
              <div className="mt-0.5">
                <input
                  type="checkbox"
                  id="consent"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-brand-400 focus:ring-brand-400"
                />
              </div>
              <label htmlFor="consent" className="text-sm text-gray-500 leading-relaxed cursor-pointer">
                I consent to participate in this research study. I understand my responses are
                anonymous and will be used for research purposes.
              </label>
            </div>

            <Button
              className="w-full justify-center"
              size="lg"
              disabled={!consent}
              loading={starting}
              onClick={handleStart}
            >
              Start Sorting →
            </Button>

            <p className="text-xs text-gray-300 text-center mt-4">
              {study.cards.length} card{study.cards.length !== 1 ? 's' : ''} to sort
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
