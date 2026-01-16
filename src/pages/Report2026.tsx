import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';

const COLORS = ['#007e40', '#ffb300', '#f8231d', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function Report2026() {
  // User Overview Data
  const userOverview = [
    { metric: 'Total Students', value: 177 },
    { metric: 'Total Companies', value: 40 },
    { metric: 'Total Admins', value: 3 },
    { metric: 'Total Events', value: 1 },
  ];

  // Student Signup Timeline
  const studentSignups = [
    { date: 'Jan 6', signups: 100, percentage: '56.5%' },
    { date: 'Jan 7', signups: 56, percentage: '31.6%' },
    { date: 'Jan 8', signups: 17, percentage: '9.6%' },
    { date: 'Jan 9', signups: 2, percentage: '1.1%' },
    { date: 'Jan 13', signups: 2, percentage: '1.1%' },
  ];

  // Profile Completion Rates
  const profileCompletion = [
    { field: 'Phone', completed: 159, percentage: 89.8 },
    { field: 'Graduation Year', completed: 128, percentage: 72.3 },
    { field: 'Specialization', completed: 128, percentage: 72.3 },
    { field: 'CV/Resume', completed: 122, percentage: 68.9 },
    { field: 'Program', completed: 122, percentage: 68.9 },
    { field: 'Profile Photo', completed: 112, percentage: 63.3 },
    { field: 'LinkedIn', completed: 94, percentage: 53.1 },
    { field: 'Biography', completed: 68, percentage: 38.4 },
  ];

  // Program Distribution
  const programDistribution = [
    { name: "Bachelor's", value: 91 },
    { name: 'IVET', value: 31 },
    { name: 'Not specified', value: 55 },
  ];

  // Graduation Year Distribution
  const graduationYears = [
    { year: '2021', students: 2 },
    { year: '2024', students: 2 },
    { year: '2025', students: 8 },
    { year: '2026', students: 28 },
    { year: '2027', students: 48 },
    { year: '2029', students: 40 },
  ];

  // Company Signup Timeline
  const companySignups = [
    { date: 'Jan 6', signups: 39, percentage: '97.5%' },
    { date: 'Jan 7', signups: 1, percentage: '2.5%' },
  ];

  // Company Profile Completion
  const companyProfileCompletion = [
    { field: 'Industry', completed: 40, percentage: 100 },
    { field: 'Description', completed: 19, percentage: 47.5 },
    { field: 'Company Size', completed: 18, percentage: 45 },
    { field: 'Logo', completed: 17, percentage: 42.5 },
    { field: 'Website', completed: 17, percentage: 42.5 },
  ];

  // Industry Diversity
  const industryDiversity = [
    { name: 'Hotels', value: 20 },
    { name: 'Travel', value: 3 },
    { name: 'Resorts', value: 2 },
    { name: 'Hotels/Events', value: 2 },
    { name: 'Other', value: 13 },
  ];

  // Company Size Distribution
  const companySizeData = [
    { size: '1-10', count: 1 },
    { size: '11-50', count: 3 },
    { size: '51-200', count: 8 },
    { size: '201-500', count: 2 },
    { size: '501+', count: 4 },
    { size: 'N/A', count: 22 },
  ];

  // Booking Stats
  const bookingStats = [
    { metric: 'Total Bookings (confirmed)', value: 622 },
    { metric: 'Cancelled Bookings', value: 98 },
    { metric: 'Cancellation Rate', value: '13.6%' },
    { metric: 'Students with Bookings', value: 132 },
    { metric: 'Students without Bookings', value: 45 },
  ];

  // Bookings by Phase
  const bookingsByPhase = [
    { phase: 'Phase 1', bookings: 194, students: 80 },
    { phase: 'Phase 2', bookings: 428, students: 116 },
  ];

  // Slot Analytics
  const slotAnalytics = [
    { name: 'Slots Booked', value: 385 },
    { name: 'Available Slots', value: 335 },
  ];

  // Offer Types
  const offerTypes = [
    { name: 'Other', value: 39 },
    { name: 'Opérationnel', value: 31 },
    { name: 'Administratif', value: 6 },
  ];

  // Top Companies
  const topCompanies = [
    { company: 'The Oberoi, Marrakech', bookings: 36 },
    { company: 'Mandarin Oriental, Marrakech', bookings: 36 },
    { company: 'Amanjena', bookings: 36 },
    { company: 'Emirates', bookings: 34 },
    { company: 'The Ritz-Carlton Rabat', bookings: 34 },
    { company: 'La Mamounia', bookings: 33 },
    { company: 'Royal Mansour Marrakech', bookings: 32 },
    { company: 'Four Seasons Marrakech', bookings: 31 },
    { company: 'Fairmont Royal Palm Marrakech', bookings: 26 },
    { company: 'St Regis La Bahia Blanca', bookings: 25 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">INF Platform - Comprehensive Data Report</h1>
          <p className="text-gray-600">Event 2026 Analytics & KPIs</p>
        </div>

        {/* 1. User Overview */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-[#007e40] pb-2">1. User Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {userOverview.map((item) => (
              <div key={item.metric} className="bg-white rounded-xl shadow-md p-6 text-center">
                <p className="text-3xl font-bold text-[#007e40]">{item.value}</p>
                <p className="text-gray-600 mt-1">{item.metric}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Student Analytics */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-[#ffb300] pb-2">2. Student Analytics</h2>
          
          {/* Signup Timeline */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Signup Timeline</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={studentSignups}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="signups" fill="#007e40" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-gray-500 mt-2">Note: 88% of students signed up within the first 2 days.</p>
          </div>

          {/* Profile Completion */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Profile Completion Rates</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profileCompletion} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} unit="%" />
                  <YAxis type="category" dataKey="field" width={120} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar dataKey="percentage" fill="#ffb300" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Program & Graduation Distribution */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Program Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={programDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                      {programDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Graduation Year Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={graduationYears}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="students" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Company Analytics */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-[#f8231d] pb-2">3. Company Analytics</h2>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Company Signup */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Company Signup Timeline</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={companySignups}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="signups" fill="#f8231d" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">✓ 100% Verified Companies</p>
              </div>
            </div>

            {/* Industry Diversity */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Industry Diversity</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={industryDiversity} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                      {industryDiversity.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="text-sm text-gray-500 mt-2">17 unique industries represented</p>
            </div>
          </div>

          {/* Company Profile Completion */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Company Profile Completion</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={companyProfileCompletion} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} unit="%" />
                  <YAxis type="category" dataKey="field" width={100} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar dataKey="percentage" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Company Size */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Company Size Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={companySizeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="size" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* 4. Booking Analytics */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-[#007e40] pb-2">4. Booking Analytics</h2>
          
          {/* Booking Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {bookingStats.map((item) => (
              <div key={item.metric} className="bg-white rounded-xl shadow-md p-4 text-center">
                <p className="text-2xl font-bold text-[#007e40]">{item.value}</p>
                <p className="text-xs text-gray-600 mt-1">{item.metric}</p>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Bookings by Phase */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Bookings by Phase</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bookingsByPhase}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="phase" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="bookings" fill="#007e40" name="Bookings" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="students" fill="#ffb300" name="Unique Students" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Booking Averages */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Booking Averages</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Average bookings per student</span>
                  <span className="text-2xl font-bold text-[#007e40]">4.71</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Max bookings by a student</span>
                  <span className="text-2xl font-bold text-[#ffb300]">6</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Min bookings by a student</span>
                  <span className="text-2xl font-bold text-[#f8231d]">1</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Slot & Event Analytics */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-[#ffb300] pb-2">5. Slot & Event Analytics</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Slot Utilization</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={slotAnalytics} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {slotAnalytics.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#007e40' : '#e5e7eb'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center mt-4">
                <p className="text-3xl font-bold text-[#007e40]">53.5%</p>
                <p className="text-gray-600">Slot Utilization Rate</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Slot Statistics</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Total Slots Created</span>
                  <span className="text-2xl font-bold text-gray-900">720</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                  <span className="text-gray-600">Slots Booked</span>
                  <span className="text-2xl font-bold text-[#007e40]">385</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg">
                  <span className="text-gray-600">Available Slots</span>
                  <span className="text-2xl font-bold text-[#ffb300]">335</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Offer Analytics */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-[#f8231d] pb-2">6. Offer Analytics</h2>
          
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-md p-6 text-center">
              <p className="text-4xl font-bold text-[#007e40]">76</p>
              <p className="text-gray-600 mt-1">Total Offers</p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6 text-center">
              <p className="text-4xl font-bold text-[#ffb300]">1.9</p>
              <p className="text-gray-600 mt-1">Avg Offers per Company</p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6 text-center">
              <p className="text-4xl font-bold text-[#3b82f6]">9</p>
              <p className="text-gray-600 mt-1">Max Offers by Company</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Offer Types</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={offerTypes} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                      {offerTypes.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Offer Features</h3>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Paid Offers</span>
                    <span className="text-xl font-bold text-[#007e40]">75 (98.7%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div className="bg-[#007e40] h-2 rounded-full" style={{ width: '98.7%' }}></div>
                  </div>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Remote Possible</span>
                    <span className="text-xl font-bold text-[#f8231d]">0 (0%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div className="bg-[#f8231d] h-2 rounded-full" style={{ width: '0%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Top Performing Companies */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-[#007e40] pb-2">7. Top Performing Companies</h2>
          
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCompanies} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="company" width={200} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="bookings" fill="#007e40" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-gray-500 text-sm py-8 border-t">
          <p>INF Platform Report - Generated for Event 2026</p>
          <p className="mt-1">SHBM-UM6P Recruitment Platform</p>
        </footer>
      </div>
    </div>
  );
}
