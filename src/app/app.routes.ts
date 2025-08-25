import { Routes } from '@angular/router';
import { Adminlogin } from './adminlogin/adminlogin';
import { Admindashboard } from './admindashboard/admindashboard';
import { Joblist } from './joblist/joblist';
import { StudentDashboard } from './student-dashboard/student-dashboard';
import { JobDetail } from './job-detail/job-detail';
import { AdminProfile } from './admin-profile/admin-profile';
import { StudentProfile } from './student-profile/student-profile';
import { StudentTest } from './student-test/student-test';
import { Studentsignup } from './studentsignup/studentsignup';
import { Home } from './home/home';
import { AuthGuard } from './guards/auth.guard';
import { TestResults } from './test-results/test-results';
import { Experiences } from './experiences/experiences';
import { EditJobComponent } from './admin/edit-job/edit-job.component';
import { ManageQuestionsComponent } from './admin/manage-questions/manage-questions.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { VerifyOtpComponent } from './verify-otp/verify-otp.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';

export const routes: Routes = [
    { path: '', component: Home, pathMatch: 'full' },
    { path: 'login', component: Adminlogin },
    { path: 'adminlogin', redirectTo: 'login', pathMatch: 'full' },
    { path: 'forgot-password', component: ForgotPasswordComponent },
    { path: 'verify-otp', component: VerifyOtpComponent },
    { path: 'reset-password', component: ResetPasswordComponent },
    { 
      path: 'admindashboard', 
      component: Admindashboard,
      canActivate: [AuthGuard],
      data: { roles: ['admin'] } 
    },
    { 
      path: 'admin/profile',
      component: AdminProfile,
      canActivate: [AuthGuard],
      data: { roles: ['admin'] }
    },
    { 
      path: 'joblist', 
      component: Joblist,
      canActivate: [AuthGuard] 
    },
    { 
      path: 'studentdashboard', 
      component: StudentDashboard,
      canActivate: [AuthGuard],
      data: { roles: ['student'] }
    },
    { 
      path: 'student/profile',
      component: StudentProfile,
      canActivate: [AuthGuard],
      data: { roles: ['student'] }
    },
    { 
      path: 'admin/edit-job/:id',
      component: EditJobComponent,
      canActivate: [AuthGuard],
      data: { roles: ['admin'] }
    },
    { 
      path: 'admin/job/:id/questions',
      component: ManageQuestionsComponent,
      canActivate: [AuthGuard],
      data: { roles: ['admin'] }
    },
    { 
      path: 'student-test/:scheduleId',
      component: StudentTest,
      canActivate: [AuthGuard],
      data: { roles: ['student'] }
    },
    {
      path: 'test-results/:id',
      component: TestResults,
      canActivate: [AuthGuard],
      data: { roles: ['admin'] }
    },
    {
      path: 'job/:id/test-results',
      component: TestResults,
      canActivate: [AuthGuard],
      data: { roles: ['admin'] }
    },
    { 
      path: 'job/:id', 
      component: JobDetail,
      canActivate: [AuthGuard] 
    },
    {
      path: 'admin/experiences',
      component: Experiences,
      canActivate: [AuthGuard],
      data: { roles: ['admin'] }
    },
    { path: 'signup', component: Studentsignup },
    { path: 'login', component: Adminlogin },
    { path: '**', redirectTo: '' }
];