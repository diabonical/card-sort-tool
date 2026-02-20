import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createStudy } from '../../api/studies';
import NavBar from '../../components/NavBar';
import Button from '../../components/Button';

interface FormValues {
  title: string;
  description: string;
  type: 'OPEN' | 'CLOSED' | 'HYBRID';
  maxParticipants: string;
  endsAt: string;
  allowUnsorted: boolean;
}

export default function StudyCreatePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: { type: 'OPEN', allowUnsorted: true },
  });

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      createStudy({
        title: data.title,
        description: data.description,
        type: data.type,
        maxParticipants: data.maxParticipants ? parseInt(data.maxParticipants) : undefined,
        endsAt: data.endsAt || undefined,
        allowUnsorted: data.allowUnsorted,
      }),
    onSuccess: (study) => {
      qc.invalidateQueries({ queryKey: ['studies'] });
      navigate(`/studies/${study.id}/edit`);
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">New Study</h1>
        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="bg-white rounded-xl shadow-sm p-6 space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              {...register('title', { required: 'Title is required' })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
            <select
              {...register('type')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="OPEN">Open (participants create all categories)</option>
              <option value="CLOSED">Closed (researcher defines all categories)</option>
              <option value="HYBRID">Hybrid (researcher + participant categories)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max participants</label>
              <input
                type="number"
                min={1}
                {...register('maxParticipants')}
                placeholder="Unlimited"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
              <input
                type="date"
                {...register('endsAt')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="allowUnsorted" {...register('allowUnsorted')} />
            <label htmlFor="allowUnsorted" className="text-sm text-gray-700">
              Allow participants to leave cards unsorted
            </label>
          </div>

          {mutation.error && (
            <p className="text-red-500 text-sm">{String(mutation.error)}</p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={() => navigate('/')}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Create Study
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
