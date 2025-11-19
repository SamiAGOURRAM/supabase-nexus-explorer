import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';

export default function Home() {
  const { user, profile } = useUser();
  const [liveStats, setLiveStats] = useState({ offers: 0, companies: 0, events: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadStats = async () => {
      try {
        setStatsError(null);
        setStatsLoading(true);

        const [
          { count: offersCount, error: offersError },
          { count: companiesCount, error: companiesError },
          { count: eventsCount, error: eventsError },
        ] = await Promise.all([
          supabase.from('offers').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('companies').select('*', { count: 'exact', head: true }).eq('is_verified', true),
          supabase.from('events').select('*', { count: 'exact', head: true }).eq('is_active', true),
        ]);

        if (!isMounted) return;

        if (offersError || companiesError || eventsError) {
          throw offersError || companiesError || eventsError;
        }

        setLiveStats({
          offers: offersCount ?? 0,
          companies: companiesCount ?? 0,
          events: eventsCount ?? 0,
        });
      } catch (error) {
        console.error('Failed to load live stats:', error);
        if (isMounted) {
          setStatsError('Live stats are temporarily unavailable.');
        }
      } finally {
        if (isMounted) {
          setStatsLoading(false);
        }
      }
    };

    loadStats();
    return () => {
      isMounted = false;
    };
  }, []);

  const statCards = useMemo(
    () => [
      { label: 'Active offers', value: liveStats.offers, helper: 'Open for booking' },
      { label: 'Verified partners', value: liveStats.companies, helper: 'Hospitality leaders' },
      { label: 'Events in motion', value: liveStats.events, helper: 'This season' },
    ],
    [liveStats]
  );

  const getDashboardLink = () => {
    if (!profile) return '/login';
    switch (profile.role) {
      case 'admin': return '/admin';
      case 'company': return '/company';
      case 'student': return '/student';
      default: return '/login';
    }
  };

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Open Sans', sans-serif" }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-5">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold" style={{ fontFamily: "'Playfair Display', serif" }}>
              Internship & Networking Forum
            </h1>
            <nav className="hidden md:flex items-center space-x-8">
              <Link to="/offers" className="text-gray-800 hover:text-yellow-700 transition-colors">Offerings</Link>
              {user ? (
                <Link to={getDashboardLink()} className="text-gray-800 hover:text-yellow-700 transition-colors font-medium">
                  Dashboard
                </Link>
              ) : (
                <Link to="/login" className="text-gray-800 hover:text-yellow-700 transition-colors">Login</Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-amber-50 to-orange-50 py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-yellow-800 text-sm font-semibold mb-4 tracking-wide uppercase">
            Welcome to the soul of our vision
          </p>
          <h2 
            className="text-5xl md:text-6xl font-bold mb-6 text-gray-900" 
            style={{ fontFamily: "'Playfair Display', serif", lineHeight: '1.1' }}
          >
            Connect, Network, Build
          </h2>
          <p className="text-lg text-gray-700 mb-8 leading-relaxed max-w-3xl mx-auto">
            The Internship Networking Forum (INF) at SHBM, UM6P. Learn more about this exclusive event for hospitality students.
          </p>
          <Link 
            to="/signup"
            className="inline-block px-8 py-4 bg-yellow-700 text-white rounded hover:bg-yellow-800 transition-colors text-base font-medium"
          >
            LEARN MORE
          </Link>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-white/60 bg-white/70 p-6 text-left shadow-soft backdrop-blur"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-yellow-800">{card.label}</p>
                {statsLoading ? (
                  <div className="mt-3 h-8 w-20 animate-pulse rounded-full bg-amber-100/70" />
                ) : (
                  <p
                    className="mt-3 text-3xl font-bold text-gray-900"
                    aria-live="polite"
                  >
                    {card.value.toLocaleString()}
                  </p>
                )}
                <p className="mt-1 text-sm text-gray-600">{card.helper}</p>
              </div>
            ))}
          </div>
          {statsError && (
            <p className="mt-4 text-sm font-medium text-red-700" role="status">
              {statsError}
            </p>
          )}
        </div>
      </section>

      {/* Offerings Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 
              className="text-4xl md:text-5xl font-bold mb-6 text-gray-900" 
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Explore Our Key Offerings
            </h2>
            <p className="text-lg text-gray-700 max-w-3xl mx-auto">
              Discover the unique opportunities designed to connect students with top-tier hospitality companies and industry leaders.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="group">
              <div className="mb-6 overflow-hidden rounded-lg">
                <div className="w-full h-80 bg-gradient-to-br from-amber-600 to-orange-700 transition-transform group-hover:scale-105 duration-300" />
              </div>
              <h3 
                className="text-2xl font-bold mb-4 text-gray-900" 
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Internship Opportunities
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Connect with leading hotels and companies seeking talented interns. Tap into exclusive listings that open doors to your career.
              </p>
            </div>

            <div className="group">
              <div className="mb-6 overflow-hidden rounded-lg">
                <div className="w-full h-80 bg-gradient-to-br from-amber-700 to-yellow-800 transition-transform group-hover:scale-105 duration-300" />
              </div>
              <h3 
                className="text-2xl font-bold mb-4 text-gray-900" 
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Networking Events
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Engage with industry experts and establish valuable connections through tailored networking sessions. Your future colleagues await!
              </p>
            </div>

            <div className="group">
              <div className="mb-6 overflow-hidden rounded-lg">
                <div className="w-full h-80 bg-gradient-to-br from-yellow-700 to-amber-800 transition-transform group-hover:scale-105 duration-300" />
              </div>
              <h3 
                className="text-2xl font-bold mb-4 text-gray-900" 
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Workshops & Seminars
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Participate in educational workshops led by hospitality leaders. Gain insights and skills that prepare you for the professional world.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 px-4 bg-amber-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="w-full h-96 bg-gradient-to-br from-amber-700 to-orange-800 rounded-lg" />
            </div>
            <div>
              <h2 
                className="text-4xl font-bold mb-6 text-gray-900" 
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                The Story Behind Our Forum
              </h2>
              <p className="text-gray-700 leading-relaxed mb-6">
                The Internship Networking Forum brings together hospitality professionals and students, fostering an environment for growth, mentorship, and opportunity.
              </p>
              <Link 
                to="/offers"
                className="inline-block px-8 py-3 bg-yellow-700 text-white rounded hover:bg-yellow-800 transition-colors"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-amber-50 p-8 rounded-lg border border-amber-100">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gray-300 rounded-full mb-4" />
                <p className="text-gray-700 italic mb-6 leading-relaxed">
                  "INF helped me secure my first professional internship with a globally renowned brand, providing practical experience and invaluable networking opportunities."
                </p>
                <h4 className="font-bold text-gray-900">Mohamed IBENBBA</h4>
                <p className="text-sm text-gray-600">Relais & Châteaux</p>
              </div>
            </div>

            <div className="bg-amber-50 p-8 rounded-lg border border-amber-100">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gray-300 rounded-full mb-4" />
                <p className="text-gray-700 italic mb-6 leading-relaxed">
                  "Attending the INF Forum connected me with industry leaders and led to an internship in Butler Service at St. Regis La Bahia Blanca Resort."
                </p>
                <h4 className="font-bold text-gray-900">Chahd Bouskrirou</h4>
                <p className="text-sm text-gray-600">St Regis Hotels</p>
              </div>
            </div>

            <div className="bg-amber-50 p-8 rounded-lg border border-amber-100">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gray-300 rounded-full mb-4" />
                <p className="text-gray-700 italic mb-6 leading-relaxed">
                  "The INF was my gateway into the hospitality world, landing me an F&B internship at Mandarin Oriental Marrakech."
                </p>
                <h4 className="font-bold text-gray-900">Sofia Dakir</h4>
                <p className="text-sm text-gray-600">Mandarin Oriental Hotel Group</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why INF Section */}
      <section className="py-20 px-4 bg-amber-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 
              className="text-4xl md:text-5xl font-bold mb-6 text-gray-900" 
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Why an INF?
            </h2>
            <p className="text-lg text-gray-700 max-w-3xl mx-auto">
              The Internship Networking Forum (INF) at SHBM, UM6P provides unparalleled access to industry leaders, customized internship opportunities, and a supportive community.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <div className="w-full h-72 bg-gradient-to-br from-amber-600 to-orange-700 rounded-lg mb-6" />
              <h3 
                className="text-2xl font-bold mb-4 text-gray-900" 
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Industry Connections
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Our platform connects students with top companies in the hospitality sector, ensuring you meet the right people for your career advancement.
              </p>
              <Link to="/offers" className="inline-block px-6 py-2 bg-yellow-700 text-white rounded hover:bg-yellow-800 transition-colors">
                Learn More
              </Link>
            </div>

            <div>
              <div className="w-full h-72 bg-gradient-to-br from-yellow-700 to-amber-800 rounded-lg mb-6" />
              <h3 
                className="text-2xl font-bold mb-4 text-gray-900" 
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Student-Led Initiatives
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Organized by students for students, our forum uniquely understands the needs of aspiring professionals, fostering a supportive community.
              </p>
              <Link to="/offers" className="inline-block px-6 py-2 bg-yellow-700 text-white rounded hover:bg-yellow-800 transition-colors">
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-yellow-700 to-amber-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 
            className="text-4xl md:text-5xl font-bold mb-6 text-white" 
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Join the INF Today
          </h2>
          <p className="text-xl text-amber-100 mb-8 leading-relaxed">
            Don't miss the opportunity to connect with potential employers and fellow students.<br />
            Sign up and start your journey toward a bright future!
          </p>
          <Link 
            to="/signup"
            className="inline-block px-8 py-4 bg-white text-yellow-800 rounded hover:shadow-xl transition-shadow text-base font-semibold"
          >
            Register Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-700">
            <p>
              Copyright © 2025 Internship & Networking Forum
            </p>
            <div className="flex items-center gap-4">
              <Link to="/privacy-policy" className="hover:text-yellow-700 transition-colors">
                Privacy Policy
              </Link>
              <span className="text-gray-400">|</span>
              <a href="mailto:nexus@um6p.ma" className="hover:text-yellow-700 transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
