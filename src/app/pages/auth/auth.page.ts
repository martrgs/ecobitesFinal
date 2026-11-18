import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { EcoBitesService } from '../../data/ecobites.service';
import { FIELD_PATTERNS, FIELD_REGEX, utf8Length } from '../../service/field-validation';
import { FirebaseService } from '../../service/firebase.service';
import { TranslatePipe } from '../../service/translate.pipe';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './auth.page.html',
})
export class AuthPage {
  router = inject(Router);
  private data = inject(EcoBitesService);
  private firebase = inject(FirebaseService);

  name = '';
  email = '';
  password = '';
  confirm = '';
  error = '';
  registering = false;
  readonly patterns = FIELD_PATTERNS;
  submitting = false;

  constructor() {
    const route = inject(ActivatedRoute);

    this.registering = route.snapshot.queryParamMap.get('mode') === 'register';
  }

  async submit(): Promise<void> {
    this.error = '';
    const email = this.email.trim();
    if (email.length > 254 || !FIELD_REGEX.email.test(email)) {
      this.error = 'Escribe un correo válido (por ejemplo, nombre@dominio.com).';
      return;
    }
    if (
      this.registering &&
      (this.name.trim().length < 2 || this.name.trim().length > 60 || !FIELD_REGEX.personName.test(this.name.trim()))
    ) {
      this.error = 'El nombre debe tener entre 2 y 60 letras. Puedes usar espacios, apóstrofes o guiones.';
      return;
    }
    if (!FIELD_REGEX.password.test(this.password) || utf8Length(this.password) > 72) {
      this.error = 'La contraseña debe tener de 8 a 72 caracteres e incluir al menos una letra y un número.';
      return;
    }
    if (this.registering && this.password !== this.confirm) {
      this.error = 'Las contraseñas no coinciden.';
      return;
    }
    this.submitting = true;
    try {
      const session = this.registering
        ? await this.firebase.register(this.name.trim(), email, this.password)
        : await this.firebase.login(email, this.password);
      await this.data.activateSession(session.user);
      await this.router.navigateByUrl('/home');
    } catch (error) {
      this.error = this.authError(error);
    } finally {
      this.submitting = false;
    }
  }

  private authError(error: unknown): string {
    const code = (error as { code?: string })?.code || '';
    const messages: Record<string, string> = {
      'auth/email-already-in-use': 'Ya existe una cuenta con este correo.',
      'auth/invalid-credential': 'Correo o contraseña incorrectos.',
      'auth/invalid-email': 'Escribe un correo válido.',
      'auth/weak-password': 'Firebase requiere una contraseña de al menos 6 caracteres.',
      'auth/network-request-failed': 'No se pudo conectar con Firebase. Revisa tu conexión.',
      'auth/too-many-requests': 'Hubo muchos intentos. Espera un momento y vuelve a intentarlo.',
    };
    return (
      messages[code] || (error instanceof Error ? error.message : '') || 'No se pudo completar el acceso con Firebase.'
    );
  }

  toggle(): void {
    this.registering = !this.registering;
    this.error = '';
  }
}
