import { PlatformService } from '@ghostfolio/api/app/platform/platform.service';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { SubscriptionService } from '@ghostfolio/api/app/subscription/subscription.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import { BenchmarkService } from '@ghostfolio/api/services/benchmark/benchmark.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  DEFAULT_CURRENCY,
  HEADER_KEY_TOKEN,
  PROPERTY_BETTER_UPTIME_MONITOR_ID,
  PROPERTY_COUNTRIES_OF_SUBSCRIBERS,
  PROPERTY_DEMO_USER_ID,
  PROPERTY_IS_READ_ONLY_MODE,
  PROPERTY_SLACK_COMMUNITY_USERS,
  ghostfolioFearAndGreedIndexDataSourceStocks
} from '@ghostfolio/common/config';
import {
  DATE_FORMAT,
  encodeDataSource,
  extractNumberFromString
} from '@ghostfolio/common/helper';
import { InfoItem, Statistics } from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';

import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as cheerio from 'cheerio';
import { format, subDays } from 'date-fns';

@Injectable()
export class InfoService {
  private static CACHE_KEY_STATISTICS = 'STATISTICS';

  public constructor(
    private readonly benchmarkService: BenchmarkService,
    private readonly configurationService: ConfigurationService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly jwtService: JwtService,
    private readonly platformService: PlatformService,
    private readonly propertyService: PropertyService,
    private readonly redisCacheService: RedisCacheService,
    private readonly subscriptionService: SubscriptionService,
    private readonly userService: UserService
  ) {}

  public async get(): Promise<InfoItem> {
    const info: Partial<InfoItem> = {};
    let isReadOnlyMode: boolean;

    const globalPermissions: string[] = [];

    if (this.configurationService.get('ENABLE_FEATURE_FEAR_AND_GREED_INDEX')) {
      if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
        info.fearAndGreedDataSource = encodeDataSource(
          ghostfolioFearAndGreedIndexDataSourceStocks
        );
      } else {
        info.fearAndGreedDataSource =
          ghostfolioFearAndGreedIndexDataSourceStocks;
      }

      globalPermissions.push(permissions.enableFearAndGreedIndex);
    }

    if (this.configurationService.get('ENABLE_FEATURE_READ_ONLY_MODE')) {
      isReadOnlyMode = await this.propertyService.getByKey<boolean>(
        PROPERTY_IS_READ_ONLY_MODE
      );
    }

    if (this.configurationService.get('ENABLE_FEATURE_SOCIAL_LOGIN')) {
      globalPermissions.push(permissions.enableSocialLogin);
    }

    if (this.configurationService.get('ENABLE_FEATURE_STATISTICS')) {
      globalPermissions.push(permissions.enableStatistics);
    }

    if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
      globalPermissions.push(permissions.enableSubscription);

      info.countriesOfSubscribers =
        (await this.propertyService.getByKey<string[]>(
          PROPERTY_COUNTRIES_OF_SUBSCRIBERS
        )) ?? [];
      info.stripePublicKey = this.configurationService.get('STRIPE_PUBLIC_KEY');
    }

    if (this.configurationService.get('ENABLE_FEATURE_SYSTEM_MESSAGE')) {
      globalPermissions.push(permissions.enableSystemMessage);
    }

    const [
      benchmarks,
      demoAuthToken,
      isUserSignupEnabled,
      platforms,
      statistics,
      subscriptionOffer
    ] = await Promise.all([
      this.benchmarkService.getBenchmarkAssetProfiles(),
      this.getDemoAuthToken(),
      this.propertyService.isUserSignupEnabled(),
      this.platformService.getPlatforms({
        orderBy: { name: 'asc' }
      }),
      this.getStatistics(),
      this.subscriptionService.getSubscriptionOffer({ key: 'default' })
    ]);

    if (isUserSignupEnabled) {
      globalPermissions.push(permissions.createUserAccount);
    }

    return {
      ...info,
      benchmarks,
      demoAuthToken,
      globalPermissions,
      isReadOnlyMode,
      platforms,
      statistics,
      subscriptionOffer,
      baseCurrency: DEFAULT_CURRENCY,
      currencies: this.exchangeRateDataService.getCurrencies()
    };
  }

  private async countActiveUsers(aDays: number) {
    return this.userService.count({
      where: {
        AND: [
          {
            NOT: {
              analytics: null
            }
          },
          {
            analytics: {
              lastRequestAt: {
                gt: subDays(new Date(), aDays)
              }
            }
          }
        ]
      }
    });
  }

  private async countDockerHubPulls(): Promise<number> {
    try {
      const { pull_count } = (await fetch(
        'https://hub.docker.com/v2/repositories/ghostfolio/ghostfolio',
        {
          headers: { 'User-Agent': 'request' },
          signal: AbortSignal.timeout(
            this.configurationService.get('REQUEST_TIMEOUT')
          )
        }
      ).then((res) => res.json())) as { pull_count: number };

      return pull_count;
    } catch (error) {
      Logger.error(error, 'InfoService - DockerHub');

      return undefined;
    }
  }

  private async countGitHubContributors(): Promise<number> {
    try {
      const body = await fetch('https://github.com/ghostfolio/ghostfolio', {
        signal: AbortSignal.timeout(
          this.configurationService.get('REQUEST_TIMEOUT')
        )
      }).then((res) => res.text());

      const $ = cheerio.load(body);

      return extractNumberFromString({
        value: $(
          'a[href="/ghostfolio/ghostfolio/graphs/contributors"] .Counter'
        ).text()
      });
    } catch (error) {
      Logger.error(error, 'InfoService - GitHub');

      return undefined;
    }
  }

  private async countGitHubStargazers(): Promise<number> {
    try {
      const { stargazers_count } = (await fetch(
        'https://api.github.com/repos/ghostfolio/ghostfolio',
        {
          headers: { 'User-Agent': 'request' },
          signal: AbortSignal.timeout(
            this.configurationService.get('REQUEST_TIMEOUT')
          )
        }
      ).then((res) => res.json())) as { stargazers_count: number };

      return stargazers_count;
    } catch (error) {
      Logger.error(error, 'InfoService - GitHub');

      return undefined;
    }
  }

  private async countNewUsers(aDays: number) {
    return this.userService.count({
      where: {
        AND: [
          {
            NOT: {
              analytics: null
            }
          },
          {
            createdAt: {
              gt: subDays(new Date(), aDays)
            }
          }
        ]
      }
    });
  }

  private async countSlackCommunityUsers() {
    return await this.propertyService.getByKey<string>(
      PROPERTY_SLACK_COMMUNITY_USERS
    );
  }

  private async getDemoAuthToken() {
    const demoUserId = await this.propertyService.getByKey<string>(
      PROPERTY_DEMO_USER_ID
    );

    if (demoUserId) {
      return this.jwtService.sign({
        id: demoUserId
      });
    }

    return undefined;
  }

  private async getStatistics() {
    if (!this.configurationService.get('ENABLE_FEATURE_STATISTICS')) {
      return undefined;
    }

    let statistics: Statistics;

    try {
      statistics = JSON.parse(
        await this.redisCacheService.get(InfoService.CACHE_KEY_STATISTICS)
      );

      if (statistics) {
        return statistics;
      }
    } catch {}

    const activeUsers1d = await this.countActiveUsers(1);
    const activeUsers30d = await this.countActiveUsers(30);
    const newUsers30d = await this.countNewUsers(30);

    const dockerHubPulls = await this.countDockerHubPulls();
    const gitHubContributors = await this.countGitHubContributors();
    const gitHubStargazers = await this.countGitHubStargazers();
    const slackCommunityUsers = await this.countSlackCommunityUsers();
    const uptime = await this.getUptime();

    statistics = {
      activeUsers1d,
      activeUsers30d,
      dockerHubPulls,
      gitHubContributors,
      gitHubStargazers,
      newUsers30d,
      slackCommunityUsers,
      uptime
    };

    await this.redisCacheService.set(
      InfoService.CACHE_KEY_STATISTICS,
      JSON.stringify(statistics)
    );

    return statistics;
  }

  private async getUptime(): Promise<number> {
    {
      try {
        const monitorId = await this.propertyService.getByKey<string>(
          PROPERTY_BETTER_UPTIME_MONITOR_ID
        );

        const { data } = await fetch(
          `https://uptime.betterstack.com/api/v2/monitors/${monitorId}/sla?from=${format(
            subDays(new Date(), 90),
            DATE_FORMAT
          )}&to${format(new Date(), DATE_FORMAT)}`,
          {
            headers: {
              [HEADER_KEY_TOKEN]: `Bearer ${this.configurationService.get(
                'API_KEY_BETTER_UPTIME'
              )}`
            },
            signal: AbortSignal.timeout(
              this.configurationService.get('REQUEST_TIMEOUT')
            )
          }
        ).then((res) => res.json());

        return data.attributes.availability / 100;
      } catch (error) {
        Logger.error(error, 'InfoService - Better Stack');

        return undefined;
      }
    }
  }
}
