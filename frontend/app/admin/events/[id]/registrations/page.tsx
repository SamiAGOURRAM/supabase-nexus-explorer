"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Event {
  id: string;
  name: string;
  date: string;
  location: string;
}

interface Registration {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  registered_at: string;
  approved_at?: string;
  approved_by?: string;
  notes?: string;
  company: {
    id: string;
    name: string;
    industry?: string;
    verification_status: string;
    profile: {
      email: string;
      full_name: string;
    };
  };
}

export default function EventRegistrationsPage() {
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();

  const eventId = params.id as string;

  useEffect(() => {
    fetchEventRegistrations();
  }, [eventId]);

  const fetchEventRegistrations = async () => {
    try {
      setLoading(true);

      // Check if user is admin
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        router.push('/');
        return;
      }

      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Fetch registrations with company details using RPC
      const { data: registrationsData, error: registrationsError } = await supabase
        .rpc('fn_get_event_registrations', {
          p_event_id: eventId
        });

      if (registrationsError) throw registrationsError;

      // Transform data to match our interface
      const transformedData = registrationsData?.map((reg: any) => ({
        id: reg.id,
        status: reg.status,
        registered_at: reg.registered_at,
        approved_at: reg.approved_at,
        approved_by: reg.approved_by,
        notes: reg.notes,
        company: {
          id: reg.company_id,
          name: reg.company_name,
          industry: reg.company_industry,
          verification_status: reg.company_verification_status,
          profile: {
            email: reg.contact_email,
            full_name: reg.contact_name,
          }
        }
      })) || [];

      setRegistrations(transformedData);

    } catch (err: any) {
      console.error('Error fetching event registrations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManageRegistration = async (
    registrationId: string,
    status: 'approved' | 'rejected'
  ) => {
    const action = status === 'approved' ? 'approuver' : 'rejeter';
    const confirmed = confirm(`Êtes-vous sûr de vouloir ${action} cette inscription ?`);
    if (!confirmed) return;

    try {
      setProcessing(registrationId);
      setError(null);

      const { error } = await supabase.rpc('fn_manage_event_registration', {
        p_registration_id: registrationId,
        p_status: status,
        p_notes: notes[registrationId] || null
      });

      if (error) throw error;

      // Refresh registrations
      await fetchEventRegistrations();

      // Clear notes
      setNotes(prev => {
        const newNotes = { ...prev };
        delete newNotes[registrationId];
        return newNotes;
      });

    } catch (err: any) {
      console.error('Error managing registration:', err);
      setError(err.message);
    } finally {
      setProcessing(null);
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
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Erreur: {error}</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p>Événement non trouvé</p>
      </div>
    );
  }

  const pendingCount = registrations.filter(r => r.status === 'pending').length;
  const approvedCount = registrations.filter(r => r.status === 'approved').length;
  const rejectedCount = registrations.filter(r => r.status === 'rejected').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/events"
          className="text-indigo-600 hover:text-indigo-700 font-medium mb-4 inline-block"
        >
          ← Retour aux événements
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{event.name}</h1>
        <p className="mt-2 text-gray-600">
          Gestion des inscriptions d'entreprises
        </p>
        <div className="mt-2 text-sm text-gray-500">
          {formatDate(event.date)} • {event.location}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

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
              <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
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
              <p className="text-2xl font-bold text-gray-900">{approvedCount}</p>
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
              <p className="text-2xl font-bold text-gray-900">{rejectedCount}</p>
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
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune inscription</h3>
          <p className="mt-1 text-sm text-gray-500">
            Aucune entreprise ne s'est inscrite à cet événement
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Inscriptions ({registrations.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {registrations.map((registration) => (
              <div key={registration.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Company Info */}
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {registration.company.name}
                      </h3>
                      {getStatusBadge(registration.status)}
                      {registration.company.verification_status === 'verified' && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          ✓ Vérifiée
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      {registration.company.industry && (
                        <p>
                          <strong>Secteur:</strong> {registration.company.industry}
                        </p>
                      )}
                      <p>
                        <strong>Contact:</strong> {registration.company.profile.full_name} ({registration.company.profile.email})
                      </p>
                      <p>
                        <strong>Inscrite le:</strong> {formatDateTime(registration.registered_at)}
                      </p>
                      {registration.approved_at && (
                        <p>
                          <strong>Traitée le:</strong> {formatDateTime(registration.approved_at)}
                        </p>
                      )}
                      {registration.notes && (
                        <p className="bg-gray-50 p-2 rounded">
                          <strong>Note:</strong> {registration.notes}
                        </p>
                      )}
                    </div>

                    {/* Action Area (only for pending) */}
                    {registration.status === 'pending' && (
                      <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Note (optionnelle)
                        </label>
                        <textarea
                          value={notes[registration.id] || ''}
                          onChange={(e) => setNotes({ ...notes, [registration.id]: e.target.value })}
                          placeholder="Ajouter une note ou raison du refus..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 mb-3"
                          rows={2}
                        />
                        <div className="flex space-x-3">
                          <button
                            onClick={() => handleManageRegistration(registration.id, 'approved')}
                            disabled={processing === registration.id}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium transition-colors"
                          >
                            {processing === registration.id ? 'Traitement...' : '✓ Approuver'}
                          </button>
                          <button
                            onClick={() => handleManageRegistration(registration.id, 'rejected')}
                            disabled={processing === registration.id}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium transition-colors"
                          >
                            {processing === registration.id ? 'Traitement...' : '✗ Refuser'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
