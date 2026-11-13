import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { EcoBitesService } from './data/ecobites.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor(data: EcoBitesService) {
    document.body.classList.toggle('dark-mode', data.setting('dark_mode', 'false') === 'true');
  }
}
