"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
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
  is_invited: boolean;
}

export default function CompanyEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
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

      // Fetch all events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      if (eventsError) throw eventsError;

      // Fetch events where company is invited via event_participants
      const { data: participations, error: partError } = await supabase
        .from('event_participants')
        .select('event_id')
        .eq('company_id', company.id);

      if (partError) throw partError;

      // Create a set of event IDs where company is invited
      const invitedEventIds = new Set(
        (participations || []).map(p => p.event_id)
      );

      // Map events with invitation status
      const mappedEvents = eventsData.map((event: any) => {
        return {
          ...event,
          is_invited: invitedEventIds.has(event.id)
        };
      });

      setEvents(mappedEvents);
    } catch (err: any) {
      console.error('Error fetching events:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (isInvited: boolean) => {
    if (isInvited) {
      return (
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
          Invited
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
        Not Invited
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des événements...</p>
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
        <h1 className="text-3xl font-bold text-gray-900">Événements de recrutement</h1>
        <p className="mt-2 text-gray-600">
          Inscrivez-vous aux événements pour créer des offres et rencontrer des étudiants
        </p>
      </div>

      {/* Navigation */}
      <div className="mb-6">
        <Link
          href="/company/registrations"
          className="text-indigo-600 hover:text-indigo-700 font-medium"
        >
          ← Voir mes inscriptions
        </Link>
      </div>

      {/* Events Grid */}
      {events.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
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
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun événement</h3>
          <p className="mt-1 text-sm text-gray-500">
            Aucun événement n'est disponible pour le moment
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden"
            >
              <div className="p-6">
                {/* Status Badge */}
                <div className="flex justify-between items-start mb-4">
                  {getStatusBadge(event.is_invited || false)}
                  <span className="text-sm text-gray-500">
                    {formatDate(event.date)}
                  </span>
                </div>

                {/* Event Name */}
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {event.name}
                </h3>

                {/* Location */}
                <div className="flex items-center text-gray-600 mb-3">
                  <svg
                    className="h-5 w-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="text-sm">{event.location}</span>
                </div>

                {/* Description */}
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {event.description}
                </p>

                {/* Event Details */}
                <div className="border-t pt-4 mb-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Durée entrevue:</span>
                    <span className="font-medium">{event.interview_duration_minutes} min</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Places par créneau:</span>
                    <span className="font-medium">{event.slots_per_time}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Max par étudiant:</span>
                    <span className="font-medium">
                      {event.max_interviews_per_student} entrevues
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <Link
                  href={`/company/events/${event.id}`}
                  className="block w-full text-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {event.is_invited ? 'View Details' : 'View Event'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
