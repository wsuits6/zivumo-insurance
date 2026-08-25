const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb, getNextId } = require('../db');
const { requireAdmin, signToken } = require('../middleware/auth');

const ADMIN_PASSWORD_SEED = process.env.ADMIN_PASSWORD_SEED || '';
const ADMIN_PASSWORD_HASH = ADMIN_PASSWORD_SEED ? bcrypt.hashSync(ADMIN_PASSWORD_SEED, 10) : null;

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const POLICY_CATALOG_TYPES = [
  'Education Policy',
  'Health Policy',
  'Property Policy',
  'Business Policy',
  'Motor Policy',
  'Travel Policy',
  'Life Policy',
  'Funeral Policy',
  'Disability Policy',
  'Marine Policy',
  'Corporate Policy'
];

function createAdminRouter() {
  const router = express.Router();

  router.post('/login', asyncHandler(async (req, res) => {
    const password = String(req.body.password || '');
    if (!ADMIN_PASSWORD_SEED || !ADMIN_PASSWORD_HASH) {
      return res.status(500).json({ ok: false, message: 'Admin password seed not configured' });
    }
    if (!password) {
      return res.status(422).json({ ok: false, message: 'Admin password is required' });
    }
    const ok = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!ok) {
      return res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }
    const token = signToken({ role: 'admin' });
    return res.json({ ok: true, message: 'Admin authenticated', token });
  }));

  router.post('/logout', (_req, res) => {
    return res.json({ ok: true, message: 'Logged out' });
  });

  router.get('/me', requireAdmin, (_req, res) => {
    res.json({ ok: true, data: { role: 'admin' } });
  });

  router.get('/summary', requireAdmin, asyncHandler(async (_req, res) => {
    const db = getDb();
    const activePolicies = db.policies.filter((p) => p.status === 'active').length;
    const purchasedTypes = new Set(
      db.policies.map((p) => String(p.type || '').trim().toLowerCase())
    );
    const inactivePolicies = POLICY_CATALOG_TYPES.filter(
      (type) => !purchasedTypes.has(type.toLowerCase())
    ).length;
    res.json({
      ok: true,
      data: {
        totalUsers: db.users.length,
        totalPolicies: db.policies.length,
        activePolicies,
        inactivePolicies,
        totalPremium: db.policies.reduce((sum, p) => sum + (Number(p.premium) || 0), 0).toFixed(2)
      }
    });
  }));

  router.get('/users', requireAdmin, asyncHandler(async (_req, res) => {
    const db = getDb();
    const users = db.users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      policies: db.policies.filter((p) => p.userId === user.id).length,
      archived: user.archived || false
    }));
    res.json({ ok: true, data: users });
  }));

  router.get('/policies', requireAdmin, asyncHandler(async (_req, res) => {
    const db = getDb();
    const policies = db.policies.map((policy) => {
      const owner = db.users.find((u) => u.id === policy.userId);
      return { ...policy, userName: owner ? owner.name : 'Unknown', userEmail: owner ? owner.email : 'Unknown' };
    });
    res.json({ ok: true, data: policies });
  }));

  router.post('/policies/:id/status', requireAdmin, asyncHandler(async (req, res) => {
    const policyId = Number(req.params.id);
    const status = String(req.body.status || '').trim();
    if (!new Set(['active', 'pending_renewal', 'cancelled']).has(status)) {
      return res.status(422).json({ ok: false, message: 'Invalid status' });
    }
    const db = getDb();
    const policy = db.policies.find((p) => p.id === policyId);
    if (!policy) return res.status(404).json({ ok: false, message: 'Policy not found' });
    policy.status = status;
    return res.json({ ok: true, data: policy, message: 'Policy status updated' });
  }));

  router.post('/users', requireAdmin, asyncHandler(async (req, res) => {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!name || !email) return res.status(422).json({ ok: false, message: 'Name and email are required' });
    if (!password || password.length < 6) return res.status(422).json({ ok: false, message: 'Password must be at least 6 characters' });
    const db = getDb();
    if (db.users.find((u) => u.email === email)) return res.status(409).json({ ok: false, message: 'User already exists' });
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = { id: getNextId(db.users), name, email, passwordHash, phone: '', address: '', preferences: { renewals: true, claims: true, announcements: false } };
    db.users.push(newUser);
    return res.status(201).json({ ok: true, data: { id: newUser.id, name, email }, message: 'User created successfully' });
  }));

  router.post('/users/:id/delete', requireAdmin, asyncHandler(async (req, res) => {
    const userId = Number(req.params.id);
    const db = getDb();
    const index = db.users.findIndex((u) => u.id === userId);
    if (index === -1) return res.status(404).json({ ok: false, message: 'User not found' });
    db.users.splice(index, 1);
    db.policies = db.policies.filter((p) => p.userId !== userId);
    return res.json({ ok: true, message: 'User deleted successfully' });
  }));

  router.post('/users/:id/archive', requireAdmin, asyncHandler(async (req, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === Number(req.params.id));
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });
    user.archived = true;
    return res.json({ ok: true, data: { id: user.id }, message: 'User archived successfully' });
  }));

  router.post('/users/:id/restore', requireAdmin, asyncHandler(async (req, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === Number(req.params.id));
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });
    user.archived = false;
    return res.json({ ok: true, data: { id: user.id }, message: 'User restored successfully' });
  }));

  router.post('/policies/:id/delete', requireAdmin, asyncHandler(async (req, res) => {
    const db = getDb();
    const index = db.policies.findIndex((p) => p.id === Number(req.params.id));
    if (index === -1) return res.status(404).json({ ok: false, message: 'Policy not found' });
    db.policies.splice(index, 1);
    return res.json({ ok: true, message: 'Policy deleted successfully' });
  }));

  router.post('/policies/:id/archive', requireAdmin, asyncHandler(async (req, res) => {
    const db = getDb();
    const policy = db.policies.find((p) => p.id === Number(req.params.id));
    if (!policy) return res.status(404).json({ ok: false, message: 'Policy not found' });
    policy.archived = true;
    return res.json({ ok: true, data: { id: policy.id }, message: 'Policy archived successfully' });
  }));

  router.post('/policies/:id/restore', requireAdmin, asyncHandler(async (req, res) => {
    const db = getDb();
    const policy = db.policies.find((p) => p.id === Number(req.params.id));
    if (!policy) return res.status(404).json({ ok: false, message: 'Policy not found' });
    policy.archived = false;
    return res.json({ ok: true, data: { id: policy.id }, message: 'Policy restored successfully' });
  }));

  router.post('/assign-policy', requireAdmin, asyncHandler(async (req, res) => {
    const { userId, type, coverage, startDate, endDate, premium } = req.body;
    if (!userId || !type || !coverage || !startDate || !endDate || !premium) {
      return res.status(422).json({ ok: false, message: 'Missing required policy fields' });
    }
    const db = getDb();
    if (!db.users.find((u) => u.id === Number(userId))) return res.status(404).json({ ok: false, message: 'User not found' });
    const id = getNextId(db.policies);
    const year = new Date(startDate).getFullYear();
    const policyNumber = `${type.replace(/\s+/g, '').slice(0, 4).toUpperCase()}-${year}-${id}`;
    const policy = { id, userId: Number(userId), type, policyNumber, status: 'active', coverage, startDate, endDate, premium: Number(premium), currency: 'GHS' };
    db.policies.push(policy);
    return res.status(201).json({ ok: true, data: policy, message: 'Policy assigned successfully' });
  }));

  router.get('/reports/summary', requireAdmin, async (_req, res) => {
    try {
      const db = getDb();
      const policies = db.policies || [];
      const users = db.users || [];
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const policiesByMonth = {};
      policies.forEach((p) => {
        const d = new Date(p.startDate);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        if (!policiesByMonth[key]) policiesByMonth[key] = { label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`, count: 0, premium: 0 };
        policiesByMonth[key].count += 1;
        policiesByMonth[key].premium += Number(p.premium) || 0;
      });
      const sortedMonthKeys = Object.keys(policiesByMonth).sort();
      const policiesPerMonth = sortedMonthKeys.map((k) => ({ month: policiesByMonth[k].label, count: policiesByMonth[k].count }));
      const premiumPerMonth = sortedMonthKeys.map((k) => ({ month: policiesByMonth[k].label, total: Number(policiesByMonth[k].premium.toFixed(2)) }));
      const usersPerMonth = {};
      users.forEach((u) => {
        const d = new Date(Date.UTC(2026,0,1));
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        if (!usersPerMonth[key]) usersPerMonth[key] = { label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`, count: 0 };
        usersPerMonth[key].count += 1;
      });
      const typeCounts = {};
      policies.forEach((p) => { const t = p.type||'Unknown'; typeCounts[t] = (typeCounts[t]||0)+1; });
      const policyTypeDistribution = Object.entries(typeCounts).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
      const statusCounts = {};
      policies.forEach((p) => { const s = p.status||'unknown'; statusCounts[s] = (statusCounts[s]||0)+1; });
      const policyStatusBreakdown = Object.entries(statusCounts).map(([name,value])=>({name,value}));
      let activeUsers=0, archivedUsers=0;
      users.forEach((u)=>{ if(u.archived) archivedUsers++; else activeUsers++; });
      const totalUsers=users.length, totalPolicies=policies.length;
      const activePolicies=policies.filter(p=>p.status==='active').length;
      const pendingPolicies=policies.filter(p=>p.status==='pending_renewal').length;
      const cancelledPolicies=policies.filter(p=>p.status==='cancelled').length;
      const totalPremium=policies.reduce((s,p)=>s+(Number(p.premium)||0),0);
      const summaryLines = [];
      if (totalPolicies===0) { summaryLines.push('No policies have been created yet.'); }
      else {
        if (policyTypeDistribution.length>0) { const top=policyTypeDistribution[0]; summaryLines.push(`Most popular: "${top.name}" (${top.value} policies).`); }
        if (sortedMonthKeys.length>=2) {
          const latest=policiesByMonth[sortedMonthKeys[sortedMonthKeys.length-1]], prev=policiesByMonth[sortedMonthKeys[sortedMonthKeys.length-2]];
          if (prev.count>0) { const change=(((latest.count-prev.count)/prev.count)*100).toFixed(1); summaryLines.push(`Signups ${latest.count>=prev.count?'increased':'decreased'} by ${Math.abs(change)}%.`); }
        }
        summaryLines.push(`${activePolicies}/${totalPolicies} active. Total premium: GHS ${totalPremium.toFixed(2)}.`);
      }
      if (totalUsers>0) summaryLines.push(`${activeUsers}/${totalUsers} users active.`);
      res.json({ ok:true, data:{ policiesPerMonth, premiumPerMonth, usersPerMonth, policyTypeDistribution, policyStatusBreakdown, userStatusDistribution:[{name:'Active',value:activeUsers},{name:'Archived',value:archivedUsers}], totals:{totalUsers,totalPolicies,activePolicies,pendingPolicies,cancelledPolicies,totalPremium:Number(totalPremium.toFixed(2))}, summaryLines }});
    } catch (err) {
      res.status(500).json({ ok:false, message:'Failed to generate report data' });
    }
  });

  return router;
}

module.exports = createAdminRouter;
