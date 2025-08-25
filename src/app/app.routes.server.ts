// Server routes configuration for Angular 17 SSR
export const serverRoutes = [
  // Static routes that should be pre-rendered
  { path: '' },
  { path: 'login' },
  { path: 'forgot-password' },
  { path: 'verify-otp' },
  { path: 'reset-password' },
  { path: 'admindashboard' },
  { path: 'admin/profile' },
  { path: 'joblist' },
  { path: 'studentdashboard' },
  
  // Dynamic routes with parameters
  { path: 'admin/edit-job/:id' },
  { path: 'student-test/:scheduleId' },
  { path: 'job/:id/test-results' },
  
  // Catch-all route for other paths (will use SSR)
  { path: '**' }
];
