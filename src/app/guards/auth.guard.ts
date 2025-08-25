import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    if (!this.authService.isLoggedIn()) {
      console.log('[AuthGuard] Not logged in. Redirecting to /login. attemptedUrl=', state.url);
      this.authService.redirectUrl = state.url;
      return this.router.createUrlTree(['/login']);
    }

    const requiredRoles = route.data['roles'] as Array<string>;
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = this.authService.hasRole(requiredRoles);
      if (!hasRole) {
        console.log('[AuthGuard] Role denied. requiredRoles=', requiredRoles, 'currentUser=', this.authService.getUser());
        return this.router.createUrlTree(['/']);
      }
    }

    console.log('[AuthGuard] Access granted. route=', route.routeConfig?.path, 'requiredRoles=', requiredRoles);
    return true;
  }
}
