import { InfoResponse } from '@ghostfolio/common/interfaces';
import { filterGlobalPermissions } from '@ghostfolio/common/permissions';
import { GfNotificationModule } from '@ghostfolio/ui/notifications';

import { Platform } from '@angular/cdk/platform';
import { registerLocaleData } from '@angular/common';
import {
  provideHttpClient,
  withInterceptorsFromDi
} from '@angular/common/http';
import localeCa from '@angular/common/locales/ca';
import localeDe from '@angular/common/locales/de';
import localeEs from '@angular/common/locales/es';
import localeFr from '@angular/common/locales/fr';
import localeIt from '@angular/common/locales/it';
import localeNl from '@angular/common/locales/nl';
import localePl from '@angular/common/locales/pl';
import localePt from '@angular/common/locales/pt';
import localeTr from '@angular/common/locales/tr';
import localeUk from '@angular/common/locales/uk';
import localeZh from '@angular/common/locales/zh';
import { enableProdMode, importProvidersFrom } from '@angular/core';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  MatNativeDateModule
} from '@angular/material/core';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { RouterModule, TitleStrategy } from '@angular/router';
import { ServiceWorkerModule } from '@angular/service-worker';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideMarkdown } from 'ngx-markdown';
import { provideNgxSkeletonLoader } from 'ngx-skeleton-loader';
import { NgxStripeModule, STRIPE_PUBLISHABLE_KEY } from 'ngx-stripe';

import { CustomDateAdapter } from './app/adapter/custom-date-adapter';
import { DateFormats } from './app/adapter/date-formats';
import { GfAppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authInterceptorProviders } from './app/core/auth.interceptor';
import { httpResponseInterceptorProviders } from './app/core/http-response.interceptor';
import { LanguageService } from './app/core/language.service';
import { ModulePreloadService } from './app/core/module-preload.service';
import { PageTitleStrategy } from './app/services/page-title.strategy';
import { environment } from './environments/environment';

(async () => {
  const response = await fetch('/api/v1/info');
  const info: InfoResponse = await response.json();
  const utmSource = window.localStorage.getItem('utm_source') as
    | 'ios'
    | 'trusted-web-activity';

  info.globalPermissions = filterGlobalPermissions(
    info.globalPermissions,
    utmSource
  );

  (window as any).info = info;

  environment.stripePublicKey = info.stripePublicKey;

  if (environment.production) {
    enableProdMode();
  }

  registerLocaleData(localeCa);
  registerLocaleData(localeDe);
  registerLocaleData(localeEs);
  registerLocaleData(localeFr);
  registerLocaleData(localeIt);
  registerLocaleData(localeNl);
  registerLocaleData(localePl);
  registerLocaleData(localePt);
  registerLocaleData(localeTr);
  registerLocaleData(localeUk);
  registerLocaleData(localeZh);

  await bootstrapApplication(GfAppComponent, {
    providers: [
      authInterceptorProviders,
      httpResponseInterceptorProviders,
      importProvidersFrom(
        GfNotificationModule,
        MatNativeDateModule,
        MatSnackBarModule,
        MatTooltipModule,
        NgxStripeModule.forRoot(environment.stripePublicKey),
        RouterModule.forRoot(routes, {
          anchorScrolling: 'enabled',
          preloadingStrategy: ModulePreloadService,
          scrollPositionRestoration: 'top'
        }),
        ServiceWorkerModule.register('ngsw-worker.js', {
          enabled: environment.production,
          registrationStrategy: 'registerImmediately'
        })
      ),
      LanguageService,
      ModulePreloadService,
      provideAnimations(),
      provideHttpClient(withInterceptorsFromDi()),
      provideIonicAngular(),
      provideMarkdown(),
      provideNgxSkeletonLoader(),
      {
        deps: [LanguageService, MAT_DATE_LOCALE, Platform],
        provide: DateAdapter,
        useClass: CustomDateAdapter
      },
      {
        provide: MAT_DATE_FORMATS,
        useValue: DateFormats
      },
      {
        provide: STRIPE_PUBLISHABLE_KEY,
        useFactory: () => environment.stripePublicKey
      },
      {
        provide: TitleStrategy,
        useClass: PageTitleStrategy
      }
    ]
  });
})();
