import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getDashboardData,
  calculateMrrMetrics,
  calculatePlanBreakdown,
  isRecognizedCustomer,
  MOCK_CUSTOMERS,
  MOCK_MONTHLY_SERIES,
  PLAN_MONTHLY_SERIES,
  MOCK_MOVEMENTS,
  type PlanTier,
} from './mock-api.ts';

describe('SaaS Metrics Engine & Mock API Test Suite', () => {

  describe('1. Global & Per-Plan Reconciliation (Plans x Periods: 6M & 12M)', () => {
    const plans: (PlanTier | 'all')[] = ['all', 'starter', 'pro', 'enterprise'];
    const periods: (6 | 12)[] = [6, 12];

    for (const plan of plans) {
      for (const period of periods) {
        test(`Reconciles plan="${plan}" for period=${period}M`, () => {
          const data = getDashboardData(plan, period);
          const { summary, monthlySeries, customers, planBreakdown } = data;

          assert.equal(monthlySeries.length, period, `monthlySeries length should match period ${period}`);

          const latestPoint = monthlySeries[monthlySeries.length - 1];
          assert.ok(latestPoint, 'Latest metric point must exist');

          // 1. Latest monthly series point must agree with summary KPI
          assert.equal(summary.currentMrr, latestPoint.mrr, 'summary.currentMrr must equal latest series mrr');
          assert.equal(summary.activeCustomers, latestPoint.activeCustomers, 'summary.activeCustomers must equal latest series activeCustomers');
          assert.equal(summary.currentArr, Number((summary.currentMrr * 12).toFixed(2)), 'summary.currentArr must equal currentMrr * 12');

          // 2. Recognized customers sum must agree with summary KPI
          const recognized = customers.filter(isRecognizedCustomer);
          const recognizedMrrSum = Number(recognized.reduce((acc, c) => acc + c.mrr, 0).toFixed(2));
          assert.equal(recognizedMrrSum, summary.currentMrr, 'Recognized customers MRR sum must equal summary.currentMrr');
          assert.equal(recognized.length, summary.activeCustomers, 'Recognized customers count must equal summary.activeCustomers');

          // 3. Plan breakdown sum must agree with summary KPI
          const breakdownMrrSum = Number(planBreakdown.reduce((acc, p) => acc + p.mrr, 0).toFixed(2));
          const breakdownCustSum = planBreakdown.reduce((acc, p) => acc + p.customers, 0);
          assert.equal(breakdownMrrSum, summary.currentMrr, 'Plan breakdown MRR sum must equal summary.currentMrr');
          assert.equal(breakdownCustSum, summary.activeCustomers, 'Plan breakdown customers sum must equal summary.activeCustomers');

          // 4. Share percentage validation
          const shareSum = Number(planBreakdown.reduce((acc, p) => acc + p.sharePercentage, 0).toFixed(2));
          if (summary.currentMrr > 0) {
            assert.equal(shareSum, 100, 'Plan breakdown sharePercentage must sum to exactly 100%');
          }

          // 5. If filtered by specific plan, other plans in breakdown must be 0
          if (plan !== 'all') {
            for (const tier of planBreakdown) {
              if (tier.plan === plan) {
                assert.equal(tier.mrr, summary.currentMrr, `Active tier ${tier.plan} must hold 100% of filtered MRR`);
                assert.equal(tier.customers, summary.activeCustomers, `Active tier ${tier.plan} must hold 100% of filtered customers`);
                assert.equal(tier.sharePercentage, 100, `Active tier ${tier.plan} must hold 100% share`);
              } else {
                assert.equal(tier.mrr, 0, `Inactive tier ${tier.plan} must have $0 MRR`);
                assert.equal(tier.customers, 0, `Inactive tier ${tier.plan} must have 0 customers`);
                assert.equal(tier.sharePercentage, 0, `Inactive tier ${tier.plan} must have 0% share`);
              }
            }
          }
        });
      }
    }

    test('Sum of individual plans equals the global "all" dashboard', () => {
      const allData = getDashboardData('all', 12);
      const starterData = getDashboardData('starter', 12);
      const proData = getDashboardData('pro', 12);
      const enterpriseData = getDashboardData('enterprise', 12);

      const sumPlanMrr = Number((starterData.summary.currentMrr + proData.summary.currentMrr + enterpriseData.summary.currentMrr).toFixed(2));
      const sumPlanCust = starterData.summary.activeCustomers + proData.summary.activeCustomers + enterpriseData.summary.activeCustomers;
      const sumPlanArr = Number((starterData.summary.currentArr + proData.summary.currentArr + enterpriseData.summary.currentArr).toFixed(2));

      assert.equal(sumPlanMrr, allData.summary.currentMrr, 'Sum of plan MRRs must equal global MRR ($180,200)');
      assert.equal(sumPlanCust, allData.summary.activeCustomers, 'Sum of plan customers must equal global active customers (24)');
      assert.equal(sumPlanArr, allData.summary.currentArr, 'Sum of plan ARRs must equal global ARR ($2,162,400)');
    });
  });

  describe('2. Monthly Rollforward & Rate Derivation Integrity', () => {
    test('Every month across all series satisfies netNewMrr = new + expansion - contraction - churned', () => {
      const allSeriesList = [
        MOCK_MONTHLY_SERIES,
        PLAN_MONTHLY_SERIES.starter,
        PLAN_MONTHLY_SERIES.pro,
        PLAN_MONTHLY_SERIES.enterprise,
      ];

      for (const series of allSeriesList) {
        assert.equal(series.length, 12, 'Each series must have exactly 12 months');
        for (const point of series) {
          const expectedNetNew = Number((point.newMrr + point.expansionMrr - point.contractionMrr - point.churnedMrr).toFixed(2));
          assert.equal(point.netNewMrr, expectedNetNew, `netNewMrr mismatch in month ${point.month}`);
          assert.equal(point.arr, Number((point.mrr * 12).toFixed(2)), `arr mismatch in month ${point.month}`);
        }
      }
    });

    test('Global monthly points equal the exact sum of the three plan series', () => {
      for (let i = 0; i < 12; i++) {
        const g = MOCK_MONTHLY_SERIES[i];
        const s = PLAN_MONTHLY_SERIES.starter[i];
        const p = PLAN_MONTHLY_SERIES.pro[i];
        const e = PLAN_MONTHLY_SERIES.enterprise[i];

        assert.equal(g.mrr, Number((s.mrr + p.mrr + e.mrr).toFixed(2)), `MRR sum mismatch at index ${i}`);
        assert.equal(g.arr, Number((s.arr + p.arr + e.arr).toFixed(2)), `ARR sum mismatch at index ${i}`);
        assert.equal(g.newMrr, Number((s.newMrr + p.newMrr + e.newMrr).toFixed(2)), `newMrr sum mismatch at index ${i}`);
        assert.equal(g.expansionMrr, Number((s.expansionMrr + p.expansionMrr + e.expansionMrr).toFixed(2)), `expansionMrr sum mismatch at index ${i}`);
        assert.equal(g.contractionMrr, Number((s.contractionMrr + p.contractionMrr + e.contractionMrr).toFixed(2)), `contractionMrr sum mismatch at index ${i}`);
        assert.equal(g.churnedMrr, Number((s.churnedMrr + p.churnedMrr + e.churnedMrr).toFixed(2)), `churnedMrr sum mismatch at index ${i}`);
        assert.equal(g.netNewMrr, Number((s.netNewMrr + p.netNewMrr + e.netNewMrr).toFixed(2)), `netNewMrr sum mismatch at index ${i}`);
        assert.equal(g.activeCustomers, s.activeCustomers + p.activeCustomers + e.activeCustomers, `activeCustomers sum mismatch at index ${i}`);
      }
    });

    test('NDR, logo churn rate, and revenue churn rate are derived mathematically from opening figures', () => {
      // Month 12: opening MRR = Month 11 closing MRR (199,900)
      const prev = MOCK_MONTHLY_SERIES[10];
      const cur = MOCK_MONTHLY_SERIES[11];
      const openingMrr = prev.mrr;
      const openingCustomers = prev.activeCustomers;

      const expectedNdr = Number((((openingMrr + cur.expansionMrr - cur.contractionMrr - cur.churnedMrr) / openingMrr) * 100).toFixed(2));
      assert.equal(cur.ndr, expectedNdr, 'Latest month NDR must be derived from opening MRR');

      const expectedLogoChurn = openingCustomers > 0
        ? Number((((openingCustomers - cur.activeCustomers) / openingCustomers) * 100).toFixed(2))
        : 0;
      // In month 12, churned accounts was 0 and new accounts was 0
      assert.equal(cur.logoChurnRate, expectedLogoChurn, 'Month 12 logo churn rate matches opening customer derivation');
      assert.equal(cur.logoChurnRate, 0, 'Month 12 logo churn rate is 0%');
      assert.equal(cur.revenueChurnRate, 0, 'Month 12 revenue churn rate is 0%');
    });
  });

  describe('3. Movement Integrity & Fixture Alignment', () => {
    test('All movements satisfy previousMrr + deltaMrr === currentMrr with valid dates and types', () => {
      assert.ok(MOCK_MOVEMENTS.length >= 10, 'Must have at least 10 movements');
      const asOfDate = '2026-11-05';

      for (const m of MOCK_MOVEMENTS) {
        assert.equal(
          Number((m.previousMrr + m.deltaMrr).toFixed(2)),
          m.currentMrr,
          `Movement ${m.id} equation violated: ${m.previousMrr} + ${m.deltaMrr} !== ${m.currentMrr}`
        );

        assert.ok(m.date <= asOfDate, `Movement ${m.id} date ${m.date} must not be in the future beyond ${asOfDate}`);

        // Sign convention
        if (m.type === 'new' || m.type === 'expansion' || m.type === 'reactivation') {
          assert.ok(m.deltaMrr > 0, `Movement ${m.id} type ${m.type} must have positive deltaMrr`);
        } else if (m.type === 'contraction' || m.type === 'churn') {
          assert.ok(m.deltaMrr < 0, `Movement ${m.id} type ${m.type} must have negative deltaMrr`);
        }

        // Company exists in fixtures
        const customer = MOCK_CUSTOMERS.find(c => c.companyName === m.companyName);
        assert.ok(customer, `Movement company ${m.companyName} must exist in MOCK_CUSTOMERS`);
        if (!customer) {
          throw new Error(`Customer ${m.companyName} not found`);
        }

        // No new movement for trialing customer
        if (m.type === 'new') {
          assert.notEqual(customer.status, 'trialing', `Customer ${customer.companyName} cannot have type "new" while status is trialing`);
        }

        // Churned movements end at 0 MRR
        if (m.type === 'churn') {
          assert.equal(m.currentMrr, 0, `Churned movement ${m.id} must end at currentMrr: 0`);
        }
      }
    });

    test('Customer fixture accounting policies and RFC 2606 domain isolation', () => {
      assert.ok(MOCK_CUSTOMERS.length >= 18, 'Must have at least 18 customer fixtures');

      for (const c of MOCK_CUSTOMERS) {
        assert.ok(c.domain.endsWith('.example'), `Customer ${c.companyName} domain ${c.domain} must use reserved .example`);

        if (c.status === 'churned') {
          assert.equal(c.mrr, 0, `Churned customer ${c.companyName} must have $0 MRR`);
          assert.equal(c.arr, 0, `Churned customer ${c.companyName} must have $0 ARR`);
          assert.ok(c.churnedAt, `Churned customer ${c.companyName} must have churnedAt date`);
        } else if (c.status === 'trialing') {
          assert.equal(c.mrr, 0, `Trialing customer ${c.companyName} must have $0 MRR`);
          assert.equal(c.arr, 0, `Trialing customer ${c.companyName} must have $0 ARR`);
        } else if (c.status === 'active' || c.status === 'past_due') {
          assert.ok(c.mrr > 0, `Recognized customer ${c.companyName} must have positive MRR`);
          assert.equal(c.arr, c.mrr * 12, `Customer ${c.companyName} arr must equal mrr * 12`);
        }
      }
    });
  });

  describe('4. Edge Cases, Empty Inputs & Documented Sentinels', () => {
    test('calculateMrrMetrics with empty customers does NOT resurrect global MRR', () => {
      const summaryWithSeries = calculateMrrMetrics([], MOCK_MONTHLY_SERIES);
      assert.equal(summaryWithSeries.currentMrr, 0, 'Empty customers must yield $0 currentMrr');
      assert.equal(summaryWithSeries.currentArr, 0, 'Empty customers must yield $0 currentArr');
      assert.equal(summaryWithSeries.activeCustomers, 0, 'Empty customers must yield 0 activeCustomers');
      assert.equal(summaryWithSeries.arpu, 0, 'Empty customers must yield $0 ARPU');
      assert.equal(summaryWithSeries.ltv, 0, 'Empty customers must yield $0 LTV');

      const summaryEmptyAll = calculateMrrMetrics([], []);
      assert.equal(summaryEmptyAll.currentMrr, 0);
      assert.equal(summaryEmptyAll.activeCustomers, 0);
      assert.equal(summaryEmptyAll.mrrGrowthMoM, 0);
      assert.equal(summaryEmptyAll.netNewMrr, 0);
      assert.equal(summaryEmptyAll.grossMargin, 84.2);
      assert.equal(summaryEmptyAll.cacPaybackMonths, 11.5);
    });

    test('Zero churn returns finite sentinel 0 for LTV (never synthesizes arbitrary fallback)', () => {
      // Month 12 has logoChurnRate: 0%
      const data = getDashboardData('all', 12);
      assert.equal(data.monthlySeries[data.monthlySeries.length - 1].logoChurnRate, 0);
      assert.equal(data.summary.logoChurnRate, 0);
      assert.equal(data.summary.ltv, 0, 'When logoChurnRate is 0, LTV must return documented finite sentinel 0');
    });

    test('calculatePlanBreakdown with empty list safely handles zero division', () => {
      const breakdown = calculatePlanBreakdown([]);
      assert.equal(breakdown.length, 3);
      for (const b of breakdown) {
        assert.equal(b.customers, 0);
        assert.equal(b.mrr, 0);
        assert.equal(b.sharePercentage, 0);
        assert.equal(b.arpu, 0);
        assert.equal(b.churnRate, 0);
      }
    });
  });

});
