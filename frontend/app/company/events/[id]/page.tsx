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
  description: string;
  interview_duration_minutes: number;
  buffer_minutes: number;
  slots_per_time: number;
  max_interviews_per_student: number;
  phase1_booking_limit: number;
  phase2_booking_limit: number;
}

interface EventTimeRange {
  id: string;
  day_date: string;
  start_time: string;
  end_time: string;
}

interface Registration {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  registered_at: string;
  notes?: string;
}

export default function EventDetailPage() {
  const [event, setEvent] = useState<Event | null>(null);
  const [timeRanges, setTimeRanges] = useState<EventTimeRange[]>([]);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();

  const eventId = params.id as string;

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);

      // Get current user and company
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id, verification_status')
        .eq('profile_id', user.id)
        .single();

      if (companyError) throw companyError;
      setCompanyId(company.id);

      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Fetch time ranges
      const { data: rangesData, error: rangesError } = await supabase
        .from('event_time_ranges')
        .select('*')
        .eq('event_id', eventId)
        .order('day_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (rangesError) throw rangesError;
      setTimeRanges(rangesData || []);

      // Check if already registered
      const { data: registrationData, error: registrationError } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', eventId)
        .eq('company_id', company.id)
        .maybeSingle();

      if (registrationError && registrationError.code !== 'PGRST116') {
        throw registrationError;
      }

      setRegistration(registrationData);

    } catch (err: any) {
      console.error('Error fetching event details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!companyId) return;

    try {
      setRegistering(true);
      setError(null);

      const { data, error } = await supabase.rpc('fn_register_for_event', {
        p_event_id: eventId,
        p_company_id: companyId
      });

      if (error) throw error;

      // Refresh page to show updated status
      await fetchEventDetails();
      
    } catch (err: any) {
      console.error('Error registering for event:', err);
      setError(err.message);
    } finally {
      setRegistering(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!registration) return;

    const confirmed = confirm('Êtes-vous sûr de vouloir annuler votre inscription ?');
    if (!confirmed) return;

    try {
      setRegistering(true);
      setError(null);

      const { error } = await supabase
        .from('event_registrations')
        .delete()
        .eq('id', registration.id);

      if (error) throw error;

      // Refresh page
      await fetchEventDetails();

    } catch (err: any) {
      console.error('Error canceling registration:', err);
      setError(err.message);
    } finally {
      setRegistering(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5); // HH:MM
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/company/events"
          className="text-indigo-600 hover:text-indigo-700 font-medium"
        >
          ← Retour aux événements
        </Link>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Event Card */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-indigo-600 px-6 py-8 text-white">
          <h1 className="text-3xl font-bold mb-2">{event.name}</h1>
          <div className="flex items-center space-x-4 text-indigo-100">
            <div className="flex items-center">
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{formatDate(event.date)}</span>
            </div>
            <div className="flex items-center">
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{event.location}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Registration Status */}
          {registration && (
            <div className={`p-4 rounded-lg ${
              registration.status === 'pending' ? 'bg-yellow-50 border border-yellow-200' :
              registration.status === 'approved' ? 'bg-green-50 border border-green-200' :
              'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium ${
                    registration.status === 'pending' ? 'text-yellow-800' :
                    registration.status === 'approved' ? 'text-green-800' :
                    'text-red-800'
                  }`}>
                    {registration.status === 'pending' && '⏳ Inscription en attente d\'approbation'}
                    {registration.status === 'approved' && '✅ Inscription approuvée'}
                    {registration.status === 'rejected' && '❌ Inscription refusée'}
                  </p>
                  {registration.notes && (
                    <p className="text-sm mt-1 text-gray-600">
                      Note: {registration.notes}
                    </p>
                  )}
                </div>
                {registration.status === 'pending' && (
                  <button
                    onClick={handleCancelRegistration}
                    disabled={registering}
                    className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Description</h2>
            <p className="text-gray-700 leading-relaxed">{event.description}</p>
          </div>

          {/* Event Details */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Détails de l'événement</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Durée d'entrevue</p>
                <p className="text-lg font-semibold text-gray-900">
                  {event.interview_duration_minutes} minutes
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Buffer entre entrevues</p>
                <p className="text-lg font-semibold text-gray-900">
                  {event.buffer_minutes} minutes
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Capacité par créneau</p>
                <p className="text-lg font-semibold text-gray-900">
                  {event.slots_per_time} étudiant{event.slots_per_time > 1 ? 's' : ''}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Max par étudiant</p>
                <p className="text-lg font-semibold text-gray-900">
                  {event.max_interviews_per_student} entrevues
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Phase 1 (max)</p>
                <p className="text-lg font-semibold text-gray-900">
                  {event.phase1_booking_limit} entrevues
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Phase 2 (max)</p>
                <p className="text-lg font-semibold text-gray-900">
                  {event.phase2_booking_limit} entrevues
                </p>
              </div>
            </div>
          </div>

          {/* Time Ranges */}
          {timeRanges.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Horaires disponibles</h2>
              <div className="space-y-2">
                {timeRanges.map((range) => (
                  <div key={range.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-900">
                      {formatDate(range.day_date)}
                    </span>
                    <span className="text-gray-600">
                      {formatTime(range.start_time)} - {formatTime(range.end_time)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Button */}
          {!registration && (
            <div className="pt-4">
              <button
                onClick={handleRegister}
                disabled={registering}
                className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {registering ? 'Inscription en cours...' : 'S\'inscrire à cet événement'}
              </button>
              <p className="mt-2 text-sm text-gray-500 text-center">
                Votre inscription sera soumise pour approbation par l'administrateur
              </p>
            </div>
          )}

          {registration?.status === 'approved' && (
            <div className="pt-4">
              <Link
                href="/company/offers/new"
                className="block w-full text-center px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Créer une offre pour cet événement
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
