// Server routes configuration for Angular 17 SSR
export const serverRoutes = [
  
  { path: '' },
  { path: 'login' },
  { path: 'forgot-password' },
  { path: 'verify-otp' },
  { path: 'reset-password' },
  { path: 'admindashboard' },
  { path: 'admin/profile' },
  { path: 'joblist' },
  { path: 'studentdashboard' },
  
  
  { path: 'admin/edit-job/:id' },
  { path: 'student-test/:scheduleId' },
  { path: 'job/:id/test-results' },
  
  
  { path: '**' }
];
