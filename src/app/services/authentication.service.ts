import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { User } from '../models/users';
@Injectable({
  providedIn: 'root',
})
export class AuthenticationService {
  userSubject: BehaviorSubject<User | null>;
  user: Observable<User | null>;
  refreshTokenTimeout: any;

  constructor(private router: Router, private httpClient: HttpClient) {
    this.userSubject = new BehaviorSubject<User | null>(null);
    this.user = this.userSubject.asObservable();
  }

  // get value
  public get userValue(): User | null {
    return this.userSubject.value;
  }

  login(username: string, password: string) {
    return this.httpClient
      .post<any>(
        `${environment.apiUrl}/users/authenticate`,
        { username, password },
        /**
         * Với giá trị withCredentials bằng true, cookie sẽ được tự động thêm vào cũng như thiết lập
         * nếu có phản hồi từ máy chủ. Lưu ý rằng, cookie trong trường hợp này là third-party cookie
         * và việc lưu trữ, truy cập cookie vẫn hoàn toàn thuân theo same-origin policy, do đó,
         * chúng ta không thể truy cập cookie bằng document.cookie được.
         * Nó hoàn toàn được xử lý tự động bởi trình duyệt.
         */
        { withCredentials: true }
      )
      .pipe(
        map((user) => {
          this.userSubject.next(user);
          this.startRefreshTokenTimer();
          return user;
        })
      );
  }

  refreshToken() {
    return this.httpClient
      .post<any>(
        `${environment.apiUrl}/users/refresh-token`,
        {},
        { withCredentials: true }
      )
      .pipe(
        map((user) => {
          this.userSubject.next(user);
          this.startRefreshTokenTimer();
          return user;
        })
      );
  }

  startRefreshTokenTimer() {
    // parse json object from base64 encoded jwt token
    if (this.userValue != null) {
      const jwtToken = JSON.parse(atob(this.userValue.jwtToken.split('.')[1]));

      // set a timeout to refresh the token a minute before it expires
      const expires = new Date(jwtToken.exp * 1000);
      const timeout = expires.getTime() - Date.now() - 60 * 1000;
      this.refreshTokenTimeout = setTimeout(
        () => this.refreshToken().subscribe(),
        timeout
      );
    }
  }

  private stopRefreshTokenTimer() {
    clearTimeout(this.refreshTokenTimeout);
  }

  logout() {
    this.httpClient
      .post<any>(
        `${environment.apiUrl}/users/revoke-token`,
        {},
        { withCredentials: true }
      )
      .subscribe();
    this.stopRefreshTokenTimer();
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }
}
