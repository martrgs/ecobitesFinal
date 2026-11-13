import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EcoBitesService, EcoUser } from '../data/ecobites.service';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: '../templates/account.page.html',
})
export class AccountPage implements OnInit {
  user: EcoUser | null = null;
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  message = '';
  messageIsError = false;

  constructor(public router: Router, private data: EcoBitesService) {}

  ngOnInit(): void {
    this.user = this.data.currentUser();
    if (!this.user) void this.router.navigateByUrl('/');
  }

  changePassword(): void {
    this.message = '';
    this.messageIsError = true;
    if (this.newPassword.length < 6) {
      this.message = 'La nueva contraseña debe tener al menos 6 caracteres.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.message = 'La nueva contraseña y su confirmación no coinciden.';
      return;
    }
    if (!this.data.changePassword(this.currentPassword, this.newPassword)) {
      this.message = 'La contraseña actual no coincide.';
      return;
    }
    this.messageIsError = false;
    this.message = 'Tu contraseña se actualizó correctamente.';
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
  }
}
