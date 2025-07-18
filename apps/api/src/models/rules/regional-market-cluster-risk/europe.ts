import { Rule } from '@ghostfolio/api/models/rule';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { UserSettings } from '@ghostfolio/common/interfaces';

import { Settings } from './interfaces/rule-settings.interface';

export class RegionalMarketClusterRiskEurope extends Rule<Settings> {
  private currentValueInBaseCurrency: number;
  private europeValueInBaseCurrency: number;

  public constructor(
    protected exchangeRateDataService: ExchangeRateDataService,
    currentValueInBaseCurrency: number,
    europeValueInBaseCurrency: number
  ) {
    super(exchangeRateDataService, {
      key: RegionalMarketClusterRiskEurope.name
    });

    this.currentValueInBaseCurrency = currentValueInBaseCurrency;
    this.europeValueInBaseCurrency = europeValueInBaseCurrency;
  }

  public evaluate(ruleSettings: Settings) {
    const europeMarketValueRatio = this.currentValueInBaseCurrency
      ? this.europeValueInBaseCurrency / this.currentValueInBaseCurrency
      : 0;

    if (europeMarketValueRatio > ruleSettings.thresholdMax) {
      return {
        evaluation: `The Europe market contribution of your current investment (${(europeMarketValueRatio * 100).toPrecision(3)}%) exceeds ${(
          ruleSettings.thresholdMax * 100
        ).toPrecision(3)}%`,
        value: false
      };
    } else if (europeMarketValueRatio < ruleSettings.thresholdMin) {
      return {
        evaluation: `The Europe market contribution of your current investment (${(europeMarketValueRatio * 100).toPrecision(3)}%) is below ${(
          ruleSettings.thresholdMin * 100
        ).toPrecision(3)}%`,
        value: false
      };
    }

    return {
      evaluation: `The Europe market contribution of your current investment (${(europeMarketValueRatio * 100).toPrecision(3)}%) is within the range of ${(
        ruleSettings.thresholdMin * 100
      ).toPrecision(
        3
      )}% and ${(ruleSettings.thresholdMax * 100).toPrecision(3)}%`,
      value: true
    };
  }

  public getCategoryName() {
    return 'Regional Market Cluster Risk'; // TODO: Replace hardcoded text with i18n translation
  }

  public getConfiguration() {
    return {
      threshold: {
        max: 1,
        min: 0,
        step: 0.01,
        unit: '%'
      },
      thresholdMax: true,
      thresholdMin: true
    };
  }

  public getName() {
    return 'Europe';
  }

  public getSettings({ baseCurrency, xRayRules }: UserSettings): Settings {
    return {
      baseCurrency,
      isActive: xRayRules?.[this.getKey()]?.isActive ?? true,
      thresholdMax: xRayRules?.[this.getKey()]?.thresholdMax ?? 0.15,
      thresholdMin: xRayRules?.[this.getKey()]?.thresholdMin ?? 0.11
    };
  }
}
