import {
  PortfolioCalculator,
  PortfolioOrder,
  TimelinePeriod,
  TimelineSpecification
} from '@ghostfolio/api/app/core/portfolio-calculator';
import {
  CurrentRateService,
  GetValueParams
} from '@ghostfolio/api/app/core/current-rate.service';
import { Currency } from '@prisma/client';
import { OrderType } from '@ghostfolio/api/models/order-type';
import Big from 'big.js';

function toYearMonthDay(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return [year, month, day];
}

function dateEqual(date1: Date, date2: Date) {
  const date1Converted = toYearMonthDay(date1);
  const date2Converted = toYearMonthDay(date2);

  return (
    date1Converted[0] === date2Converted[0] &&
    date1Converted[1] === date2Converted[1] &&
    date1Converted[2] === date2Converted[2]
  );
}

jest.mock('./current-rate.service.ts', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    CurrentRateService: jest.fn().mockImplementation(() => {
      return {
        getValue: ({
          date,
          symbol,
          currency,
          userCurrency
        }: GetValueParams) => {
          const today = new Date();
          if (dateEqual(today, date) && symbol === 'VTI') {
            return Promise.resolve(new Big('213.32'));
          }

          return Promise.resolve(new Big('0'));
        }
      };
    })
  };
});

describe('PortfolioCalculator', () => {
  let currentRateService: CurrentRateService;
  beforeEach(() => {
    currentRateService = new CurrentRateService(null, null);
  });

  describe('calculate transaction points', () => {
    it('with orders of only one symbol', () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        Currency.USD
      );
      portfolioCalculator.computeTransactionPoints(ordersVTI);
      const portfolioItemsAtTransactionPoints =
        portfolioCalculator.getTransactionPoints();

      expect(portfolioItemsAtTransactionPoints).toEqual(
        ordersVTITransactionPoints
      );
    });

    it('with two orders at the same day of the same type', () => {
      const orders = [
        ...ordersVTI,
        {
          date: '2021-02-01',
          quantity: new Big('20'),
          symbol: 'VTI',
          type: OrderType.Buy,
          unitPrice: new Big('197.15'),
          currency: Currency.USD
        }
      ];
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        Currency.USD
      );
      portfolioCalculator.computeTransactionPoints(orders);
      const portfolioItemsAtTransactionPoints =
        portfolioCalculator.getTransactionPoints();

      expect(portfolioItemsAtTransactionPoints).toEqual([
        {
          date: '2019-02-01',
          items: [
            {
              quantity: new Big('10'),
              symbol: 'VTI',
              investment: new Big('1443.8'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 1
            }
          ]
        },
        {
          date: '2019-08-03',
          items: [
            {
              quantity: new Big('20'),
              symbol: 'VTI',
              investment: new Big('2923.7'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 2
            }
          ]
        },
        {
          date: '2020-02-02',
          items: [
            {
              quantity: new Big('5'),
              symbol: 'VTI',
              investment: new Big('652.55'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 3
            }
          ]
        },
        {
          date: '2021-02-01',
          items: [
            {
              quantity: new Big('35'),
              symbol: 'VTI',
              investment: new Big('6627.05'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 5
            }
          ]
        },
        {
          date: '2021-08-01',
          items: [
            {
              quantity: new Big('45'),
              symbol: 'VTI',
              investment: new Big('8403.95'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 6
            }
          ]
        }
      ]);
    });

    it('with additional order', () => {
      const orders = [
        ...ordersVTI,
        {
          date: '2019-09-01',
          quantity: new Big('5'),
          symbol: 'AMZN',
          type: OrderType.Buy,
          unitPrice: new Big('2021.99'),
          currency: Currency.USD
        }
      ];
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        Currency.USD
      );
      portfolioCalculator.computeTransactionPoints(orders);
      const portfolioItemsAtTransactionPoints =
        portfolioCalculator.getTransactionPoints();

      expect(portfolioItemsAtTransactionPoints).toEqual([
        {
          date: '2019-02-01',
          items: [
            {
              quantity: new Big('10'),
              symbol: 'VTI',
              investment: new Big('1443.8'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 1
            }
          ]
        },
        {
          date: '2019-08-03',
          items: [
            {
              quantity: new Big('20'),
              symbol: 'VTI',
              investment: new Big('2923.7'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 2
            }
          ]
        },
        {
          date: '2019-09-01',
          items: [
            {
              quantity: new Big('5'),
              symbol: 'AMZN',
              investment: new Big('10109.95'),
              currency: Currency.USD,
              firstBuyDate: '2019-09-01',
              transactionCount: 1
            },
            {
              quantity: new Big('20'),
              symbol: 'VTI',
              investment: new Big('2923.7'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 2
            }
          ]
        },
        {
          date: '2020-02-02',
          items: [
            {
              quantity: new Big('5'),
              symbol: 'AMZN',
              investment: new Big('10109.95'),
              currency: Currency.USD,
              firstBuyDate: '2019-09-01',
              transactionCount: 1
            },
            {
              quantity: new Big('5'),
              symbol: 'VTI',
              investment: new Big('652.55'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 3
            }
          ]
        },
        {
          date: '2021-02-01',
          items: [
            {
              quantity: new Big('5'),
              symbol: 'AMZN',
              investment: new Big('10109.95'),
              currency: Currency.USD,
              firstBuyDate: '2019-09-01',
              transactionCount: 1
            },
            {
              quantity: new Big('15'),
              symbol: 'VTI',
              investment: new Big('2684.05'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 4
            }
          ]
        },
        {
          date: '2021-08-01',
          items: [
            {
              quantity: new Big('5'),
              symbol: 'AMZN',
              investment: new Big('10109.95'),
              currency: Currency.USD,
              firstBuyDate: '2019-09-01',
              transactionCount: 1
            },
            {
              quantity: new Big('25'),
              symbol: 'VTI',
              investment: new Big('4460.95'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 5
            }
          ]
        }
      ]);
    });

    it('with additional buy & sell', () => {
      const orders = [
        ...ordersVTI,
        {
          date: '2019-09-01',
          quantity: new Big('5'),
          symbol: 'AMZN',
          type: OrderType.Buy,
          unitPrice: new Big('2021.99'),
          currency: Currency.USD
        },
        {
          date: '2020-08-02',
          quantity: new Big('5'),
          symbol: 'AMZN',
          type: OrderType.Sell,
          unitPrice: new Big('2412.23'),
          currency: Currency.USD
        }
      ];
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        Currency.USD
      );
      portfolioCalculator.computeTransactionPoints(orders);
      const portfolioItemsAtTransactionPoints =
        portfolioCalculator.getTransactionPoints();

      expect(portfolioItemsAtTransactionPoints).toEqual([
        {
          date: '2019-02-01',
          items: [
            {
              quantity: new Big('10'),
              symbol: 'VTI',
              investment: new Big('1443.8'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 1
            }
          ]
        },
        {
          date: '2019-08-03',
          items: [
            {
              quantity: new Big('20'),
              symbol: 'VTI',
              investment: new Big('2923.7'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 2
            }
          ]
        },
        {
          date: '2019-09-01',
          items: [
            {
              quantity: new Big('5'),
              symbol: 'AMZN',
              investment: new Big('10109.95'),
              currency: Currency.USD,
              firstBuyDate: '2019-09-01',
              transactionCount: 1
            },
            {
              quantity: new Big('20'),
              symbol: 'VTI',
              investment: new Big('2923.7'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 2
            }
          ]
        },
        {
          date: '2020-02-02',
          items: [
            {
              quantity: new Big('5'),
              symbol: 'AMZN',
              investment: new Big('10109.95'),
              currency: Currency.USD,
              firstBuyDate: '2019-09-01',
              transactionCount: 1
            },
            {
              quantity: new Big('5'),
              symbol: 'VTI',
              investment: new Big('652.55'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 3
            }
          ]
        },
        {
          date: '2020-08-02',
          items: [
            {
              quantity: new Big('5'),
              symbol: 'VTI',
              investment: new Big('652.55'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 3
            }
          ]
        },
        {
          date: '2021-02-01',
          items: [
            {
              quantity: new Big('15'),
              symbol: 'VTI',
              investment: new Big('2684.05'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 4
            }
          ]
        },
        {
          date: '2021-08-01',
          items: [
            {
              quantity: new Big('25'),
              symbol: 'VTI',
              investment: new Big('4460.95'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 5
            }
          ]
        }
      ]);
    });

    it('with mixed symbols', () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        Currency.USD
      );
      portfolioCalculator.computeTransactionPoints(ordersMixedSymbols);
      const portfolioItemsAtTransactionPoints =
        portfolioCalculator.getTransactionPoints();

      expect(portfolioItemsAtTransactionPoints).toEqual([
        {
          date: '2017-01-03',
          items: [
            {
              quantity: new Big('50'),
              symbol: 'TSLA',
              investment: new Big('2148.5'),
              currency: Currency.USD,
              firstBuyDate: '2017-01-03',
              transactionCount: 1
            }
          ]
        },
        {
          date: '2017-07-01',
          items: [
            {
              quantity: new Big('0.5614682'),
              symbol: 'BTCUSD',
              investment: new Big('1999.9999999999998659756'),
              currency: Currency.USD,
              firstBuyDate: '2017-07-01',
              transactionCount: 1
            },
            {
              quantity: new Big('50'),
              symbol: 'TSLA',
              investment: new Big('2148.5'),
              currency: Currency.USD,
              firstBuyDate: '2017-01-03',
              transactionCount: 1
            }
          ]
        },
        {
          date: '2018-09-01',
          items: [
            {
              quantity: new Big('5'),
              symbol: 'AMZN',
              investment: new Big('10109.95'),
              currency: Currency.USD,
              firstBuyDate: '2018-09-01',
              transactionCount: 1
            },
            {
              quantity: new Big('0.5614682'),
              symbol: 'BTCUSD',
              investment: new Big('1999.9999999999998659756'),
              currency: Currency.USD,
              firstBuyDate: '2017-07-01',
              transactionCount: 1
            },
            {
              quantity: new Big('50'),
              symbol: 'TSLA',
              investment: new Big('2148.5'),
              currency: Currency.USD,
              firstBuyDate: '2017-01-03',
              transactionCount: 1
            }
          ]
        }
      ]);
    });
  });

  describe('get current positions', () => {
    it('with just VTI', async () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        Currency.USD
      );
      portfolioCalculator.setTransactionPoints(ordersVTITransactionPoints);
      const currentPositions = await portfolioCalculator.getCurrentPositions();

      expect(currentPositions).toEqual({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        VTI: {
          averagePrice: new Big('178.438'),
          firstBuyDate: '2019-02-01',
          quantity: new Big('25'),
          symbol: 'VTI',
          investment: new Big('4460.95'),
          marketPrice: new Big('213.32'),
          transactionCount: 5
        }
      });
    });
  });

  describe('calculate timeline', () => {
    it('with yearly', async () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        Currency.USD
      );
      portfolioCalculator.setTransactionPoints(ordersVTITransactionPoints);
      const timelineSpecification: TimelineSpecification[] = [
        {
          start: '2019-01-01',
          accuracy: 'year'
        }
      ];
      const timeline: TimelinePeriod[] =
        await portfolioCalculator.calculateTimeline(
          timelineSpecification,
          '2021-12-31'
        );

      expect(timeline).toEqual([
        {
          date: '2019-01-01',
          grossPerformance: 0,
          investment: new Big('0'),
          value: 0
        },
        {
          date: '2020-01-01',
          grossPerformance: 0,
          investment: new Big('2923.7'),
          value: 0
        },
        {
          date: '2021-01-01',
          grossPerformance: 0,
          investment: new Big('652.55'),
          value: 0
        }
      ]);
    });

    it('with monthly', async () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        Currency.USD
      );
      portfolioCalculator.setTransactionPoints(ordersVTITransactionPoints);
      const timelineSpecification: TimelineSpecification[] = [
        {
          start: '2019-01-01',
          accuracy: 'month'
        }
      ];
      const timeline: TimelinePeriod[] =
        await portfolioCalculator.calculateTimeline(
          timelineSpecification,
          '2021-12-31'
        );

      expect(timeline).toEqual([
        {
          date: '2019-01-01',
          grossPerformance: 0,
          investment: new Big('0'),
          value: 0
        },
        {
          date: '2019-02-01',
          grossPerformance: 0,
          investment: new Big('1443.8'),
          value: 0
        },
        {
          date: '2019-03-01',
          grossPerformance: 0,
          investment: new Big('1443.8'),
          value: 0
        },
        {
          date: '2019-04-01',
          grossPerformance: 0,
          investment: new Big('1443.8'),
          value: 0
        },
        {
          date: '2019-05-01',
          grossPerformance: 0,
          investment: new Big('1443.8'),
          value: 0
        },
        {
          date: '2019-06-01',
          grossPerformance: 0,
          investment: new Big('1443.8'),
          value: 0
        },
        {
          date: '2019-07-01',
          grossPerformance: 0,
          investment: new Big('1443.8'),
          value: 0
        },
        {
          date: '2019-08-01',
          grossPerformance: 0,
          investment: new Big('1443.8'),
          value: 0
        },
        {
          date: '2019-09-01',
          grossPerformance: 0,
          investment: new Big('2923.7'),
          value: 0
        },
        {
          date: '2019-10-01',
          grossPerformance: 0,
          investment: new Big('2923.7'),
          value: 0
        },
        {
          date: '2019-11-01',
          grossPerformance: 0,
          investment: new Big('2923.7'),
          value: 0
        },
        {
          date: '2019-12-01',
          grossPerformance: 0,
          investment: new Big('2923.7'),
          value: 0
        },
        {
          date: '2020-01-01',
          grossPerformance: 0,
          investment: new Big('2923.7'),
          value: 0
        },
        {
          date: '2020-02-01',
          grossPerformance: 0,
          investment: new Big('2923.7'),
          value: 0
        },
        {
          date: '2020-03-01',
          grossPerformance: 0,
          investment: new Big('652.55'),
          value: 0
        },
        {
          date: '2020-04-01',
          grossPerformance: 0,
          investment: new Big('652.55'),
          value: 0
        },
        {
          date: '2020-05-01',
          grossPerformance: 0,
          investment: new Big('652.55'),
          value: 0
        },
        {
          date: '2020-06-01',
          grossPerformance: 0,
          investment: new Big('652.55'),
          value: 0
        },
        {
          date: '2020-07-01',
          grossPerformance: 0,
          investment: new Big('652.55'),
          value: 0
        },
        {
          date: '2020-08-01',
          grossPerformance: 0,
          investment: new Big('652.55'),
          value: 0
        },
        {
          date: '2020-09-01',
          grossPerformance: 0,
          investment: new Big('652.55'),
          value: 0
        },
        {
          date: '2020-10-01',
          grossPerformance: 0,
          investment: new Big('652.55'),
          value: 0
        },
        {
          date: '2020-11-01',
          grossPerformance: 0,
          investment: new Big('652.55'),
          value: 0
        },
        {
          date: '2020-12-01',
          grossPerformance: 0,
          investment: new Big('652.55'),
          value: 0
        },
        {
          date: '2021-01-01',
          grossPerformance: 0,
          investment: new Big('652.55'),
          value: 0
        },
        {
          date: '2021-02-01',
          grossPerformance: 0,
          investment: new Big('2684.05'),
          value: 0
        },
        {
          date: '2021-03-01',
          grossPerformance: 0,
          investment: new Big('2684.05'),
          value: 0
        },
        {
          date: '2021-04-01',
          grossPerformance: 0,
          investment: new Big('2684.05'),
          value: 0
        },
        {
          date: '2021-05-01',
          grossPerformance: 0,
          investment: new Big('2684.05'),
          value: 0
        },
        {
          date: '2021-06-01',
          grossPerformance: 0,
          investment: new Big('2684.05'),
          value: 0
        },
        {
          date: '2021-07-01',
          grossPerformance: 0,
          investment: new Big('2684.05'),
          value: 0
        },
        {
          date: '2021-08-01',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-09-01',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-10-01',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-11-01',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-01',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        }
      ]);
    });

    it('with yearly and monthly mixed', async () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        Currency.USD
      );
      portfolioCalculator.setTransactionPoints(ordersVTITransactionPoints);
      const timelineSpecification: TimelineSpecification[] = [
        {
          start: '2019-01-01',
          accuracy: 'year'
        },
        {
          start: '2021-01-01',
          accuracy: 'month'
        }
      ];
      const timeline: TimelinePeriod[] =
        await portfolioCalculator.calculateTimeline(
          timelineSpecification,
          '2021-12-31'
        );

      expect(timeline).toEqual([
        {
          date: '2019-01-01',
          grossPerformance: 0,
          investment: new Big('0'),
          value: 0
        },
        {
          date: '2020-01-01',
          grossPerformance: 0,
          investment: new Big('2923.7'),
          value: 0
        },
        {
          date: '2021-01-01',
          grossPerformance: 0,
          investment: new Big('652.55'),
          value: 0
        },
        {
          date: '2021-02-01',
          grossPerformance: 0,
          investment: new Big('2684.05'),
          value: 0
        },
        {
          date: '2021-03-01',
          grossPerformance: 0,
          investment: new Big('2684.05'),
          value: 0
        },
        {
          date: '2021-04-01',
          grossPerformance: 0,
          investment: new Big('2684.05'),
          value: 0
        },
        {
          date: '2021-05-01',
          grossPerformance: 0,
          investment: new Big('2684.05'),
          value: 0
        },
        {
          date: '2021-06-01',
          grossPerformance: 0,
          investment: new Big('2684.05'),
          value: 0
        },
        {
          date: '2021-07-01',
          grossPerformance: 0,
          investment: new Big('2684.05'),
          value: 0
        },
        {
          date: '2021-08-01',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-09-01',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-10-01',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-11-01',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-01',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        }
      ]);
    });

    it('with all mixed', async () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        Currency.USD
      );
      portfolioCalculator.setTransactionPoints(ordersVTITransactionPoints);
      const timelineSpecification: TimelineSpecification[] = [
        {
          start: '2019-01-01',
          accuracy: 'year'
        },
        {
          start: '2021-01-01',
          accuracy: 'month'
        },
        {
          start: '2021-12-01',
          accuracy: 'day'
        }
      ];
      const timeline: TimelinePeriod[] =
        await portfolioCalculator.calculateTimeline(
          timelineSpecification,
          '2021-12-31'
        );

      expect(timeline).toEqual([
        {
          date: '2019-01-01',
          grossPerformance: 0,
          investment: new Big('0'),
          value: 0
        },
        {
          date: '2020-01-01',
          grossPerformance: 0,
          investment: new Big('2923.7'),
          value: 0
        },
        {
          date: '2021-01-01',
          grossPerformance: 0,
          investment: new Big('652.55'),
          value: 0
        },
        {
          date: '2021-02-01',
          grossPerformance: 0,
          investment: new Big('2684.05'),
          value: 0
        },
        {
          date: '2021-03-01',
          grossPerformance: 0,
          investment: new Big('2684.05'),
          value: 0
        },
        {
          date: '2021-04-01',
          grossPerformance: 0,
          investment: new Big('2684.05'),
          value: 0
        },
        {
          date: '2021-05-01',
          grossPerformance: 0,
          investment: new Big('2684.05'),
          value: 0
        },
        {
          date: '2021-06-01',
          grossPerformance: 0,
          investment: new Big('2684.05'),
          value: 0
        },
        {
          date: '2021-07-01',
          grossPerformance: 0,
          investment: new Big('2684.05'),
          value: 0
        },
        {
          date: '2021-08-01',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-09-01',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-10-01',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-11-01',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-01',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-02',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-03',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-04',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-05',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-06',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-07',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-08',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-09',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-10',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-11',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-12',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-13',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-14',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-15',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-16',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-17',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-18',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-19',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-20',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-21',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-22',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-23',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-24',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-25',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-26',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-27',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-28',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-29',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-30',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        },
        {
          date: '2021-12-31',
          grossPerformance: 0,
          investment: new Big('4460.95'),
          value: 0
        }
      ]);
    });
  });
});
const ordersMixedSymbols: PortfolioOrder[] = [
  {
    date: '2017-01-03',
    quantity: new Big('50'),
    symbol: 'TSLA',
    type: OrderType.Buy,
    unitPrice: new Big('42.97'),
    currency: Currency.USD
  },
  {
    date: '2017-07-01',
    quantity: new Big('0.5614682'),
    symbol: 'BTCUSD',
    type: OrderType.Buy,
    unitPrice: new Big('3562.089535970158'),
    currency: Currency.USD
  },
  {
    date: '2018-09-01',
    quantity: new Big('5'),
    symbol: 'AMZN',
    type: OrderType.Buy,
    unitPrice: new Big('2021.99'),
    currency: Currency.USD
  }
];

const ordersVTI: PortfolioOrder[] = [
  {
    date: '2019-02-01',
    quantity: new Big('10'),
    symbol: 'VTI',
    type: OrderType.Buy,
    unitPrice: new Big('144.38'),
    currency: Currency.USD
  },
  {
    date: '2019-08-03',
    quantity: new Big('10'),
    symbol: 'VTI',
    type: OrderType.Buy,
    unitPrice: new Big('147.99'),
    currency: Currency.USD
  },
  {
    date: '2020-02-02',
    quantity: new Big('15'),
    symbol: 'VTI',
    type: OrderType.Sell,
    unitPrice: new Big('151.41'),
    currency: Currency.USD
  },
  {
    date: '2021-08-01',
    quantity: new Big('10'),
    symbol: 'VTI',
    type: OrderType.Buy,
    unitPrice: new Big('177.69'),
    currency: Currency.USD
  },
  {
    date: '2021-02-01',
    quantity: new Big('10'),
    symbol: 'VTI',
    type: OrderType.Buy,
    unitPrice: new Big('203.15'),
    currency: Currency.USD
  }
];

const ordersVTITransactionPoints = [
  {
    date: '2019-02-01',
    items: [
      {
        quantity: new Big('10'),
        symbol: 'VTI',
        investment: new Big('1443.8'),
        currency: Currency.USD,
        firstBuyDate: '2019-02-01',
        transactionCount: 1
      }
    ]
  },
  {
    date: '2019-08-03',
    items: [
      {
        quantity: new Big('20'),
        symbol: 'VTI',
        investment: new Big('2923.7'),
        currency: Currency.USD,
        firstBuyDate: '2019-02-01',
        transactionCount: 2
      }
    ]
  },
  {
    date: '2020-02-02',
    items: [
      {
        quantity: new Big('5'),
        symbol: 'VTI',
        investment: new Big('652.55'),
        currency: Currency.USD,
        firstBuyDate: '2019-02-01',
        transactionCount: 3
      }
    ]
  },
  {
    date: '2021-02-01',
    items: [
      {
        quantity: new Big('15'),
        symbol: 'VTI',
        investment: new Big('2684.05'),
        currency: Currency.USD,
        firstBuyDate: '2019-02-01',
        transactionCount: 4
      }
    ]
  },
  {
    date: '2021-08-01',
    items: [
      {
        quantity: new Big('25'),
        symbol: 'VTI',
        investment: new Big('4460.95'),
        currency: Currency.USD,
        firstBuyDate: '2019-02-01',
        transactionCount: 5
      }
    ]
  }
];
