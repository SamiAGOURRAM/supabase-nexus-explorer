import { useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Clock, Mail, CheckCircle2, Shield, ArrowLeft } from 'lucide-react';

export default function PendingApproval() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;
  const name = location.state?.name;

  useEffect(() => {
    if (!email) {
      navigate('/signup');
    }
  }, [email, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Back to home link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#007e40] transition-all mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        {/* Main card */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-xl shadow-gray-200/50 p-8 sm:p-10">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
                <Clock className="h-10 w-10 text-amber-600" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center border-2 border-white">
                <Shield className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 text-center mb-4">
            Account Pending Approval
          </h1>

          {/* Description */}
          <div className="text-center mb-8">
            <p className="text-lg text-gray-600 mb-2">
              Your account has been created successfully!
            </p>
            <p className="text-sm text-gray-500">
              We've received your registration and it's currently under review.
            </p>
          </div>

          {/* Info box */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-1">
                <Mail className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">What happens next?</h3>
                <div className="space-y-3 text-sm text-gray-700">
                  <p>
                    Our admin team will verify your information:
                  </p>
                  <ul className="space-y-2 ml-4">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <span><strong>Email verification:</strong> {email}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <span><strong>Name verification:</strong> {name}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <span><strong>Account validation:</strong> Details review</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="border-t border-gray-200 pt-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4 text-center">Approval Process</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-bold text-sm">1</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Account Created</p>
                  <p className="text-sm text-gray-600">Your registration has been submitted</p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-amber-600 font-bold text-sm">2</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Admin Review</p>
                  <p className="text-sm text-gray-600">Verification of your email and name</p>
                </div>
                <Clock className="h-5 w-5 text-amber-600" />
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-gray-400 font-bold text-sm">3</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-400">Account Activation</p>
                  <p className="text-sm text-gray-500">You'll receive an email notification</p>
                </div>
                <Clock className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Info cards */}
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900 text-sm mb-1">Email Notification</p>
                  <p className="text-xs text-gray-600">
                    You'll receive an email once your account is approved
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900 text-sm mb-1">Estimated Time</p>
                  <p className="text-xs text-gray-600">
                    Usually within 2-4 hours
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Important notice */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Important:</strong>
            </p>
            <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
              <li>Please ensure your email address is correct</li>
              <li>Check your spam folder for approval notification</li>
              <li>You cannot login until your account is approved</li>
              <li>Contact support if you don't receive approval within 6h hours</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
            >
              Go to Homepage
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#007e40] text-white rounded-lg font-medium hover:bg-[#006633] transition-all"
            >
              Contact Support
            </Link>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Need help? Email us at{' '}
          <a href="mailto:support@um6p.ma" className="text-[#007e40] hover:underline font-medium">
            support@um6p.ma
          </a>
        </p>
      </div>
    </div>
  );
}
