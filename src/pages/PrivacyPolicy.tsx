import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, FileText, Users, Lock, Trash2, Eye } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-card rounded-xl border border-border p-8 space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              This Privacy Policy explains how the INF Platform 2.0 (inf Explorer) collects, uses, 
              and protects your personal data in compliance with GDPR (General Data Protection Regulation) 
              and Moroccan data protection laws. We are committed to protecting your privacy and ensuring 
              transparency about our data practices.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong>Last Updated:</strong> January 2025
            </p>
          </section>

          {/* Purpose of Data Collection */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Purpose of Data Collection</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              We collect and process your personal data for the following legitimate purposes:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li><strong>Connecting students with companies for internships:</strong> Matching students with relevant internship opportunities based on their profiles and preferences.</li>
              <li><strong>Managing registrations for the INF event:</strong> Organizing and managing the Internship & Networking Forum event, including booking interview slots and scheduling.</li>
              <li><strong>Facilitating communication:</strong> Enabling communication between UM6P departments, companies, and students for event coordination and internship matching.</li>
            </ul>
          </section>

          {/* Data Minimization */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Data We Collect</h2>
            </div>
            
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-foreground mb-3">For Students:</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li><strong>Required:</strong> Name, email address, major (specialization), CV/resume, internship preferences</li>
                <li><strong>Optional:</strong> Phone number, profile photo, biography, LinkedIn profile, languages spoken, program type, year of study</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-foreground mb-3">For Companies:</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li><strong>Required:</strong> Company name, contact person, job/internship offers</li>
                <li><strong>Optional:</strong> Company description, website, logo, industry, company size, address, contact information, company representatives</li>
              </ul>
            </div>

            <p className="text-muted-foreground mt-4 italic">
              We follow the principle of data minimization and only collect data that is necessary for 
              the stated purposes. Optional fields can be left blank.
            </p>
          </section>

          {/* Data Sharing */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Data Sharing</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              Your personal data is shared only with the following parties:
            </p>
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-foreground mb-2">Data is shared with:</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li><strong>UM6P Departments:</strong> SHBM (School of Hospitality Business and Management) and Career Center for event management and coordination</li>
                <li><strong>Participating Companies:</strong> Only verified companies that are participating in the INF event can view student profiles and CVs for internship matching purposes</li>
              </ul>
            </div>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <h3 className="font-semibold text-foreground mb-2">Data is NOT:</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Sold to third parties</li>
                <li>Used for commercial purposes outside the INF event</li>
                <li>Shared with external organizations</li>
                <li>Used for marketing without your explicit consent</li>
              </ul>
            </div>
          </section>

          {/* Consent */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Your Consent</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              By creating an account, you explicitly consent to the processing of your personal data 
              for the purposes stated in this Privacy Policy. You have the right to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li><strong>Withdraw your consent</strong> at any time by contacting us at inf@um6p.ma</li>
              <li><strong>Access your data</strong> by downloading it from your profile page</li>
              <li><strong>Correct your data</strong> by editing your profile at any time</li>
              <li><strong>Delete your account</strong> and all associated data through your profile settings</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              <strong>Note:</strong> Withdrawing consent may limit your ability to use the platform, 
              as data processing is necessary for the core functionality of the INF event.
            </p>
          </section>

          {/* User Rights */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Your Rights (GDPR)</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              Under GDPR, you have the following rights regarding your personal data:
            </p>
            <div className="space-y-4">
              <div className="border-l-4 border-primary pl-4">
                <h3 className="font-semibold text-foreground mb-1">Right to Access</h3>
                <p className="text-muted-foreground text-sm">
                  You can access and download all your personal data from your profile page.
                </p>
              </div>
              <div className="border-l-4 border-primary pl-4">
                <h3 className="font-semibold text-foreground mb-1">Right to Rectification</h3>
                <p className="text-muted-foreground text-sm">
                  You can correct or update your data at any time through your profile settings.
                </p>
              </div>
              <div className="border-l-4 border-primary pl-4">
                <h3 className="font-semibold text-foreground mb-1">Right to Erasure (Right to be Forgotten)</h3>
                <p className="text-muted-foreground text-sm">
                  You can delete your account and all associated data at any time. This action is irreversible.
                </p>
              </div>
              <div className="border-l-4 border-primary pl-4">
                <h3 className="font-semibold text-foreground mb-1">Right to Withdraw Consent</h3>
                <p className="text-muted-foreground text-sm">
                  You can withdraw your consent at any time by contacting inf@um6p.ma or through your profile settings.
                </p>
              </div>
              <div className="border-l-4 border-primary pl-4">
                <h3 className="font-semibold text-foreground mb-1">Right to Data Portability</h3>
                <p className="text-muted-foreground text-sm">
                  You can export your data in a machine-readable format (CSV) from your profile page.
                </p>
              </div>
            </div>
            <p className="text-muted-foreground mt-4">
              To exercise any of these rights, please contact us at <strong>inf@um6p.ma</strong> or 
              use the features available in your profile settings.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Trash2 className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Data Retention</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              We retain your personal data only for as long as necessary to fulfill the purposes stated 
              in this Privacy Policy:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li><strong>Student Profiles:</strong> 12 months after your last activity or account creation, whichever is later</li>
              <li><strong>Company Profiles:</strong> Until the partnership ends or 24 months of inactivity, whichever comes first</li>
              <li><strong>CVs/Resumes:</strong> Automatically deleted 12 months after upload or account deletion</li>
              <li><strong>Bookings and Event Data:</strong> 12 months after the event ends</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              After the retention period expires, your data will be automatically deleted in compliance 
              with GDPR requirements. You will receive a notification before deletion.
            </p>
          </section>

          {/* Security */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Data Security</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              We implement appropriate technical and organizational measures to protect your personal data:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li><strong>Strong Passwords:</strong> Minimum 12 characters with complexity requirements</li>
              <li><strong>HTTPS Encryption:</strong> All data transmission is encrypted using HTTPS</li>
              <li><strong>Encrypted Storage:</strong> CV/resume files are stored in encrypted storage with signed URLs</li>
              <li><strong>Role-Based Access:</strong> Access to data is restricted based on user roles (students, companies, admins)</li>
              <li><strong>Row Level Security:</strong> Database-level security policies ensure users can only access their own data</li>
              <li><strong>Logging and Monitoring:</strong> Security events and access attempts are logged and monitored</li>
            </ul>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">Contact Us</h2>
            <p className="text-muted-foreground mb-4">
              If you have any questions about this Privacy Policy or wish to exercise your rights, 
              please contact us:
            </p>
            <div className="bg-muted rounded-lg p-4">
              <p className="text-foreground">
                <strong>Email:</strong> <a href="mailto:inf@um6p.ma" className="text-primary hover:underline">inf@um6p.ma</a>
              </p>
              <p className="text-foreground mt-2">
                <strong>Organization:</strong> UM6P - School of Hospitality Business and Management (SHBM)
              </p>
            </div>
          </section>

          {/* CNDP Declaration */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">CNDP Declaration</h2>
            <p className="text-muted-foreground">
              This platform complies with Moroccan data protection laws and has been declared to the 
              Commission Nationale de contrôle de la protection des Données (CNDP). Our CNDP declaration 
              number will be provided upon request.
            </p>
          </section>

          {/* Footer */}
          <div className="pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground text-center">
              This Privacy Policy is effective as of January 2025 and may be updated from time to time. 
              We will notify you of any significant changes.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

