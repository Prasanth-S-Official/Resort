import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { apiUrl } from 'src/apiconfig';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<string | null>;
  public currentUser: Observable<string | null>;
  public apiUrl = apiUrl; // Replace with your Spring Boot backend URL
  private userRoleSubject = new BehaviorSubject<string>('');
  userRole$: Observable<string> = this.userRoleSubject.asObservable();
  private isAuthenticatedSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(this.isAuthenticated());
  isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient) {
    this.currentUserSubject = new BehaviorSubject<string | null>(
      localStorage.getItem('currentUser')
    );
    this.currentUser = this.currentUserSubject.asObservable();
  }

  register(username: string, password: string, userRole: string, email: string, mobileNumber: string): Observable<any> {
    const body = { username, password, userRole, email, mobileNumber };
    console.log(body);

    return this.http.post<any>(`${this.apiUrl}/api/register`, body).pipe(
      tap((user) => this.storeUserData(user)),
      catchError(this.handleError<any>('register'))
    );
  }

  login(email: string, password: string): Observable<any> {
    const loginData = { email, password };
    console.log(loginData);
    return this.http.post<any>(`${this.apiUrl}/api/login`, loginData)
      .pipe(
        tap(response => {
          console.log(response.token);

          // Store the token in localStorage or a more secure storage method
          localStorage.setItem('token', response.token);
          this.userRoleSubject.next(response.role);
          this.isAuthenticatedSubject.next(true);
        })
      );
  }

  logout(): void {
    // Remove the token from storage upon logout
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  isAuthenticated(): boolean {
    // Check if the user is authenticated by verifying the token
    const token = localStorage.getItem('token');
    console.log(token);

    return !!token; // Return true if the token exists
  }

  isAdmin(): boolean {
    const token = localStorage.getItem('token');
    if (token) {
      const decodedToken = this.decodeToken(token);
      console.log("decodedToken", decodedToken);
      return decodedToken['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] === 'ADMIN';
    }
    return false;
  }

  isCustomer(): boolean {
    const token = localStorage.getItem('token');
    if (token) {
      const decodedToken = this.decodeToken(token);
      return decodedToken['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] === 'CUSTOMER';
    }
    return false;
  }

  getCustomerName(): string {
    const token = localStorage.getItem('token');
    if (token) {
      const decodedToken = this.decodeToken(token);
      return decodedToken['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'];
    }
    return '';
  }

  private storeUserData(user: any): void {
    localStorage.setItem('token', user.token);
    localStorage.setItem('userRole', user.role);
  }

  private decodeToken(token: string): any {
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      console.log(decoded);
      return decoded;
    } catch (error) {
      return null;
    }
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(error);
      return of(result as T);
    };
  }
}
