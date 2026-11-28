import { ColorScheme } from '@ghostfolio/common/types';
import { DataSource } from '@ghostfolio/prisma/enums';

export interface BenchmarkDetailDialogParams {
  colorScheme?: ColorScheme;
  dataSource: DataSource;
  deviceType: string;
  hasPermissionToAccessAdminControl: boolean;
  locale: string;
  symbol: string;
}

export interface BenchmarkDetailDialogResult {
  isNavigating?: boolean;
}
