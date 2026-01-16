import { Suspense, lazy } from "react";
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoadingScreen from "./components/shared/LoadingScreen";
import ProtectedRoute from "./components/shared/ProtectedRoute";
import ErrorBoundary from "./components/shared/ErrorBoundary";
import ScrollToTop from "./components/shared/ScrollToTop";
import ToastContainer from "./components/shared/ToastContainer";
import { ToastProvider, useToast } from "./contexts/ToastContext";
import { UserProvider } from "./contexts/UserContext";
import VerifyEmail from '@/pages/VerifyEmail';

// Get reCAPTCHA site key from environment
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "";
const RECAPTCHA_ENABLED = !!RECAPTCHA_SITE_KEY;

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Lazy load pages for better performance
const LandingPage = lazy(() => import("./pages/landingPage"));
const About = lazy(() => import("./pages/About"));
const AboutheINF = lazy(() => import("./pages/AboutheINF"));
const Contact = lazy(() => import("./pages/Contact"));
const SetPassword = lazy(() => import("./pages/auth/SetPassword"));
const AuthCallback = lazy(() => import("./pages/auth/Callback"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const PendingApproval = lazy(() => import("./pages/PendingApproval"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Offers = lazy(() => import("./pages/Offers"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Report2026 = lazy(() => import("./pages/Report2026"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminEvents = lazy(() => import("./pages/admin/Events"));
const AdminCompanies = lazy(() => import("./pages/admin/Companies"));
const AdminStudents = lazy(() => import("./pages/admin/Students"));
const AdminOffers = lazy(() => import("./pages/admin/Offers"));
const AdminCreateOffer = lazy(() => import("./pages/admin/offers/CreateOffer"));
const AdminEditOffer = lazy(() => import("./pages/admin/offers/EditOffer"));
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
const StudentCompanies = lazy(() => import("./pages/student/Companies"));
const StudentCompanyProfile = lazy(() => import("./pages/student/CompanyProfile"));
const StudentBookings = lazy(() => import("./pages/student/Bookings"));
const StudentProfile = lazy(() => import("./pages/student/Profile"));
const CompanyDashboard = lazy(() => import("./pages/company/Dashboard"));
const CompanyOffers = lazy(() => import("./pages/company/Offers"));
const CompanyProfile = lazy(() => import("./pages/company/Profile"));
const CompanySlots = lazy(() => import("./pages/company/Slots"));
const CreateOffer = lazy(() => import("./pages/company/offers/CreateOffer"));
const EditOffer = lazy(() => import("./pages/company/offers/EditOffer"));
const CompanyStudents = lazy(() => import("./pages/company/Students"));
const StudentProfileView = lazy(
  () => import("./pages/company/students/StudentProfile")
);

function AppRoutes() {
  const { toasts, removeToast } = useToast();
  
  return (
    <BrowserRouter>
      <ScrollToTop />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/aboutheinf" element={<AboutheINF />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/pending-approval" element={<PendingApproval />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/report-2026" element={<Report2026 />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/events" element={<ProtectedRoute><AdminEvents /></ProtectedRoute>} />
          <Route path="/admin/events/:id/quick-invite" element={<ProtectedRoute><QuickInvite /></ProtectedRoute>} />
          <Route path="/admin/events/:id/participants" element={<ProtectedRoute><Participants /></ProtectedRoute>} />
          <Route path="/admin/events/:id/sessions" element={<ProtectedRoute><Sessions /></ProtectedRoute>} />
          <Route path="/admin/events/:id/phases" element={<ProtectedRoute><Phases /></ProtectedRoute>} />
          <Route path="/admin/events/:id/schedule" element={<ProtectedRoute><EventSchedule /></ProtectedRoute>} />
          <Route path="/admin/events/:id/slots" element={<ProtectedRoute><EventSlots /></ProtectedRoute>} />
          <Route path="/admin/events/:id/companies" element={<ProtectedRoute><EventCompanies /></ProtectedRoute>} />
          <Route path="/admin/events/:id/companies/:companyId" element={<ProtectedRoute><CompanyDetail /></ProtectedRoute>} />
          <Route path="/admin/events/:id/students" element={<ProtectedRoute><EventStudents /></ProtectedRoute>} />
          <Route path="/admin/companies" element={<ProtectedRoute><AdminCompanies /></ProtectedRoute>} />
          <Route path="/admin/students" element={<ProtectedRoute><AdminStudents /></ProtectedRoute>} />
          <Route path="/admin/offers" element={<ProtectedRoute><AdminOffers /></ProtectedRoute>} />
          <Route path="/admin/offers/new" element={<ProtectedRoute><AdminCreateOffer /></ProtectedRoute>} />
          <Route path="/admin/offers/:id/edit" element={<ProtectedRoute><AdminEditOffer /></ProtectedRoute>} />
          <Route path="/admin/bookings" element={<ProtectedRoute><AdminBookings /></ProtectedRoute>} />
          
          {/* Student Routes - Protected & Require Email Verification */}
          <Route path="/student" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/offers" element={<ProtectedRoute><StudentOffers /></ProtectedRoute>} />
          <Route path="/student/offers/:id" element={<ProtectedRoute><StudentOfferDetail /></ProtectedRoute>} />
          <Route path="/student/companies" element={<ProtectedRoute><StudentCompanies /></ProtectedRoute>} />
          <Route path="/student/companies/:companyId" element={<ProtectedRoute><StudentCompanyProfile /></ProtectedRoute>} />
          <Route path="/student/bookings" element={<ProtectedRoute><StudentBookings /></ProtectedRoute>} />
          <Route path="/student/profile" element={<ProtectedRoute><StudentProfile /></ProtectedRoute>} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          
          {/* Company Routes - Protected */}
          <Route path="/company" element={<ProtectedRoute><CompanyDashboard /></ProtectedRoute>} />
          <Route path="/company/offers" element={<ProtectedRoute><CompanyOffers /></ProtectedRoute>} />
          <Route path="/company/offers/new" element={<ProtectedRoute><CreateOffer /></ProtectedRoute>} />
          <Route path="/company/offers/:id/edit" element={<ProtectedRoute><EditOffer /></ProtectedRoute>} />
          <Route path="/company/students" element={<ProtectedRoute><CompanyStudents /></ProtectedRoute>} />
          <Route path="/company/students/:id" element={<ProtectedRoute><StudentProfileView /></ProtectedRoute>} />
          <Route path="/company/profile" element={<ProtectedRoute><CompanyProfile /></ProtectedRoute>} />
          <Route path="/company/slots" element={<ProtectedRoute><CompanySlots /></ProtectedRoute>} />
          <Route path="/auth/set-password" element={<SetPassword />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/offers" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
  );
}

function App() {
  // Wrap with ErrorBoundary, ToastProvider, and optionally with CAPTCHA provider
  const AppContent = (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </UserProvider>
    </QueryClientProvider>
  );

  const WrappedApp = RECAPTCHA_ENABLED ? (
    <GoogleReCaptchaProvider
      reCaptchaKey={RECAPTCHA_SITE_KEY}
      language="en"
      useRecaptchaNet={false}
      useEnterprise={false}
      scriptProps={{
        async: true,
        defer: true,
        appendTo: "head",
      }}
    >
      {AppContent}
    </GoogleReCaptchaProvider>
  ) : (
    AppContent
  );

  return <ErrorBoundary>{WrappedApp}</ErrorBoundary>;
}

export default App;
