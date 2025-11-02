"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Registration {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  registered_at: string;
  approved_at?: string;
  notes?: string;
  event: {
    id: string;
    name: string;
    date: string;
    location: string;
  };
}

export default function CompanyRegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);

      // Get current company
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('profile_id', user.id)
        .single();

      if (companyError) throw companyError;

      // Fetch registrations with event details using RPC
      const { data: registrationsData, error: registrationsError } = await supabase
        .rpc('fn_get_company_registrations', {
          p_company_id: company.id
        });

      if (registrationsError) throw registrationsError;

      // Transform data to match our interface
      const transformedData = registrationsData?.map((reg: any) => ({
        id: reg.id,
        status: reg.status,
        registered_at: reg.registered_at,
        approved_at: reg.approved_at,
        notes: reg.notes,
        event: {
          id: reg.event_id,
          name: reg.event_name,
          date: reg.event_date,
          location: reg.event_location,
        }
      })) || [];

      setRegistrations(transformedData);
    } catch (err: any) {
      console.error('Error fetching registrations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRegistration = async (registrationId: string) => {
    const confirmed = confirm('Êtes-vous sûr de vouloir annuler cette inscription ?');
    if (!confirmed) return;

    try {
      setCancellingId(registrationId);
      setError(null);

      const { error } = await supabase
        .from('event_registrations')
        .delete()
        .eq('id', registrationId);

      if (error) throw error;

      // Remove from list
      setRegistrations(prev => prev.filter(r => r.id !== registrationId));

    } catch (err: any) {
      console.error('Error canceling registration:', err);
      setError(err.message);
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; text: string; icon: string }> = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', text: 'En attente', icon: '⏳' },
      approved: { color: 'bg-green-100 text-green-800 border-green-200', text: 'Approuvé', icon: '✅' },
      rejected: { color: 'bg-red-100 text-red-800 border-red-200', text: 'Rejeté', icon: '❌' }
    };

    const badge = badges[status] || badges.pending;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${badge.color}`}>
        <span className="mr-1">{badge.icon}</span>
        {badge.text}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des inscriptions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Erreur: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Mes inscriptions aux événements</h1>
        <p className="mt-2 text-gray-600">
          Gérez vos inscriptions et consultez leur statut d'approbation
        </p>
      </div>

      {/* Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/company/events"
          className="text-indigo-600 hover:text-indigo-700 font-medium"
        >
          ← Voir tous les événements
        </Link>

        <Link
          href="/company/events"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Découvrir d'autres événements
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-yellow-100 rounded-lg p-3">
              <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">En attente</p>
              <p className="text-2xl font-bold text-gray-900">
                {registrations.filter(r => r.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Approuvées</p>
              <p className="text-2xl font-bold text-gray-900">
                {registrations.filter(r => r.status === 'approved').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-red-100 rounded-lg p-3">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Refusées</p>
              <p className="text-2xl font-bold text-gray-900">
                {registrations.filter(r => r.status === 'rejected').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Registrations List */}
      {registrations.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune inscription</h3>
          <p className="mt-1 text-sm text-gray-500">
            Vous n'êtes inscrit à aucun événement pour le moment
          </p>
          <div className="mt-6">
            <Link
              href="/company/events"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Découvrir les événements
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Événement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date de l'événement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Inscrit le
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {registrations.map((registration) => (
                  <tr key={registration.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {registration.event.name}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center mt-1">
                          <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {registration.event.location}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(registration.event.date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        {getStatusBadge(registration.status)}
                        {registration.notes && (
                          <p className="text-xs text-gray-500 mt-2">
                            {registration.notes}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {formatDateTime(registration.registered_at)}
                      </div>
                      {registration.approved_at && (
                        <div className="text-xs text-gray-400 mt-1">
                          Traité le {formatDateTime(registration.approved_at)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          href={`/company/events/${registration.event.id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Voir
                        </Link>
                        {registration.status === 'pending' && (
                          <button
                            onClick={() => handleCancelRegistration(registration.id)}
                            disabled={cancellingId === registration.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            {cancellingId === registration.id ? 'Annulation...' : 'Annuler'}
                          </button>
                        )}
                        {registration.status === 'approved' && (
                          <Link
                            href="/company/offers/new"
                            className="text-green-600 hover:text-green-900"
                          >
                            Créer offre
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
