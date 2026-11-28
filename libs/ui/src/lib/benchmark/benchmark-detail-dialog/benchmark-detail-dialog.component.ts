import { NUMERICAL_PRECISION_THRESHOLD_4_FIGURES } from '@ghostfolio/common/config';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import {
  AdminMarketDataDetails,
  LineChartItem
} from '@ghostfolio/common/interfaces';
import { internalRoutes } from '@ghostfolio/common/routes/routes';
import { GfDialogFooterComponent } from '@ghostfolio/ui/dialog-footer';
import { GfDialogHeaderComponent } from '@ghostfolio/ui/dialog-header';
import { DataService } from '@ghostfolio/ui/services';

import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  Inject,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { NavigationStart, Router, RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { format } from 'date-fns';
import { addIcons } from 'ionicons';
import { createOutline } from 'ionicons/icons';
import { filter } from 'rxjs/operators';

import { GfLineChartComponent } from '../../line-chart/line-chart.component';
import { GfValueComponent } from '../../value/value.component';
import {
  BenchmarkDetailDialogParams,
  BenchmarkDetailDialogResult
} from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'd-flex flex-column h-100' },
  imports: [
    GfDialogFooterComponent,
    GfDialogHeaderComponent,
    GfLineChartComponent,
    GfValueComponent,
    IonIcon,
    MatButtonModule,
    MatDialogModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-benchmark-detail-dialog',
  styleUrls: ['./benchmark-detail-dialog.component.scss'],
  templateUrl: 'benchmark-detail-dialog.html'
})
export class GfBenchmarkDetailDialogComponent implements OnInit {
  public assetProfile?: AdminMarketDataDetails['assetProfile'];
  public historicalDataItems: LineChartItem[];
  public isLoading = true;
  public precision = 2;

  public readonly routerLinkAdminControlMarketDataUpdate =
    internalRoutes.adminControl.subRoutes.marketData.subRoutes.update
      .routerLink;

  public value: number;

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: BenchmarkDetailDialogParams,
    private dataService: DataService,
    public dialogRef: MatDialogRef<
      GfBenchmarkDetailDialogComponent,
      BenchmarkDetailDialogResult
    >,
    private destroyRef: DestroyRef,
    private router: Router
  ) {
    this.router.events
      .pipe(
        filter((event) => {
          return event instanceof NavigationStart;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.dialogRef.close({ isNavigating: true });
      });

    addIcons({ createOutline });
  }

  public ngOnInit() {
    this.dataService
      .fetchAsset({
        dataSource: this.data.dataSource,
        symbol: this.data.symbol
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ assetProfile, marketData }) => {
        this.assetProfile = assetProfile;

        this.historicalDataItems = marketData.map(
          ({ date, marketPrice }, index) => {
            if (marketData.length - 1 === index) {
              this.value = marketPrice;
            }

            return {
              date: format(date, DATE_FORMAT),
              value: marketPrice
            };
          }
        );

        if (
          this.data.deviceType === 'mobile' &&
          this.value >= NUMERICAL_PRECISION_THRESHOLD_4_FIGURES
        ) {
          this.precision = 0;
        }

        this.isLoading = false;

        this.changeDetectorRef.markForCheck();
      });
  }

  public onClose() {
    this.dialogRef.close();
  }
}
