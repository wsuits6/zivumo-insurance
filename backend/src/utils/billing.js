/* Server-side billing rates - mirrors assets/js/core/policy-data.js.
   Never trust client-submitted amounts; premiums are always recomputed here. */

const POLICY_BASE_RATES = {
  'Health Policy': { rate: 600, unit: 'annual' },
  'Business Policy': { rate: 2000, unit: 'annual' },
  'Education Policy': { rate: 1000, unit: 'annual' },
  'Motor Policy': { rate: 500, unit: 'annual' },
  'Life Policy': { rate: 800, unit: 'annual' },
  'Property Policy': { rate: 1300, unit: 'annual' },
  'Corporate Policy': { rate: 4000, unit: 'annual' },
  'Disability Policy': { rate: 400, unit: 'annual' },
  'Funeral Policy': { rate: 160, unit: 'monthly' },
  'Travel Policy': { rate: 130, unit: 'monthly' },
  'Marine Policy': { rate: 1500, unit: 'monthly' }
};

function calcPolicyTotalAmount(policyType, startDate, endDate) {
  const config = POLICY_BASE_RATES[policyType];
  if (!config || !startDate || !endDate) return null;

  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end - start;
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || diffMs <= 0) return null;

  let total;
  if (config.unit === 'annual') {
    const years = diffMs / (365.25 * 24 * 60 * 60 * 1000);
    total = config.rate * years;
  } else {
    const months = diffMs / (30.4375 * 24 * 60 * 60 * 1000);
    total = config.rate * months;
  }
  return Math.round(total * 100) / 100;
}

function buildPolicyRecord(db, userId, draft) {
  const id = getNextIdSafe(db.policies);
  const year = new Date(draft.startDate).getFullYear() || new Date().getFullYear();
  const policyNumber = `${draft.type.replace(/\s+/g, '').slice(0, 4).toUpperCase()}-${year}-${id}`;
  return {
    id,
    userId,
    type: draft.type,
    policyNumber,
    status: 'active',
    coverage: draft.coverage,
    startDate: draft.startDate,
    endDate: draft.endDate,
    premium: draft.premium,
    currency: 'GHS'
  };
}

function getNextIdSafe(items) {
  if (!items || items.length === 0) return 1;
  return Math.max(...items.map((item) => item.id || 0)) + 1;
}

module.exports = { POLICY_BASE_RATES, calcPolicyTotalAmount, buildPolicyRecord, getNextIdSafe };
