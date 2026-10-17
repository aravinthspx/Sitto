// Details shown in the Privacy Policy and Cookie Policy.
//
// ⚠️ Before launch, the college must replace every value in [square brackets]
// and have its legal / data-protection office review both policies.

export const LEGAL = {
  productName: 'SITTO',
  // The organisation that decides why and how student data is processed
  // ("Data Fiduciary" under India's Digital Personal Data Protection Act, 2023).
  operator: 'SRM Institute of Science and Technology, Kattankulathur',
  operatorAddress: '[Postal address of the institution]',

  privacyEmail: '[privacy contact email, e.g. sitto-privacy@college.edu.in]',
  supportEmail: '[support contact email]',

  // Grievance Officer / Data Protection contact (DPDP Act, s. 8(10))
  grievanceOfficerName: '[Name of Grievance Officer]',
  grievanceOfficerEmail: '[Grievance Officer email]',
  grievanceResponseDays: 30,

  // Where Supabase stores the database (Supabase dashboard → Project Settings → General)
  hostingProvider: 'Supabase Inc. (database and authentication)',
  hostingRegion: '[Supabase project region, e.g. Mumbai, India (ap-south-1)]',

  // Retention periods — enforced automatically by the backend scheduler
  // (RETENTION_* settings in backend/.env). Keep both in sync.
  retentionBookingsMonths: 12,
  retentionNotificationsDays: 90,

  effectiveDate: '17 October 2026',
  policyVersion: '2026-10-17',
};
