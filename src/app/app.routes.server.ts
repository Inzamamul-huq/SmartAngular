import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Static routes
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'login', renderMode: RenderMode.Prerender },
  { path: 'forgot-password', renderMode: RenderMode.Prerender },
  { path: 'verify-otp', renderMode: RenderMode.Prerender },
  { path: 'reset-password', renderMode: RenderMode.Prerender },
  { path: 'admindashboard', renderMode: RenderMode.Prerender },
  { path: 'admin/profile', renderMode: RenderMode.Prerender },
  { path: 'joblist', renderMode: RenderMode.Prerender },
  { path: 'studentdashboard', renderMode: RenderMode.Prerender },
  
  // Dynamic routes with parameters
  {
    path: 'admin/edit-job/:id',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => {
      // In a real app, you would fetch the list of job IDs from your API
      // For now, we'll return a single example ID
      return [{ id: '1' }];
    }
  },
  {
    path: 'student-test/:scheduleId',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => {
      // Return example schedule IDs
      return [{ scheduleId: '1' }];
    }
  },
  {
    path: 'job/:id/test-results',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => {
      // Return example job IDs
      return [{ id: '1' }];
    }
  },
  
  // Catch-all route for other paths (will use SSR)
  {
    path: '**',
    renderMode: RenderMode.Server
  }
];
