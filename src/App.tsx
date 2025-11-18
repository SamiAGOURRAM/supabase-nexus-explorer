import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import LoadingScreen from "./components/shared/LoadingScreen";
import ProtectedRoute from "./components/shared/ProtectedRoute";
import ErrorBoundary from "./components/shared/ErrorBoundary";
import VerifyEmail from '@/pages/VerifyEmail';

// Get reCAPTCHA site key from environment
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';
const RECAPTCHA_ENABLED = !!RECAPTCHA_SITE_KEY;

// Lazy load pages for better performance
const Home = lazy(() => import("./pages/Home"));
const SetPassword = lazy(() => import("./pages/auth/SetPassword"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Offers = lazy(() => import("./pages/Offers"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminEvents = lazy(() => import("./pages/admin/Events"));
const AdminCompanies = lazy(() => import("./pages/admin/Companies"));
const AdminStudents = lazy(() => import("./pages/admin/Students"));
const AdminOffers = lazy(() => import("./pages/admin/Offers"));
const AdminBookings = lazy(() => import("./pages/admin/Bookings"));
const QuickInvite = lazy(() => import("./pages/admin/events/QuickInvite"));
const Participants = lazy(() => import("./pages/admin/events/Participants"));
const Sessions = lazy(() => import("./pages/admin/events/Sessions"));
const Phases = lazy(() => import("./pages/admin/events/Phases"));
const EventSchedule = lazy(() => import("./pages/admin/events/Schedule"));
const EventSlots = lazy(() => import("./pages/admin/events/Slots"));
const EventCompanies = lazy(() => import("./pages/admin/events/Companies"));
const CompanyDetail = lazy(() => import("./pages/admin/events/CompanyDetail"));
const EventStudents = lazy(() => import("./pages/admin/events/Students"));
const StudentDashboard = lazy(() => import("./pages/student/Dashboard"));
const StudentOffers = lazy(() => import("./pages/student/Offers"));
const StudentOfferDetail = lazy(() => import("./pages/student/OfferDetail"));
const StudentCompanyProfile = lazy(() => import("./pages/student/CompanyProfile"));
const StudentBookings = lazy(() => import("./pages/student/Bookings"));
const StudentProfile = lazy(() => import("./pages/student/Profile"));
const CompanyDashboard = lazy(() => import("./pages/company/Dashboard"));
const CompanyOffers = lazy(() => import("./pages/company/Offers"));
const CompanyEvents = lazy(() => import("./pages/company/Events"));
const CompanySchedule = lazy(() => import("./pages/company/Schedule"));
const CompanyProfile = lazy(() => import("./pages/company/Profile"));
const CompanySlots = lazy(() => import("./pages/company/Slots"));
const CreateOffer = lazy(() => import("./pages/company/offers/CreateOffer"));
const EditOffer = lazy(() => import("./pages/company/offers/EditOffer"));
const CompanyStudents = lazy(() => import("./pages/company/Students"));
const StudentProfileView = lazy(() => import("./pages/company/students/StudentProfile"));

function App() {
  // Wrap application with CAPTCHA provider if enabled
  const AppContent = (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/offers" element={<Offers />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/events" element={<AdminEvents />} />
          <Route path="/admin/events/:id/quick-invite" element={<QuickInvite />} />
          <Route path="/admin/events/:id/participants" element={<Participants />} />
          <Route path="/admin/events/:id/sessions" element={<Sessions />} />
          <Route path="/admin/events/:id/phases" element={<Phases />} />
          <Route path="/admin/events/:id/schedule" element={<EventSchedule />} />
          <Route path="/admin/events/:id/slots" element={<EventSlots />} />
          <Route path="/admin/events/:id/companies" element={<EventCompanies />} />
          <Route path="/admin/events/:id/companies/:companyId" element={<CompanyDetail />} />
          <Route path="/admin/events/:id/students" element={<EventStudents />} />
          <Route path="/admin/companies" element={<AdminCompanies />} />
          <Route path="/admin/students" element={<AdminStudents />} />
          <Route path="/admin/offers" element={<AdminOffers />} />
          <Route path="/admin/bookings" element={<AdminBookings />} />
          
          {/* Student Routes - Protected & Require Email Verification */}
          <Route path="/student" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/offers" element={<ProtectedRoute><StudentOffers /></ProtectedRoute>} />
          <Route path="/student/offers/:id" element={<ProtectedRoute><StudentOfferDetail /></ProtectedRoute>} />
          <Route path="/student/companies/:companyId" element={<ProtectedRoute><StudentCompanyProfile /></ProtectedRoute>} />
          <Route path="/student/bookings" element={<ProtectedRoute><StudentBookings /></ProtectedRoute>} />
          <Route path="/student/profile" element={<ProtectedRoute><StudentProfile /></ProtectedRoute>} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          
          {/* Company Routes */}
          <Route path="/company" element={<CompanyDashboard />} />
          <Route path="/company/offers" element={<CompanyOffers />} />
          <Route path="/company/offers/new" element={<CreateOffer />} />
          <Route path="/company/offers/:id/edit" element={<EditOffer />} />
          <Route path="/company/students" element={<CompanyStudents />} />
          <Route path="/company/students/:id" element={<StudentProfileView />} />
          <Route path="/company/events" element={<CompanyEvents />} />
          <Route path="/company/schedule" element={<CompanySchedule />} />
          <Route path="/company/profile" element={<CompanyProfile />} />
          <Route path="/company/slots" element={<CompanySlots />} />
          <Route path="/auth/set-password" element={<SetPassword />} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/offers" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );

  // Wrap with ErrorBoundary and optionally with CAPTCHA provider
  const WrappedApp = RECAPTCHA_ENABLED ? (
    <GoogleReCaptchaProvider
      reCaptchaKey={RECAPTCHA_SITE_KEY}
      language="en"
      useRecaptchaNet={false}
      useEnterprise={false}
      scriptProps={{
        async: true,
        defer: true,
        appendTo: 'head',
      }}
    >
      {AppContent}
    </GoogleReCaptchaProvider>
  ) : AppContent;

  return (
    <ErrorBoundary>
      {WrappedApp}
    </ErrorBoundary>
  );
}

export default App;