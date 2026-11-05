/**
 * Mock API & SaaS Financial Metrics Engine
 *
 * Provides type-safe SaaS financial calculations, deterministic historical ledger,
 * and realistic datasets adhering to GAAP/SaaS accounting principles:
 * - Recognized MRR/ARR: Active and Past Due accounts under grace period
 * - Churned and Trialing accounts carry $0 recognized MRR/ARR
 * - Net New MRR = newMrr + expansionMrr - contractionMrr - churnedMrr
 * - NDR / NRR = (openingMrr + expansionMrr - contractionMrr - churnedMrr) / openingMrr * 100
 * - Logo Churn = churnedCustomers / openingCustomers * 100
 * - Revenue Churn = churnedMrr / openingMrr * 100
 * - Finite 0 sentinel for LTV when churn is 0
 * - Fixed simulation assumptions: Gross Margin (84.2%) and CAC Payback (11.5 mo)
 * - Fictional domains use reserved RFC 2606 '.example'
 */

export type PlanTier = 'starter' | 'pro' | 'enterprise';

export type SubscriptionStatus = 'active' | 'churned' | 'past_due' | 'trialing';

export type MrrMovementType = 'new' | 'expansion' | 'contraction' | 'churn' | 'reactivation';

export interface CustomerSubscription {
  id: string;
  companyName: string;
  domain: string;
  plan: PlanTier;
  status: SubscriptionStatus;
  mrr: number; // Monthly Recurring Revenue in USD
  arr: number; // Annual Recurring Revenue in USD (mrr * 12)
  seats: number;
  startedAt: string; // ISO date YYYY-MM-DD
  churnedAt?: string; // ISO date YYYY-MM-DD if status === 'churned'
  healthScore: number; // 0 to 100
  owner: string;
}

export interface MonthlyMetricPoint {
  month: string; // YYYY-MM (12 meses consecutivos até 2026-11)
  label: string; // ex: 'Dez 25', 'Jan 26', ..., 'Nov 26'
  mrr: number;
  arr: number;
  newMrr: number;
  expansionMrr: number;
  contractionMrr: number;
  churnedMrr: number; // valor positivo representando o MRR perdido no mês; netNewMrr = newMrr + expansionMrr - contractionMrr - churnedMrr
  netNewMrr: number;
  activeCustomers: number;
  logoChurnRate: number; // percentual ex: 1.85
  revenueChurnRate: number; // percentual ex: 1.42
  ndr: number; // Net Dollar Retention percentual ex: 108.4
}

export interface MrrMovementEvent {
  id: string;
  date: string; // YYYY-MM-DD
  companyName: string;
  plan: PlanTier;
  type: MrrMovementType;
  deltaMrr: number; // positivo para new/expansion/reactivation, negativo para contraction/churn
  previousMrr: number;
  currentMrr: number;
}

export interface PlanBreakdown {
  plan: PlanTier;
  label: string;
  customers: number;
  mrr: number;
  sharePercentage: number; // 0 a 100
  arpu: number;
  churnRate: number; // percentual
}

export interface FinancialDashboardSummary {
  currentMrr: number;
  mrrGrowthMoM: number; // percentual ex: 6.4
  currentArr: number;
  netNewMrr: number;
  grossMargin: number; // percentual ex: 84.2 (benchmark simulado documentado)
  logoChurnRate: number; // percentual ex: 1.8
  netRevenueRetention: number; // percentual ex: 112.5
  arpu: number;
  ltv: number;
  cacPaybackMonths: number; // benchmark simulado documentado (11.5 mo)
  activeCustomers: number;
}

export interface DashboardDataPayload {
  asOfDate: string;
  currency: 'USD';
  summary: FinancialDashboardSummary;
  monthlySeries: MonthlyMetricPoint[];
  recentMovements: MrrMovementEvent[];
  customers: CustomerSubscription[];
  planBreakdown: PlanBreakdown[];
}

/**
 * Recognizes billable accounts: active and past_due (grace period).
 * Churned accounts and trialing accounts carry $0 recognized MRR.
 */
export function isRecognizedCustomer(customer: CustomerSubscription): boolean {
  return customer.status === 'active' || customer.status === 'past_due';
}

/**
 * 29 Fictional B2B SaaS Customers using reserved RFC 2606 '.example' domains.
 * - Enterprise: 8 recognized (7 active, 1 past_due) -> $144,000 MRR
 * - Pro: 10 recognized (9 active, 1 past_due) -> $32,400 MRR
 * - Starter: 6 recognized (5 active, 1 past_due) -> $3,800 MRR
 * - Total recognized customers: 24 -> $180,200 MRR, exactly reconciling with 2026-11 monthly series.
 * - Churned/trialing accounts explicitly carry $0 MRR and $0 ARR.
 */
export const MOCK_CUSTOMERS: CustomerSubscription[] = [
  // Enterprise Tier (10 accounts: 7 active, 1 past_due, 1 churned, 1 trialing)
  {
    id: 'cust-001',
    companyName: 'Apex Security',
    domain: 'apexsecurity.example',
    plan: 'enterprise',
    status: 'active',
    mrr: 35000,
    arr: 420000,
    seats: 650,
    startedAt: '2023-04-10',
    healthScore: 94,
    owner: 'Sarah Jenkins',
  },
  {
    id: 'cust-002',
    companyName: 'OmniData Systems',
    domain: 'omnidata.example',
    plan: 'enterprise',
    status: 'active',
    mrr: 28000,
    arr: 336000,
    seats: 520,
    startedAt: '2023-08-15',
    healthScore: 89,
    owner: 'Alex Rivera',
  },
  {
    id: 'cust-003',
    companyName: 'TechCorp Global',
    domain: 'techcorpglobal.example',
    plan: 'enterprise',
    status: 'active',
    mrr: 24000,
    arr: 288000,
    seats: 410,
    startedAt: '2023-11-20',
    healthScore: 92,
    owner: 'Alex Rivera',
  },
  {
    id: 'cust-004',
    companyName: 'BlueRidge Cyber',
    domain: 'blueridgecyber.example',
    plan: 'enterprise',
    status: 'active',
    mrr: 20000,
    arr: 240000,
    seats: 360,
    startedAt: '2024-02-12',
    healthScore: 95,
    owner: 'Sarah Jenkins',
  },
  {
    id: 'cust-005',
    companyName: 'Acme Cloud',
    domain: 'acmecloud.example',
    plan: 'enterprise',
    status: 'active',
    mrr: 15000,
    arr: 180000,
    seats: 280,
    startedAt: '2024-06-01',
    healthScore: 88,
    owner: 'Sarah Jenkins',
  },
  {
    id: 'cust-006',
    companyName: 'CloudScale Systems',
    domain: 'cloudscale.example',
    plan: 'enterprise',
    status: 'active',
    mrr: 12000,
    arr: 144000,
    seats: 210,
    startedAt: '2024-09-18',
    healthScore: 91,
    owner: 'Alex Rivera',
  },
  {
    id: 'cust-007',
    companyName: 'GlobalLogix',
    domain: 'globallogix.example',
    plan: 'enterprise',
    status: 'active',
    mrr: 5000,
    arr: 60000,
    seats: 95,
    startedAt: '2026-10-15',
    healthScore: 86,
    owner: 'Sarah Jenkins',
  },
  {
    id: 'cust-008',
    companyName: 'FinScale Labs',
    domain: 'finscalelabs.example',
    plan: 'enterprise',
    status: 'past_due',
    mrr: 5000,
    arr: 60000,
    seats: 90,
    startedAt: '2024-10-05',
    healthScore: 58,
    owner: 'Sarah Jenkins',
  },
  {
    id: 'cust-009',
    companyName: 'DataVanguard',
    domain: 'datavanguard.example',
    plan: 'enterprise',
    status: 'churned',
    mrr: 0,
    arr: 0,
    seats: 190,
    startedAt: '2024-01-15',
    churnedAt: '2026-10-18',
    healthScore: 28,
    owner: 'Marcus Chen',
  },
  {
    id: 'cust-010',
    companyName: 'TitanCompute',
    domain: 'titancompute.example',
    plan: 'enterprise',
    status: 'trialing',
    mrr: 0,
    arr: 0,
    seats: 150,
    startedAt: '2026-11-01',
    healthScore: 85,
    owner: 'Alex Rivera',
  },

  // Pro Tier (11 accounts: 9 active, 1 past_due, 1 churned)
  {
    id: 'cust-011',
    companyName: 'Velocity AI',
    domain: 'velocityai.example',
    plan: 'pro',
    status: 'active',
    mrr: 5400,
    arr: 64800,
    seats: 72,
    startedAt: '2024-12-05',
    healthScore: 93,
    owner: 'Marcus Chen',
  },
  {
    id: 'cust-012',
    companyName: 'HyperScale Dynamics',
    domain: 'hyperscale.example',
    plan: 'pro',
    status: 'active',
    mrr: 4800,
    arr: 57600,
    seats: 64,
    startedAt: '2025-01-20',
    healthScore: 87,
    owner: 'Elena Rostova',
  },
  {
    id: 'cust-013',
    companyName: 'QuantumSoft',
    domain: 'quantumsoft.example',
    plan: 'pro',
    status: 'active',
    mrr: 4200,
    arr: 50400,
    seats: 55,
    startedAt: '2025-02-14',
    healthScore: 89,
    owner: 'Elena Rostova',
  },
  {
    id: 'cust-014',
    companyName: 'VectorPath',
    domain: 'vectorpath.example',
    plan: 'pro',
    status: 'active',
    mrr: 3800,
    arr: 45600,
    seats: 48,
    startedAt: '2025-03-10',
    healthScore: 85,
    owner: 'Marcus Chen',
  },
  {
    id: 'cust-015',
    companyName: 'NexusFlow Inc',
    domain: 'nexusflow.example',
    plan: 'pro',
    status: 'active',
    mrr: 3400,
    arr: 40800,
    seats: 44,
    startedAt: '2025-04-02',
    healthScore: 83,
    owner: 'Elena Rostova',
  },
  {
    id: 'cust-016',
    companyName: 'CloudSync HQ',
    domain: 'cloudsync.example',
    plan: 'pro',
    status: 'active',
    mrr: 3000,
    arr: 36000,
    seats: 38,
    startedAt: '2025-05-18',
    healthScore: 78,
    owner: 'Marcus Chen',
  },
  {
    id: 'cust-017',
    companyName: 'Synthetix Logic',
    domain: 'synthetix.example',
    plan: 'pro',
    status: 'active',
    mrr: 2600,
    arr: 31200,
    seats: 32,
    startedAt: '2025-06-25',
    healthScore: 86,
    owner: 'Alex Rivera',
  },
  {
    id: 'cust-018',
    companyName: 'PulseMetrics',
    domain: 'pulsemetrics.example',
    plan: 'pro',
    status: 'active',
    mrr: 2200,
    arr: 26400,
    seats: 28,
    startedAt: '2025-07-30',
    healthScore: 75,
    owner: 'Elena Rostova',
  },
  {
    id: 'cust-019',
    companyName: 'KubeMatrix',
    domain: 'kubematrix.example',
    plan: 'pro',
    status: 'active',
    mrr: 1600,
    arr: 19200,
    seats: 20,
    startedAt: '2026-10-10',
    healthScore: 82,
    owner: 'Marcus Chen',
  },
  {
    id: 'cust-020',
    companyName: 'CyberShield Labs',
    domain: 'cybershield.example',
    plan: 'pro',
    status: 'past_due',
    mrr: 1400,
    arr: 16800,
    seats: 18,
    startedAt: '2025-05-04',
    healthScore: 62,
    owner: 'Marcus Chen',
  },
  {
    id: 'cust-021',
    companyName: 'Beacon HealthTech',
    domain: 'beaconhealth.example',
    plan: 'pro',
    status: 'churned',
    mrr: 0,
    arr: 0,
    seats: 42,
    startedAt: '2025-02-18',
    churnedAt: '2026-09-30',
    healthScore: 31,
    owner: 'Elena Rostova',
  },

  // Starter Tier (8 accounts: 5 active, 1 past_due, 1 churned, 1 trialing)
  {
    id: 'cust-022',
    companyName: 'PixelForge Media',
    domain: 'pixelforge.example',
    plan: 'starter',
    status: 'active',
    mrr: 1200,
    arr: 14400,
    seats: 16,
    startedAt: '2025-04-12',
    healthScore: 82,
    owner: 'David Kim',
  },
  {
    id: 'cust-023',
    companyName: 'DevStream Studio',
    domain: 'devstream.example',
    plan: 'starter',
    status: 'active',
    mrr: 850,
    arr: 10200,
    seats: 12,
    startedAt: '2025-05-19',
    healthScore: 88,
    owner: 'David Kim',
  },
  {
    id: 'cust-024',
    companyName: 'OrbitLogistics',
    domain: 'orbitlogistics.example',
    plan: 'starter',
    status: 'active',
    mrr: 750,
    arr: 9000,
    seats: 10,
    startedAt: '2025-06-22',
    healthScore: 80,
    owner: 'David Kim',
  },
  {
    id: 'cust-025',
    companyName: 'Stratos Analytics',
    domain: 'stratosdata.example',
    plan: 'starter',
    status: 'active',
    mrr: 550,
    arr: 6600,
    seats: 8,
    startedAt: '2025-08-11',
    healthScore: 76,
    owner: 'David Kim',
  },
  {
    id: 'cust-026',
    companyName: 'StackCraft Labs',
    domain: 'stackcraft.example',
    plan: 'starter',
    status: 'active',
    mrr: 250,
    arr: 3000,
    seats: 6,
    startedAt: '2025-09-03',
    healthScore: 79,
    owner: 'David Kim',
  },
  {
    id: 'cust-027',
    companyName: 'FlowState Apps',
    domain: 'flowstate.example',
    plan: 'starter',
    status: 'past_due',
    mrr: 200,
    arr: 2400,
    seats: 5,
    startedAt: '2025-07-15',
    healthScore: 49,
    owner: 'David Kim',
  },
  {
    id: 'cust-028',
    companyName: 'NextGen Commerce',
    domain: 'nextgencommerce.example',
    plan: 'starter',
    status: 'churned',
    mrr: 0,
    arr: 0,
    seats: 9,
    startedAt: '2025-03-25',
    churnedAt: '2026-08-14',
    healthScore: 22,
    owner: 'David Kim',
  },
  {
    id: 'cust-029',
    companyName: 'AlphaSphere AI',
    domain: 'alphasphere.example',
    plan: 'starter',
    status: 'trialing',
    mrr: 0,
    arr: 0,
    seats: 8,
    startedAt: '2026-11-01',
    healthScore: 90,
    owner: 'David Kim',
  },
];

interface PlanMonthlyLedgerEntry {
  openingMrr: number;
  openingCustomers: number;
  newMrr: number;
  newCustomers: number;
  expansionMrr: number;
  contractionMrr: number;
  churnedMrr: number;
  churnedCustomers: number;
}

interface MonthlyLedgerRecord {
  month: string;
  label: string;
  starter: PlanMonthlyLedgerEntry;
  pro: PlanMonthlyLedgerEntry;
  enterprise: PlanMonthlyLedgerEntry;
}

/**
 * Deterministic shared historical ledger across 12 months up to 2026-11.
 * Ensures:
 * - openingMrr[t] === closingMrr[t-1]
 * - openingCustomers[t] === closingCustomers[t-1]
 * - netNewMrr = newMrr + expansionMrr - contractionMrr - churnedMrr
 * - closingMrr = openingMrr + netNewMrr
 * - closingCustomers = openingCustomers + newCustomers - churnedCustomers
 * - NDR = (openingMrr + expansionMrr - contractionMrr - churnedMrr) / openingMrr * 100
 */
const MONTHLY_LEDGER: MonthlyLedgerRecord[] = [
  // 1: 2025-12
  {
    month: '2025-12',
    label: 'Dez 25',
    starter: {
      openingMrr: 2000, openingCustomers: 4,
      newMrr: 400, newCustomers: 1,
      expansionMrr: 100, contractionMrr: 50, churnedMrr: 0, churnedCustomers: 0,
    },
    pro: {
      openingMrr: 18000, openingCustomers: 7,
      newMrr: 2800, newCustomers: 1,
      expansionMrr: 1000, contractionMrr: 400, churnedMrr: 0, churnedCustomers: 0,
    },
    enterprise: {
      openingMrr: 90000, openingCustomers: 5,
      newMrr: 15000, newCustomers: 1,
      expansionMrr: 5000, contractionMrr: 2000, churnedMrr: 0, churnedCustomers: 0,
    },
  },
  // 2: 2026-01
  {
    month: '2026-01',
    label: 'Jan 26',
    starter: {
      openingMrr: 2450, openingCustomers: 5,
      newMrr: 350, newCustomers: 1,
      expansionMrr: 150, contractionMrr: 50, churnedMrr: 300, churnedCustomers: 1,
    },
    pro: {
      openingMrr: 21400, openingCustomers: 8,
      newMrr: 2600, newCustomers: 1,
      expansionMrr: 1200, contractionMrr: 600, churnedMrr: 2000, churnedCustomers: 1,
    },
    enterprise: {
      openingMrr: 108000, openingCustomers: 6,
      newMrr: 0, newCustomers: 0,
      expansionMrr: 6000, contractionMrr: 2000, churnedMrr: 0, churnedCustomers: 0,
    },
  },
  // 3: 2026-02
  {
    month: '2026-02',
    label: 'Fev 26',
    starter: {
      openingMrr: 2600, openingCustomers: 5,
      newMrr: 400, newCustomers: 1,
      expansionMrr: 150, contractionMrr: 50, churnedMrr: 0, churnedCustomers: 0,
    },
    pro: {
      openingMrr: 22600, openingCustomers: 8,
      newMrr: 3000, newCustomers: 1,
      expansionMrr: 1400, contractionMrr: 500, churnedMrr: 0, churnedCustomers: 0,
    },
    enterprise: {
      openingMrr: 112000, openingCustomers: 6,
      newMrr: 12000, newCustomers: 1,
      expansionMrr: 6000, contractionMrr: 3000, churnedMrr: 0, churnedCustomers: 0,
    },
  },
  // 4: 2026-03
  {
    month: '2026-03',
    label: 'Mar 26',
    starter: {
      openingMrr: 3100, openingCustomers: 6,
      newMrr: 0, newCustomers: 0,
      expansionMrr: 200, contractionMrr: 100, churnedMrr: 400, churnedCustomers: 1,
    },
    pro: {
      openingMrr: 26500, openingCustomers: 9,
      newMrr: 2800, newCustomers: 1,
      expansionMrr: 1500, contractionMrr: 600, churnedMrr: 2200, churnedCustomers: 1,
    },
    enterprise: {
      openingMrr: 127000, openingCustomers: 7,
      newMrr: 0, newCustomers: 0,
      expansionMrr: 8000, contractionMrr: 3000, churnedMrr: 0, churnedCustomers: 0,
    },
  },
  // 5: 2026-04
  {
    month: '2026-04',
    label: 'Abr 26',
    starter: {
      openingMrr: 2800, openingCustomers: 5,
      newMrr: 500, newCustomers: 1,
      expansionMrr: 150, contractionMrr: 50, churnedMrr: 0, churnedCustomers: 0,
    },
    pro: {
      openingMrr: 28000, openingCustomers: 9,
      newMrr: 3200, newCustomers: 1,
      expansionMrr: 1600, contractionMrr: 500, churnedMrr: 0, churnedCustomers: 0,
    },
    enterprise: {
      openingMrr: 132000, openingCustomers: 7,
      newMrr: 15000, newCustomers: 1,
      expansionMrr: 7000, contractionMrr: 3000, churnedMrr: 0, churnedCustomers: 0,
    },
  },
  // 6: 2026-05
  {
    month: '2026-05',
    label: 'Mai 26',
    starter: {
      openingMrr: 3400, openingCustomers: 6,
      newMrr: 0, newCustomers: 0,
      expansionMrr: 200, contractionMrr: 100, churnedMrr: 450, churnedCustomers: 1,
    },
    pro: {
      openingMrr: 32300, openingCustomers: 10,
      newMrr: 2400, newCustomers: 1,
      expansionMrr: 1800, contractionMrr: 700, churnedMrr: 2800, churnedCustomers: 1,
    },
    enterprise: {
      openingMrr: 151000, openingCustomers: 8,
      newMrr: 0, newCustomers: 0,
      expansionMrr: 9000, contractionMrr: 4000, churnedMrr: 0, churnedCustomers: 0,
    },
  },
  // 7: 2026-06
  {
    month: '2026-06',
    label: 'Jun 26',
    starter: {
      openingMrr: 3050, openingCustomers: 5,
      newMrr: 450, newCustomers: 1,
      expansionMrr: 150, contractionMrr: 50, churnedMrr: 0, churnedCustomers: 0,
    },
    pro: {
      openingMrr: 33000, openingCustomers: 10,
      newMrr: 3000, newCustomers: 1,
      expansionMrr: 1600, contractionMrr: 600, churnedMrr: 0, churnedCustomers: 0,
    },
    enterprise: {
      openingMrr: 156000, openingCustomers: 8,
      newMrr: 0, newCustomers: 0,
      expansionMrr: 8000, contractionMrr: 3000, churnedMrr: 0, churnedCustomers: 0,
    },
  },
  // 8: 2026-07
  {
    month: '2026-07',
    label: 'Jul 26',
    starter: {
      openingMrr: 3600, openingCustomers: 6,
      newMrr: 350, newCustomers: 1,
      expansionMrr: 200, contractionMrr: 100, churnedMrr: 350, churnedCustomers: 1,
    },
    pro: {
      openingMrr: 37000, openingCustomers: 11,
      newMrr: 0, newCustomers: 0,
      expansionMrr: 1700, contractionMrr: 800, churnedMrr: 3000, churnedCustomers: 1,
    },
    enterprise: {
      openingMrr: 161000, openingCustomers: 8,
      newMrr: 0, newCustomers: 0,
      expansionMrr: 7000, contractionMrr: 4000, churnedMrr: 0, churnedCustomers: 0,
    },
  },
  // 9: 2026-08
  {
    month: '2026-08',
    label: 'Ago 26',
    starter: {
      openingMrr: 3700, openingCustomers: 6,
      newMrr: 450, newCustomers: 1,
      expansionMrr: 150, contractionMrr: 200, churnedMrr: 750, churnedCustomers: 1, // NextGen Commerce churns
    },
    pro: {
      openingMrr: 34900, openingCustomers: 10,
      newMrr: 2600, newCustomers: 1,
      expansionMrr: 1800, contractionMrr: 700, churnedMrr: 0, churnedCustomers: 0,
    },
    enterprise: {
      openingMrr: 164000, openingCustomers: 8,
      newMrr: 0, newCustomers: 0,
      expansionMrr: 6000, contractionMrr: 3000, churnedMrr: 0, churnedCustomers: 0,
    },
  },
  // 10: 2026-09
  {
    month: '2026-09',
    label: 'Set 26',
    starter: {
      openingMrr: 3350, openingCustomers: 6,
      newMrr: 250, newCustomers: 1,
      expansionMrr: 300, contractionMrr: 50, churnedMrr: 0, churnedCustomers: 0,
    },
    pro: {
      openingMrr: 38600, openingCustomers: 11,
      newMrr: 0, newCustomers: 0,
      expansionMrr: 1600, contractionMrr: 600, churnedMrr: 3800, churnedCustomers: 1, // Beacon HealthTech churns
    },
    enterprise: {
      openingMrr: 167000, openingCustomers: 8,
      newMrr: 0, newCustomers: 0,
      expansionMrr: 8000, contractionMrr: 4000, churnedMrr: 0, churnedCustomers: 0,
    },
  },
  // 11: 2026-10
  {
    month: '2026-10',
    label: 'Out 26',
    starter: {
      openingMrr: 3850, openingCustomers: 7,
      newMrr: 0, newCustomers: 0,
      expansionMrr: 150, contractionMrr: 100, churnedMrr: 400, churnedCustomers: 1,
    },
    pro: {
      openingMrr: 35800, openingCustomers: 10,
      newMrr: 1600, newCustomers: 1, // KubeMatrix new
      expansionMrr: 1200, contractionMrr: 600, churnedMrr: 5600, churnedCustomers: 1,
    },
    enterprise: {
      openingMrr: 171000, openingCustomers: 8,
      newMrr: 5000, newCustomers: 1, // GlobalLogix new
      expansionMrr: 4000, contractionMrr: 2000, churnedMrr: 14000, churnedCustomers: 1, // DataVanguard churns
    },
  },
  // 12: 2026-11
  {
    month: '2026-11',
    label: 'Nov 26',
    starter: {
      openingMrr: 3500, openingCustomers: 6,
      newMrr: 200, newCustomers: 0,
      expansionMrr: 200, contractionMrr: 100, churnedMrr: 0, churnedCustomers: 0,
    },
    pro: {
      openingMrr: 32400, openingCustomers: 10,
      newMrr: 0, newCustomers: 0,
      expansionMrr: 800, contractionMrr: 800, churnedMrr: 0, churnedCustomers: 0,
    },
    enterprise: {
      openingMrr: 164000, openingCustomers: 8,
      newMrr: 0, newCustomers: 0,
      expansionMrr: 5000, contractionMrr: 25000, churnedMrr: 0, churnedCustomers: 0,
    },
  },
];

function buildPlanMetricPoint(month: string, label: string, p: PlanMonthlyLedgerEntry): MonthlyMetricPoint {
  const netNewMrr = Number((p.newMrr + p.expansionMrr - p.contractionMrr - p.churnedMrr).toFixed(2));
  const mrr = Number((p.openingMrr + netNewMrr).toFixed(2));
  const arr = Number((mrr * 12).toFixed(2));
  const activeCustomers = p.openingCustomers + p.newCustomers - p.churnedCustomers;

  const logoChurnRate = p.openingCustomers > 0
    ? Number(((p.churnedCustomers / p.openingCustomers) * 100).toFixed(2))
    : 0;

  const revenueChurnRate = p.openingMrr > 0
    ? Number(((p.churnedMrr / p.openingMrr) * 100).toFixed(2))
    : 0;

  const ndr = p.openingMrr > 0
    ? Number((((p.openingMrr + p.expansionMrr - p.contractionMrr - p.churnedMrr) / p.openingMrr) * 100).toFixed(2))
    : 100;

  return {
    month,
    label,
    mrr,
    arr,
    newMrr: p.newMrr,
    expansionMrr: p.expansionMrr,
    contractionMrr: p.contractionMrr,
    churnedMrr: p.churnedMrr,
    netNewMrr,
    activeCustomers,
    logoChurnRate,
    revenueChurnRate,
    ndr,
  };
}

/**
 * Historical monthly series partitioned by plan tier.
 */
export const PLAN_MONTHLY_SERIES: Record<PlanTier, MonthlyMetricPoint[]> = {
  starter: MONTHLY_LEDGER.map(rec => buildPlanMetricPoint(rec.month, rec.label, rec.starter)),
  pro: MONTHLY_LEDGER.map(rec => buildPlanMetricPoint(rec.month, rec.label, rec.pro)),
  enterprise: MONTHLY_LEDGER.map(rec => buildPlanMetricPoint(rec.month, rec.label, rec.enterprise)),
};

/**
 * 12 Consecutive Historical Months for the global company.
 * Exactly equals the sum of Starter, Pro, and Enterprise tiers at each month.
 * Rates are strictly derived from combined opening MRR and opening customer counts.
 */
export const MOCK_MONTHLY_SERIES: MonthlyMetricPoint[] = MONTHLY_LEDGER.map(rec => {
  const s = rec.starter;
  const p = rec.pro;
  const e = rec.enterprise;

  const openingMrr = s.openingMrr + p.openingMrr + e.openingMrr;
  const openingCustomers = s.openingCustomers + p.openingCustomers + e.openingCustomers;

  const newMrr = s.newMrr + p.newMrr + e.newMrr;
  const expansionMrr = s.expansionMrr + p.expansionMrr + e.expansionMrr;
  const contractionMrr = s.contractionMrr + p.contractionMrr + e.contractionMrr;
  const churnedMrr = s.churnedMrr + p.churnedMrr + e.churnedMrr;

  const netNewMrr = Number((newMrr + expansionMrr - contractionMrr - churnedMrr).toFixed(2));
  const mrr = Number((openingMrr + netNewMrr).toFixed(2));
  const arr = Number((mrr * 12).toFixed(2));

  const newCustomers = s.newCustomers + p.newCustomers + e.newCustomers;
  const churnedCustomers = s.churnedCustomers + p.churnedCustomers + e.churnedCustomers;
  const activeCustomers = openingCustomers + newCustomers - churnedCustomers;

  const logoChurnRate = openingCustomers > 0
    ? Number(((churnedCustomers / openingCustomers) * 100).toFixed(2))
    : 0;

  const revenueChurnRate = openingMrr > 0
    ? Number(((churnedMrr / openingMrr) * 100).toFixed(2))
    : 0;

  const ndr = openingMrr > 0
    ? Number((((openingMrr + expansionMrr - contractionMrr - churnedMrr) / openingMrr) * 100).toFixed(2))
    : 100;

  return {
    month: rec.month,
    label: rec.label,
    mrr,
    arr,
    newMrr,
    expansionMrr,
    contractionMrr,
    churnedMrr,
    netNewMrr,
    activeCustomers,
    logoChurnRate,
    revenueChurnRate,
    ndr,
  };
});

/**
 * 13 Recent MRR Movement Events.
 * deltaMrr is positive for new/expansion/reactivation, negative for contraction/churn.
 * Enforces: previousMrr + deltaMrr === currentMrr.
 * All dates <= asOfDate (2026-11-05).
 * Aligned with customer fixture statuses (no new MRR for trialing customers; churned accounts end at $0).
 */
export const MOCK_MOVEMENTS: MrrMovementEvent[] = [
  {
    id: 'mov-001',
    date: '2026-11-03',
    companyName: 'Apex Security',
    plan: 'enterprise',
    type: 'expansion',
    deltaMrr: 5000,
    previousMrr: 30000,
    currentMrr: 35000,
  },
  {
    id: 'mov-002',
    date: '2026-10-25',
    companyName: 'TechCorp Global',
    plan: 'enterprise',
    type: 'expansion',
    deltaMrr: 4000,
    previousMrr: 20000,
    currentMrr: 24000,
  },
  {
    id: 'mov-003',
    date: '2026-10-20',
    companyName: 'Velocity AI',
    plan: 'pro',
    type: 'expansion',
    deltaMrr: 1200,
    previousMrr: 4200,
    currentMrr: 5400,
  },
  {
    id: 'mov-004',
    date: '2026-10-18',
    companyName: 'DataVanguard',
    plan: 'enterprise',
    type: 'churn',
    deltaMrr: -14000,
    previousMrr: 14000,
    currentMrr: 0,
  },
  {
    id: 'mov-005',
    date: '2026-10-15',
    companyName: 'GlobalLogix',
    plan: 'enterprise',
    type: 'new',
    deltaMrr: 5000,
    previousMrr: 0,
    currentMrr: 5000,
  },
  {
    id: 'mov-006',
    date: '2026-10-10',
    companyName: 'KubeMatrix',
    plan: 'pro',
    type: 'new',
    deltaMrr: 1600,
    previousMrr: 0,
    currentMrr: 1600,
  },
  {
    id: 'mov-007',
    date: '2026-10-08',
    companyName: 'CloudSync HQ',
    plan: 'pro',
    type: 'contraction',
    deltaMrr: -600,
    previousMrr: 3600,
    currentMrr: 3000,
  },
  {
    id: 'mov-008',
    date: '2026-09-30',
    companyName: 'Beacon HealthTech',
    plan: 'pro',
    type: 'churn',
    deltaMrr: -3800,
    previousMrr: 3800,
    currentMrr: 0,
  },
  {
    id: 'mov-009',
    date: '2026-09-15',
    companyName: 'Acme Cloud',
    plan: 'enterprise',
    type: 'reactivation',
    deltaMrr: 15000,
    previousMrr: 0,
    currentMrr: 15000,
  },
  {
    id: 'mov-010',
    date: '2026-09-12',
    companyName: 'PixelForge Media',
    plan: 'starter',
    type: 'expansion',
    deltaMrr: 300,
    previousMrr: 900,
    currentMrr: 1200,
  },
  {
    id: 'mov-011',
    date: '2026-09-02',
    companyName: 'Synthetix Logic',
    plan: 'pro',
    type: 'reactivation',
    deltaMrr: 2600,
    previousMrr: 0,
    currentMrr: 2600,
  },
  {
    id: 'mov-012',
    date: '2026-08-28',
    companyName: 'Stratos Analytics',
    plan: 'starter',
    type: 'contraction',
    deltaMrr: -200,
    previousMrr: 750,
    currentMrr: 550,
  },
  {
    id: 'mov-013',
    date: '2026-08-14',
    companyName: 'NextGen Commerce',
    plan: 'starter',
    type: 'churn',
    deltaMrr: -750,
    previousMrr: 750,
    currentMrr: 0,
  },
];

/**
 * Computes executive SaaS financial KPIs based on customers and historical monthly series.
 * - Current recognized MRR is computed from active and past_due customer subscriptions.
 * - Empty customer inputs strictly evaluate to $0 MRR and 0 customers (does not resurrect global MRR).
 * - Finite 0 sentinel is used for LTV when churn rate is 0 (prevents division by zero or synthetic rates).
 * - Gross Margin (84.2%) and CAC Payback (11.5 mo) are documented explicit simulation assumptions.
 * - All metrics are rounded to 2 decimal places.
 */
export function calculateMrrMetrics(
  customers: CustomerSubscription[],
  monthlySeries: MonthlyMetricPoint[]
): FinancialDashboardSummary {
  // Policy: recognized accounts are active + past_due
  const recognizedCustomers = customers.filter(isRecognizedCustomer);
  const activeCustomers = recognizedCustomers.length;

  // Empty customers list yields $0 MRR and 0 active accounts (never resurrects global values)
  const currentMrr = activeCustomers > 0
    ? Number(recognizedCustomers.reduce((sum, c) => sum + c.mrr, 0).toFixed(2))
    : 0;

  const currentArr = Number((currentMrr * 12).toFixed(2));

  const latestMonth = monthlySeries.length > 0 ? monthlySeries[monthlySeries.length - 1] : null;
  const prevMonth = monthlySeries.length > 1 ? monthlySeries[monthlySeries.length - 2] : null;

  // MoM growth derived from series
  const mrrGrowthMoM = latestMonth && prevMonth && prevMonth.mrr > 0
    ? Number((((latestMonth.mrr - prevMonth.mrr) / prevMonth.mrr) * 100).toFixed(2))
    : 0;

  const netNewMrr = latestMonth ? Number(latestMonth.netNewMrr.toFixed(2)) : 0;

  // Documented simulation assumption: standard high-efficiency B2B SaaS gross margin
  const grossMargin = 84.2;

  // Documented simulation assumption: standard B2B SaaS CAC payback in months
  const cacPaybackMonths = 11.5;

  const logoChurnRate = latestMonth
    ? Number(latestMonth.logoChurnRate.toFixed(2))
    : 0;

  const netRevenueRetention = latestMonth
    ? Number(latestMonth.ndr.toFixed(2))
    : 100;

  const arpu = activeCustomers > 0
    ? Number((currentMrr / activeCustomers).toFixed(2))
    : 0;

  // LTV = (ARPU * Gross Margin) / Logo Churn Rate.
  // If logoChurnRate is 0 or ARPU is 0, returns documented finite sentinel 0 (not a synthetic fallback).
  const monthlyChurnDecimal = logoChurnRate / 100;
  const marginDecimal = grossMargin / 100;
  const ltv = monthlyChurnDecimal > 0 && arpu > 0
    ? Number(((arpu * marginDecimal) / monthlyChurnDecimal).toFixed(2))
    : 0;

  return {
    currentMrr,
    mrrGrowthMoM,
    currentArr,
    netNewMrr,
    grossMargin,
    logoChurnRate,
    netRevenueRetention,
    arpu,
    ltv,
    cacPaybackMonths,
    activeCustomers,
  };
}

/**
 * Calculates breakdown across Starter, Pro, and Enterprise tiers.
 * Computes customer share, MRR share percentage, plan ARPU, and plan churn rate.
 * Adheres strictly to the active + past_due recognition policy for billable accounts.
 */
export function calculatePlanBreakdown(customers: CustomerSubscription[]): PlanBreakdown[] {
  const tiers: { plan: PlanTier; label: string }[] = [
    { plan: 'starter', label: 'Starter' },
    { plan: 'pro', label: 'Pro' },
    { plan: 'enterprise', label: 'Enterprise' },
  ];

  const totalRecognized = customers.filter(isRecognizedCustomer);
  const totalMrr = totalRecognized.reduce((sum, c) => sum + c.mrr, 0);

  return tiers.map(tier => {
    const tierAllCustomers = customers.filter(c => c.plan === tier.plan);
    const tierRecognized = tierAllCustomers.filter(isRecognizedCustomer);
    const tierChurned = tierAllCustomers.filter(c => c.status === 'churned');

    const mrr = Number(tierRecognized.reduce((sum, c) => sum + c.mrr, 0).toFixed(2));
    const count = tierRecognized.length;
    const sharePercentage = totalMrr > 0 ? Number(((mrr / totalMrr) * 100).toFixed(2)) : 0;
    const arpu = count > 0 ? Number((mrr / count).toFixed(2)) : 0;
    const churnRate = tierAllCustomers.length > 0
      ? Number(((tierChurned.length / tierAllCustomers.length) * 100).toFixed(2))
      : 0;

    return {
      plan: tier.plan,
      label: tier.label,
      customers: count,
      mrr,
      sharePercentage,
      arpu,
      churnRate,
    };
  });
}

/**
 * Returns complete dashboard payload filtered by plan and time horizon (6 or 12 months).
 * Slices the corresponding plan-specific or global monthly series so that charts and KPIs agree.
 */
export function getDashboardData(
  filterPlan: PlanTier | 'all' = 'all',
  periodMonths: 6 | 12 = 12
): DashboardDataPayload {
  const filteredCustomers = filterPlan === 'all'
    ? MOCK_CUSTOMERS
    : MOCK_CUSTOMERS.filter(c => c.plan === filterPlan);

  const filteredMovements = filterPlan === 'all'
    ? MOCK_MOVEMENTS
    : MOCK_MOVEMENTS.filter(m => m.plan === filterPlan);

  const seriesSource = filterPlan === 'all'
    ? MOCK_MONTHLY_SERIES
    : PLAN_MONTHLY_SERIES[filterPlan];

  const slicedSeries = seriesSource.slice(-periodMonths);
  const summary = calculateMrrMetrics(filteredCustomers, slicedSeries);
  const planBreakdown = calculatePlanBreakdown(filteredCustomers);

  return {
    asOfDate: '2026-11-05',
    currency: 'USD',
    summary,
    monthlySeries: slicedSeries,
    recentMovements: filteredMovements,
    customers: filteredCustomers,
    planBreakdown,
  };
}

/**
 * Asynchronous wrapper for fetching dashboard data.
 */
export async function fetchDashboardData(
  filterPlan: PlanTier | 'all' = 'all',
  periodMonths: 6 | 12 = 12
): Promise<DashboardDataPayload> {
  return Promise.resolve(getDashboardData(filterPlan, periodMonths));
}
