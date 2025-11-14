import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import LoadingScreen from "./components/shared/LoadingScreen";

// Lazy load pages for better performance
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Offers = lazy(() => import("./pages/Offers"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminEvents = lazy(() => import("./pages/admin/Events"));
const AdminCompanies = lazy(() => import("./pages/admin/Companies"));
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
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/offers" replace />} />
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
          
          {/* Student Routes */}
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/offers" element={<StudentOffers />} />
          <Route path="/student/offers/:id" element={<StudentOfferDetail />} />
          <Route path="/student/companies/:companyId" element={<StudentCompanyProfile />} />
          <Route path="/student/bookings" element={<StudentBookings />} />
          <Route path="/student/profile" element={<StudentProfile />} />
          
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
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/offers" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;