import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PortfolioPageComponent } from './portfolio-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./analysis/analysis-page.module').then(
            (m) => m.AnalysisPageModule
          )
      },
      {
        path: 'activities',
        loadChildren: () =>
          import('./activities/activities-page.module').then(
            (m) => m.ActivitiesPageModule
          )
      },
      {
        path: 'allocations',
        loadChildren: () =>
          import('./allocations/allocations-page.module').then(
            (m) => m.AllocationsPageModule
          )
      },
      {
        path: 'fire',
        loadChildren: () =>
          import('./fire/fire-page.module').then((m) => m.FirePageModule)
      },
      {
        path: 'x-ray',
        loadChildren: () =>
          import('./x-ray/x-ray-page.module').then((m) => m.XRayPageModule)
      }
    ],
    component: PortfolioPageComponent,
    path: '',
    title: $localize`Portfolio`
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PortfolioPageRoutingModule {}
