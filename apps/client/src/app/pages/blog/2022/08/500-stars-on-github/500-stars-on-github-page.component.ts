import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [MatButtonModule, RouterModule],
  selector: 'gf-500-stars-on-github-page',
  templateUrl: './500-stars-on-github-page.html'
})
export class FiveHundredStarsOnGitHubPageComponent {
  public routerLinkBlog = publicRoutes.blog.routerLink;
  public routerLinkMarkets = publicRoutes.markets.routerLink;
  public routerLinkPricing = publicRoutes.pricing.routerLink;
}
