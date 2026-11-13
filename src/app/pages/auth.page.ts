import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EcoBitesService } from '../data/ecobites.service';
import { ApiService } from '../service/api.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: '../templates/auth.page.html',
})
export class AuthPage {
  name = '';
  email = '';
  password = '';
  confirm = '';
  error = '';
  registering = false;
  googleLoading = false;

  constructor(
    public router: Router,
    route: ActivatedRoute,
    private data: EcoBitesService,
    private api: ApiService,
  ) {
    this.registering = route.snapshot.queryParamMap.get('mode') === 'register';
  }

  submit(): void {
    this.error = '';
    if (!this.email.includes('@') || this.password.length < 6) {
      this.error = 'Ingresa un correo válido y una contraseña de al menos 6 caracteres.';
      return;
    }
    if (this.registering && this.password !== this.confirm) {
      this.error = 'Las contraseñas no coinciden.';
      return;
    }
    const users = JSON.parse(localStorage.getItem('ecobites.accounts') || '[]') as Array<{ name: string; email: string; password: string }>;
    if (this.registering) {
      if (users.some((user) => user.email.toLowerCase() === this.email.toLowerCase())) {
        this.error = 'Ya existe una cuenta con este correo.';
        return;
      }
      users.push({ name: this.name.trim(), email: this.email.trim(), password: this.password });
      localStorage.setItem('ecobites.accounts', JSON.stringify(users));
      this.data.signIn(this.name.trim(), this.email.trim());
    } else {
      const user = users.find((account) => account.email.toLowerCase() === this.email.toLowerCase() && account.password === this.password);
      if (!user) {
        this.error = 'Correo o contraseña incorrectos. Si es tu primera vez, crea una cuenta.';
        return;
      }
      this.data.signIn(user.name, user.email);
    }
    void this.router.navigateByUrl('/home');
  }

  toggle(): void {
    this.registering = !this.registering;
    this.error = '';
  }

  async googleSignIn(): Promise<void> {
    this.error = '';
    this.googleLoading = true;
    try {
      const account = await this.api.signInWithGoogle();
      this.data.signIn(account.name, account.email, 'google');
      await this.router.navigateByUrl('/home');
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      this.error = message.toLowerCase().includes('cancel')
        ? 'Se canceló el inicio de sesión con Google.'
        : message || 'No se pudo iniciar sesión con Google. Revisa la configuración OAuth y vuelve a intentarlo.';
    } finally {
      this.googleLoading = false;
    }
  }
}
