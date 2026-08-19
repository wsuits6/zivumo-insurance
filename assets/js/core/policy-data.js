const POLICY_TYPES = {
    'Education Policy': 'Comprehensive coverage for tuition fees, educational materials, and related expenses to ensure uninterrupted learning.',
    'Health Policy': 'Full medical coverage including hospitalization, outpatient services, specialist consultations, and emergency care.',
    'Property Policy': 'Protection against physical damage or loss to residential or commercial buildings and their contents.',
    'Business Policy': 'Integrated risk management for enterprises, covering assets, liability, and business interruption.',
    'Motor Policy': 'Mandatory and optional coverage for vehicles against accidents, theft, and third-party liability.',
    'Travel Policy': 'Global protection for trip cancellations, medical emergencies abroad, and lost baggage.',
    'Life Policy': 'Financial security for beneficiaries in the event of death, with options for savings and investment components.',
    'Funeral Policy': 'Immediate financial assistance to cover burial and memorial service costs, easing the burden on families.',
    'Disability Policy': 'Income replacement and support services for individuals unable to work due to injury or illness.',
    'Marine Policy': 'Coverage for cargo, vessels, and liabilities related to inland and international shipping.',
    'Corporate Policy': 'Specialized risk solutions tailored for large organizations, including group schemes and executive protection.'
};

const POLICY_BASE_RATES = {
    'Health Policy':      { rate: 600,   unit: 'annual' },
    'Business Policy':    { rate: 2000,  unit: 'annual' },
    'Education Policy':   { rate: 1000,  unit: 'annual' },
    'Motor Policy':       { rate: 500,   unit: 'annual' },
    'Life Policy':        { rate: 800,   unit: 'annual' },
    'Property Policy':    { rate: 1300,  unit: 'annual' },
    'Corporate Policy':   { rate: 4000,  unit: 'annual' },
    'Disability Policy':  { rate: 400,   unit: 'annual' },
    'Funeral Policy':     { rate: 160,   unit: 'monthly' },
    'Travel Policy':      { rate: 130,   unit: 'monthly' },
    'Marine Policy':      { rate: 1500,  unit: 'monthly' }
};

function calcPolicyTotalAmount(policyType, startDate, endDate) {
    const config = POLICY_BASE_RATES[policyType];
    if (!config || !startDate || !endDate) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end - start;
    if (diffMs <= 0) return null;

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

if (typeof window !== 'undefined') {
    window.POLICY_TYPES = POLICY_TYPES;
    window.POLICY_BASE_RATES = POLICY_BASE_RATES;
    window.calcPolicyTotalAmount = calcPolicyTotalAmount;
}
