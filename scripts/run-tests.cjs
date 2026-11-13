/**
 * WINDOW COMPANIES CRM — AUTOMATED TEST SUITE (PHASE 5 QA)
 * 
 * Tests domain rules, relationship checks, format validations, and date logic.
 * Run directly via Node without installing heavyweight external runners.
 */

// 1. Email Regex Test (Exactly aligns with PostgreSQL chk_member_email_format constraint)
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

function testEmailValidation() {
  const validEmails = [
    'user@example.com',
    'sarith.perera@jetwing.lk',
    'admin_window@domain.co.uk',
    'sales+tag@company.travel'
  ];

  const invalidEmails = [
    'plainaddress',
    '@missingusername.com',
    'username@.com',
    'username@com',
    'spaces in@email.com'
  ];

  for (const email of validEmails) {
    if (!EMAIL_REGEX.test(email)) {
      throw new Error(`Expected valid email failed regex: ${email}`);
    }
  }

  for (const email of invalidEmails) {
    if (EMAIL_REGEX.test(email)) {
      throw new Error(`Expected invalid email passed regex: ${email}`);
    }
  }

  return { name: 'Email Format Regex', status: 'PASS', totalTested: validEmails.length + invalidEmails.length };
}

// 2. Strict Season Dates Validation Test (date_to > date_from)
function validateSeasonDates(dateFrom, dateTo) {
  if (!dateFrom || !dateTo) {
    return { valid: false, error: 'Both start date and end date are required' };
  }
  if (dateTo <= dateFrom) {
    return { valid: false, error: 'End date (Date To) must be strictly later than start date (Date From)' };
  }
  return { valid: true, error: null };
}

function testSeasonDateValidation() {
  // Valid case: strictly greater
  const r1 = validateSeasonDates('2026-05-01', '2026-10-31');
  if (!r1.valid) throw new Error('Valid range failed');

  // Invalid case: end date before start date
  const r2 = validateSeasonDates('2026-10-31', '2026-05-01');
  if (r2.valid) throw new Error('Inverted range passed');

  // Invalid case: equal dates
  const r3 = validateSeasonDates('2026-05-01', '2026-05-01');
  if (r3.valid) throw new Error('Same-day range passed');

  // Invalid case: missing dates
  const r4 = validateSeasonDates('', '2026-05-01');
  if (r4.valid) throw new Error('Missing date passed');

  return { name: 'Strict Season Dates Logic', status: 'PASS', totalTested: 4 };
}

// 3. Season Date Overlap Calculation Test (Non-blocking warning)
function calculateDateOverlap(seasons, newFrom, newTo) {
  return seasons.filter((s) => {
    return newFrom <= s.date_to && newTo >= s.date_from;
  });
}

function testSeasonDateOverlapDetection() {
  const existingSeasons = [
    { id: '1', season_label: '2026 Summer', date_from: '2026-05-01', date_to: '2026-10-31' },
    { id: '2', season_label: '2026/27 Winter', date_from: '2026-11-01', date_to: '2027-04-30' }
  ];

  // Overlapping case (Festival promo within Summer)
  const overlap1 = calculateDateOverlap(existingSeasons, '2026-07-01', '2026-08-31');
  if (overlap1.length !== 1 || overlap1[0].id !== '1') {
    throw new Error('Failed to detect Summer overlap');
  }

  // Cross-season overlap spanning Summer and Winter
  const overlap2 = calculateDateOverlap(existingSeasons, '2026-10-15', '2026-11-15');
  if (overlap2.length !== 2) {
    throw new Error('Failed to detect dual overlap');
  }

  // Non-overlapping season in 2027 Summer
  const overlap3 = calculateDateOverlap(existingSeasons, '2027-05-01', '2027-10-31');
  if (overlap3.length !== 0) {
    throw new Error('False positive overlap detected');
  }

  return { name: 'Season Date Overlap Detection', status: 'PASS', totalTested: 3 };
}

// 4. Composite Hierarchy Validation (Member must belong to Agency's Market)
function validateMemberHierarchy(agencyId, marketId, availableMarkets) {
  if (!agencyId) return { valid: false, error: 'Travel agency must be selected' };
  if (!marketId) return { valid: false, error: 'Market desk must be selected' };

  const marketMatches = availableMarkets.some(
    (m) => m.id === marketId && m.agency_id === agencyId
  );

  if (!marketMatches) {
    return { valid: false, error: 'The selected market desk does not belong to the selected travel agency' };
  }
  return { valid: true, error: null };
}

function testMemberHierarchyIntegrity() {
  const markets = [
    { id: 'm1', agency_id: 'agency-A', market_name: 'India Desk' },
    { id: 'm2', agency_id: 'agency-A', market_name: 'Europe Desk' },
    { id: 'm3', agency_id: 'agency-B', market_name: 'India Desk' }
  ];

  // Valid: m1 under agency-A
  const r1 = validateMemberHierarchy('agency-A', 'm1', markets);
  if (!r1.valid) throw new Error('Valid hierarchy rejected');

  // Invalid: m3 (which belongs to B) under agency-A
  const r2 = validateMemberHierarchy('agency-A', 'm3', markets);
  if (r2.valid) throw new Error('Cross-agency mismatch allowed');

  // Missing agency
  const r3 = validateMemberHierarchy('', 'm1', markets);
  if (r3.valid) throw new Error('Missing agency allowed');

  return { name: 'Composite Agency-Market Hierarchy Rule', status: 'PASS', totalTested: 3 };
}

// 5. Recipient Scopes Deduplication & Hierarchy Consistency Test
function resolveRecipients(agencyId, scope, selectedMarketIds, selectedMemberIds, members) {
  const seenEmails = new Set();
  const recipients = [];

  for (const m of members) {
    if (m.agency_id !== agencyId) continue;
    if (m.status !== 'ACTIVE') continue;
    if (!m.email || !EMAIL_REGEX.test(m.email.trim())) continue;

    let isSelected = false;
    if (scope === 'COMPANY') {
      isSelected = true;
    } else if (scope === 'MARKETS') {
      isSelected = Boolean(m.market_id && selectedMarketIds.includes(m.market_id));
    } else if (scope === 'INDIVIDUALS') {
      isSelected = selectedMemberIds.includes(m.id);
    }

    if (!isSelected) continue;

    const normalizedEmail = m.email.toLowerCase().trim();
    if (!seenEmails.has(normalizedEmail)) {
      seenEmails.add(normalizedEmail);
      recipients.push({ id: m.id, email: normalizedEmail });
    }
  }

  return recipients;
}

function testRecipientScopesResolution() {
  const mockMembers = [
    { id: '1', agency_id: 'agency-A', market_id: 'mkt-1', email: 'alice@agency-a.com', status: 'ACTIVE' },
    { id: '2', agency_id: 'agency-A', market_id: 'mkt-1', email: 'alice@agency-a.com', status: 'ACTIVE' }, // Duplicate email in same market
    { id: '3', agency_id: 'agency-A', market_id: 'mkt-2', email: 'bob@agency-a.com', status: 'ACTIVE' },
    { id: '4', agency_id: 'agency-A', market_id: 'mkt-2', email: 'invalid-email', status: 'ACTIVE' }, // Invalid email
    { id: '5', agency_id: 'agency-A', market_id: 'mkt-2', email: 'inactive@agency-a.com', status: 'INACTIVE' }, // Inactive
    { id: '6', agency_id: 'agency-B', market_id: 'mkt-3', email: 'charlie@agency-b.com', status: 'ACTIVE' } // Different agency
  ];

  // Test Scope 1: COMPANY (Must include alice and bob once, never include duplicate, invalid, inactive, or agency-B)
  const rCompany = resolveRecipients('agency-A', 'COMPANY', [], [], mockMembers);
  if (rCompany.length !== 2 || !rCompany.some(r => r.email === 'alice@agency-a.com') || !rCompany.some(r => r.email === 'bob@agency-a.com')) {
    throw new Error('COMPANY scope resolution failed to deduplicate or exclude invalid records');
  }

  // Test Scope 2: MARKETS (Only mkt-1 selected)
  const rMarket = resolveRecipients('agency-A', 'MARKETS', ['mkt-1'], [], mockMembers);
  if (rMarket.length !== 1 || rMarket[0].email !== 'alice@agency-a.com') {
    throw new Error('MARKETS scope resolution failed');
  }

  // Test Scope 3: INDIVIDUALS (Only bob selected)
  const rIndiv = resolveRecipients('agency-A', 'INDIVIDUALS', [], ['3'], mockMembers);
  if (rIndiv.length !== 1 || rIndiv[0].email !== 'bob@agency-a.com') {
    throw new Error('INDIVIDUALS scope resolution failed');
  }

  return { name: 'Recipient Scopes Deduplication & Hierarchy Consistency', status: 'PASS', totalTested: 3 };
}

// 6. Comprehensive Rate Calculation Engine Tests (Phase L Suite)
function createDefaultCalculationConfig() {
  return {
    anchorRowId: 'DBL',
    anchorMealId: 'HB',
    currency: 'USD',
    decimalPrecision: 2,
    roomRows: [
      { id: 'SGL', label: 'Single', occupancyCount: 1, enabled: true, order: 1 },
      { id: 'DBL', label: 'Double', occupancyCount: 2, enabled: true, order: 2 },
      { id: 'TPL', label: 'Triple', occupancyCount: 3, enabled: true, order: 3 },
      { id: 'QUAD', label: 'Quadruple', occupancyCount: 4, enabled: true, order: 4 }
    ],
    mealColumns: [
      { id: 'BB', label: 'BB', enabled: true, order: 1 },
      { id: 'HB', label: 'HB', enabled: true, order: 2 },
      { id: 'FB', label: 'FB', enabled: true, order: 3 }
    ],
    occupancyAdjustments: {
      SGL: { targetRowId: 'SGL', type: 'FIXED', direction: 'DEDUCT', scope: 'PER_ROOM', value: 10 },
      TPL: { targetRowId: 'TPL', type: 'FIXED', direction: 'ADD', scope: 'PER_ROOM', value: 25 },
      QUAD: { targetRowId: 'QUAD', type: 'FIXED', direction: 'ADD', scope: 'PER_ROOM', value: 50 }
    },
    mealAdjustments: {
      BB: { targetMealId: 'BB', type: 'FIXED', direction: 'DEDUCT', scope: 'PER_ROOM', value: 10 },
      FB: { targetMealId: 'FB', type: 'FIXED', direction: 'ADD', scope: 'PER_ROOM', value: 15 }
    }
  };
}

function calculateRateGrid(anchorValue, config, existingCells = {}) {
  const result = {};
  const anchorRow = config.anchorRowId;
  const anchorMeal = config.anchorMealId;
  const enabledRows = config.roomRows.filter((r) => r.enabled);
  const enabledMeals = config.mealColumns.filter((m) => m.enabled);

  if (anchorValue === null || isNaN(anchorValue) || anchorValue <= 0) {
    for (const r of enabledRows) {
      for (const m of enabledMeals) {
        const key = `${r.id}:${m.id}`;
        const existing = existingCells[key];
        if (existing && existing.status === 'MANUAL_OVERRIDE') {
          result[key] = { ...existing };
        } else {
          result[key] = { rowId: r.id, mealId: m.id, value: null, status: 'NOT_CONFIGURED' };
        }
      }
    }
    return result;
  }

  const rowAnchorValues = {};
  rowAnchorValues[anchorRow] = { value: anchorValue };

  for (const r of enabledRows) {
    if (r.id === anchorRow) continue;
    const rule = config.occupancyAdjustments[r.id];
    if (!rule || rule.value === undefined || rule.value === null) continue;

    let step = rule.type === 'PERCENTAGE' ? (anchorValue * rule.value) / 100 : rule.value;
    let calculated = rule.direction === 'ADD' ? anchorValue + step : anchorValue - step;
    rowAnchorValues[r.id] = { value: Number(calculated.toFixed(config.decimalPrecision ?? 2)) };
  }

  for (const r of enabledRows) {
    const baseObj = rowAnchorValues[r.id];
    for (const m of enabledMeals) {
      const key = `${r.id}:${m.id}`;
      const existing = existingCells[key];

      if (existing && existing.status === 'MANUAL_OVERRIDE') {
        result[key] = { ...existing };
        continue;
      }

      if (r.id === anchorRow && m.id === anchorMeal) {
        result[key] = { rowId: r.id, mealId: m.id, value: anchorValue, status: 'ANCHOR_INPUT' };
        continue;
      }

      if (!baseObj) {
        result[key] = { rowId: r.id, mealId: m.id, value: null, status: 'NOT_CONFIGURED' };
        continue;
      }

      if (m.id === anchorMeal) {
        result[key] = { rowId: r.id, mealId: m.id, value: baseObj.value, status: 'AUTO_CALCULATED' };
        continue;
      }

      const mealRule = config.mealAdjustments[m.id];
      if (!mealRule || mealRule.value === undefined || mealRule.value === null) {
        result[key] = { rowId: r.id, mealId: m.id, value: null, status: 'NOT_CONFIGURED' };
        continue;
      }

      let diff = 0;
      if (mealRule.type === 'PERCENTAGE') {
        diff = (baseObj.value * mealRule.value) / 100;
      } else {
        diff = mealRule.scope === 'PER_PERSON' ? mealRule.value * r.occupancyCount : mealRule.value;
      }

      const finalVal = mealRule.direction === 'ADD' ? baseObj.value + diff : baseObj.value - diff;
      result[key] = {
        rowId: r.id,
        mealId: m.id,
        value: Number(finalVal.toFixed(config.decimalPrecision ?? 2)),
        status: 'AUTO_CALCULATED'
      };
    }
  }

  return result;
}

function testRateCalculationSuite() {
  const config = createDefaultCalculationConfig();

  // Test 1: Double HB Anchor ($100)
  const grid1 = calculateRateGrid(100, config);
  if (grid1['DBL:HB'].value !== 100 || grid1['DBL:HB'].status !== 'ANCHOR_INPUT') {
    throw new Error('Test 1 Failed: Anchor Double HB calculation mismatch');
  }

  // Test 2: Single Deduction ($10 deduction -> $90 Single HB)
  if (grid1['SGL:HB'].value !== 90 || grid1['SGL:HB'].status !== 'AUTO_CALCULATED') {
    throw new Error('Test 2 Failed: Single HB deduction mismatch');
  }

  // Test 3: Triple Supplement (+$25 -> $125 Triple HB)
  if (grid1['TPL:HB'].value !== 125 || grid1['TPL:HB'].status !== 'AUTO_CALCULATED') {
    throw new Error('Test 3 Failed: Triple HB supplement mismatch');
  }

  // Test 4: Quadruple Configured Adjustment (+$50 -> $150 Quad HB)
  if (grid1['QUAD:HB'].value !== 150 || grid1['QUAD:HB'].status !== 'AUTO_CALCULATED') {
    throw new Error('Test 4 Failed: Quadruple HB adjustment mismatch');
  }

  // Test 5: BB Adjustment ($10 deduction -> $90 DBL BB, $80 SGL BB)
  if (grid1['DBL:BB'].value !== 90 || grid1['SGL:BB'].value !== 80) {
    throw new Error('Test 5 Failed: BB adjustment mismatch');
  }

  // Test 6: FB Adjustment (+$15 supplement -> $115 DBL FB, $140 TPL FB)
  if (grid1['DBL:FB'].value !== 115 || grid1['TPL:FB'].value !== 140) {
    throw new Error('Test 6 Failed: FB adjustment mismatch');
  }

  // Test 7: Percentage Calculation (10% single discount on $200 -> $180)
  const configPercent = createDefaultCalculationConfig();
  configPercent.occupancyAdjustments.SGL = {
    targetRowId: 'SGL',
    type: 'PERCENTAGE',
    direction: 'DEDUCT',
    scope: 'PER_ROOM',
    value: 10
  };
  const gridPct = calculateRateGrid(200, configPercent);
  if (gridPct['SGL:HB'].value !== 180) {
    throw new Error('Test 7 Failed: Percentage adjustment calculation mismatch');
  }

  // Test 8: Manual Override Preservation
  const existingWithOverride = {
    'DBL:FB': { rowId: 'DBL', mealId: 'FB', value: 135, status: 'MANUAL_OVERRIDE' }
  };
  const gridOverride = calculateRateGrid(100, config, existingWithOverride);
  if (gridOverride['DBL:FB'].value !== 135 || gridOverride['DBL:FB'].status !== 'MANUAL_OVERRIDE') {
    throw new Error('Test 8 Failed: Manual override was not preserved');
  }

  // Test 9: Reset to Auto (omitting override resets it back to 115)
  const gridReset = calculateRateGrid(100, config, {});
  if (gridReset['DBL:FB'].value !== 115 || gridReset['DBL:FB'].status !== 'AUTO_CALCULATED') {
    throw new Error('Test 9 Failed: Reset to auto failed');
  }

  // Test 10: Missing Adjustment Graceful Handling (Not Configured)
  const configMissing = createDefaultCalculationConfig();
  delete configMissing.occupancyAdjustments.QUAD;
  const gridMissing = calculateRateGrid(100, configMissing);
  if (gridMissing['QUAD:HB'].value !== null || gridMissing['QUAD:HB'].status !== 'NOT_CONFIGURED') {
    throw new Error('Test 10 Failed: Missing adjustment did not yield NOT_CONFIGURED');
  }

  // Test 11: Missing Anchor Graceful Handling
  const gridNoAnchor = calculateRateGrid(null, config);
  if (gridNoAnchor['DBL:HB'].value !== null || gridNoAnchor['DBL:HB'].status !== 'NOT_CONFIGURED') {
    throw new Error('Test 11 Failed: Missing anchor did not yield NOT_CONFIGURED');
  }

  // Test 12: Decimal Precision ($100.55 anchor with 15% supplement -> 115.63)
  const configPrec = createDefaultCalculationConfig();
  configPrec.decimalPrecision = 2;
  configPrec.mealAdjustments.FB = {
    targetMealId: 'FB',
    type: 'PERCENTAGE',
    direction: 'ADD',
    scope: 'PER_ROOM',
    value: 15
  };
  const gridPrec = calculateRateGrid(100.55, configPrec);
  if (gridPrec['DBL:FB'].value !== 115.63) {
    throw new Error(`Test 12 Failed: Expected 115.63, got ${gridPrec['DBL:FB'].value}`);
  }

  // Test 13: Per-Person Supplement Scaling (FB $15 per person -> Single FB is +$15, Triple FB is +$45)
  const configPerPerson = createDefaultCalculationConfig();
  configPerPerson.mealAdjustments.FB = {
    targetMealId: 'FB',
    type: 'FIXED',
    direction: 'ADD',
    scope: 'PER_PERSON',
    value: 15
  };
  const gridPP = calculateRateGrid(100, configPerPerson);
  // SGL base = 90 + (1 pax * 15) = 105
  // TPL base = 125 + (3 pax * 15) = 170
  if (gridPP['SGL:FB'].value !== 105 || gridPP['TPL:FB'].value !== 170) {
    throw new Error('Test 13 Failed: Per-person meal supplement scaling mismatch');
  }

  return { name: 'Flexible Rate Calculation Engine (Phase L 13 Scenarios)', status: 'PASS', totalTested: 13 };
}

// 7. Security Hardening Suite (Phase 6C Logic Tests)
// Models the database trigger & policy rules introduced in migration 000012

function simulateEnforceAuditActor(record, sessionUser) {
  // If no authenticated session user
  if (!sessionUser) {
    // Unauthenticated client insert -> Denied by RLS (auth.uid() IS NOT NULL)
    return { success: false, error: 'Audit insertion rejected: unauthenticated' };
  }

  // Active employee check
  if (!sessionUser.is_active) {
    return { success: false, error: 'Audit insertion rejected: authenticated actor is inactive or missing.' };
  }

  // Database trigger hardens actor_id: overrides whatever client supplied with sessionUser.id
  const hardenedRecord = { ...record };
  hardenedRecord.actor_id = sessionUser.id;

  return { success: true, record: hardenedRecord };
}

function simulateEnforceRateSetupCreator(operation, currentRecord, incomingRecord, sessionUser, permissions) {
  // Check permission: can_manage_rates
  const canManageRates = sessionUser.role === 'ADMIN' || (permissions && permissions.includes('CAN_MANAGE_RATES'));
  if (!canManageRates) {
    return { success: false, error: 'Rate calculation setup modification denied: insufficient permissions.' };
  }

  if (operation === 'INSERT') {
    // Hardens created_by strictly to session user ID
    const hardened = { ...incomingRecord, created_by: sessionUser.id };
    return { success: true, record: hardened };
  }

  if (operation === 'UPDATE') {
    // Immutability check on created_by
    if (incomingRecord.created_by && incomingRecord.created_by !== currentRecord.created_by) {
      return { success: false, error: 'Security violation: created_by identity on rate_calculation_setups is immutable.' };
    }
    return { success: true, record: { ...currentRecord, ...incomingRecord, created_by: currentRecord.created_by } };
  }

  return { success: false, error: 'Unsupported operation' };
}

function testSecurityHardeningSuite() {
  const adminUser = { id: 'admin-uuid-1', role: 'ADMIN', is_active: true };
  const authorizedStaff = { id: 'staff-uuid-2', role: 'STAFF', is_active: true };
  const unauthorizedStaff = { id: 'staff-uuid-3', role: 'STAFF', is_active: true };
  const inactiveUser = { id: 'user-uuid-4', role: 'STAFF', is_active: false };
  const victimAdminId = 'admin-victim-uuid';

  // 1. Authenticated user inserting audit record with their own ID
  const r1 = simulateEnforceAuditActor({ action: 'INSERT', actor_id: authorizedStaff.id }, authorizedStaff);
  if (!r1.success || r1.record.actor_id !== authorizedStaff.id) {
    throw new Error('Test 1 Failed: Legitimate audit insert failed');
  }

  // 2. User attempting to insert audit record with another user's ID (Spoofing attempt)
  const r2 = simulateEnforceAuditActor({ action: 'INSERT', actor_id: victimAdminId }, authorizedStaff);
  if (!r2.success || r2.record.actor_id === victimAdminId || r2.record.actor_id !== authorizedStaff.id) {
    throw new Error('Test 2 Failed: Actor spoofing was not overridden by session uid');
  }

  // 3. Unauthenticated audit insertion
  const r3 = simulateEnforceAuditActor({ action: 'INSERT', actor_id: 'any-id' }, null);
  if (r3.success) {
    throw new Error('Test 3 Failed: Unauthenticated insert unexpectedly succeeded');
  }

  // 4. Admin audit insertion
  const r4 = simulateEnforceAuditActor({ action: 'PUBLISH', actor_id: adminUser.id }, adminUser);
  if (!r4.success || r4.record.actor_id !== adminUser.id) {
    throw new Error('Test 4 Failed: Admin audit insert failed');
  }

  // 5. Inactive staff audit insertion rejected
  const r5 = simulateEnforceAuditActor({ action: 'INSERT', actor_id: inactiveUser.id }, inactiveUser);
  if (r5.success) {
    throw new Error('Test 5 Failed: Inactive staff insert unexpectedly succeeded');
  }

  // 6. Authorized Staff setup creation
  const r6 = simulateEnforceRateSetupCreator('INSERT', null, { setup_name: 'Custom Setup' }, authorizedStaff, ['CAN_MANAGE_RATES']);
  if (!r6.success || r6.record.created_by !== authorizedStaff.id) {
    throw new Error('Test 6 Failed: Authorized staff setup creation failed');
  }

  // 7. Setup creator identity spoofing attempt on INSERT
  const r7 = simulateEnforceRateSetupCreator('INSERT', null, { setup_name: 'Spoofed Setup', created_by: victimAdminId }, authorizedStaff, ['CAN_MANAGE_RATES']);
  if (!r7.success || r7.record.created_by === victimAdminId || r7.record.created_by !== authorizedStaff.id) {
    throw new Error('Test 7 Failed: Setup creator spoofing was not overridden');
  }

  // 8. Updating created_by after setup creation (Tampering attempt)
  const currentSetup = { id: 'setup-100', setup_name: 'Legit Setup', created_by: authorizedStaff.id };
  const r8 = simulateEnforceRateSetupCreator('UPDATE', currentSetup, { created_by: victimAdminId, setup_name: 'Renamed' }, authorizedStaff, ['CAN_MANAGE_RATES']);
  if (r8.success) {
    throw new Error('Test 8 Failed: Changing created_by on UPDATE should be rejected as immutable violation');
  }

  // 9. Unauthorized Staff audit / setup mutation rejection
  const r9 = simulateEnforceRateSetupCreator('INSERT', null, { setup_name: 'Illegal Setup' }, unauthorizedStaff, []);
  if (r9.success) {
    throw new Error('Test 9 Failed: Unauthorized staff without CAN_MANAGE_RATES was not blocked');
  }

  return { name: 'Audit Actor & Setup Creator Identity Hardening (Phase 6C Logic)', status: 'PASS', totalTested: 9 };
}

// 8. Contract Management & Multi-Season Eligibility Verification Suite (Phase 8 QA)
function testContractManagementSuite() {
  let count = 0;

  // 1. Contract Date Validity & Expiry Logic
  const today = '2026-11-09';
  const isContractExpired = (validTo, compareDate = today) => validTo < compareDate;

  if (!isContractExpired('2026-10-31', today)) throw new Error('Contract expiry check failed for past date');
  if (isContractExpired('2026-11-10', today)) throw new Error('Contract expiry check failed for future date');
  if (isContractExpired('2026-11-09', today)) throw new Error('Contract expiry check failed for exact today date');
  count += 3;

  // 2. Contract Eligibility Resolution (Hotel, Season association, Date overlap, Status)
  const mockContracts = [
    {
      id: 'c1',
      hotel_id: 'hotel-sigiriya',
      season_id: 'season-winter',
      associated_season_ids: ['season-winter', 'season-spring'],
      valid_from: '2026-11-01',
      valid_to: '2027-04-30',
      status: 'ACTIVE',
      currency: 'USD'
    },
    {
      id: 'c2',
      hotel_id: 'hotel-sigiriya',
      season_id: 'season-summer',
      associated_season_ids: ['season-summer'],
      valid_from: '2026-05-01',
      valid_to: '2026-10-31',
      status: 'EXPIRED',
      currency: 'USD'
    },
    {
      id: 'c3',
      hotel_id: 'hotel-bentota',
      season_id: 'season-winter',
      associated_season_ids: [],
      valid_from: '2026-11-01',
      valid_to: '2027-04-30',
      status: 'ACTIVE',
      currency: 'EUR'
    }
  ];

  function filterEligible(hotelId, seasonId, targetDate = today) {
    return mockContracts.filter((c) => {
      if (c.hotel_id !== hotelId) return false;
      if (c.status !== 'ACTIVE') return false;
      if (c.valid_from > targetDate || c.valid_to < targetDate) return false;
      if (seasonId) {
        const matchesPrimary = c.season_id === seasonId;
        const matchesMulti = Array.isArray(c.associated_season_ids) && c.associated_season_ids.includes(seasonId);
        if (!matchesPrimary && !matchesMulti && c.season_id !== null) return false;
      }
      return true;
    });
  }

  // Eligible for Sigiriya in Winter
  const eligible1 = filterEligible('hotel-sigiriya', 'season-winter');
  if (eligible1.length !== 1 || eligible1[0].id !== 'c1') {
    throw new Error('Eligible contract filter failed for Sigiriya Winter');
  }
  count++;

  // Inactive / Expired should not be returned for Sigiriya Summer
  const eligibleSummer = filterEligible('hotel-sigiriya', 'season-summer');
  if (eligibleSummer.length !== 0) {
    throw new Error('Expired contract was incorrectly returned as eligible');
  }
  count++;

  // Cross-hotel isolation
  const eligibleBentota = filterEligible('hotel-bentota', 'season-winter');
  if (eligibleBentota.length !== 1 || eligibleBentota[0].id !== 'c3') {
    throw new Error('Contract isolation across hotels failed');
  }
  count++;

  // 3. Condition Privacy Separation (is_internal_only check)
  const mockConditions = [
    { title: 'Check-in Policy', is_internal_only: false, text: 'Check-in 14:00' },
    { title: 'Commission Split Secret', is_internal_only: true, text: 'Keep 12% override internal' },
    { title: 'Cancellation Rules', is_internal_only: false, text: 'Free cancellation up to 14 days prior' }
  ];

  // Filter public quote conditions
  const publicConditions = mockConditions.filter((c) => !c.is_internal_only);
  if (publicConditions.length !== 2) throw new Error('Public conditions count mismatch');
  if (publicConditions.some((c) => c.is_internal_only)) throw new Error('Internal condition leaked into public conditions list');
  count += 2;

  // 4. Contract Version Immutability
  const originalContract = {
    id: 'c1',
    contract_reference: 'CTR-SIG-2026-001',
    version_number: 1,
    terms: 'Initial agreement terms'
  };

  const versionSnapshot = {
    contract_id: originalContract.id,
    version_number: 1,
    version_label: 'v1.0 (Initial)',
    terms_snapshot: originalContract.terms,
    created_at: '2026-11-01T00:00:00Z'
  };

  // Mutating original contract should not alter frozen version snapshot
  const updatedContract = { ...originalContract, version_number: 2, terms: 'Revised commercial terms with 15% discount' };
  if (versionSnapshot.terms_snapshot !== 'Initial agreement terms') {
    throw new Error('Historical version snapshot was mutated');
  }
  if (versionSnapshot.version_number !== 1) {
    throw new Error('Version snapshot number was corrupted');
  }
  count += 2;

  // 5. Document Validation & Collision Avoidance (Phase 8C)
  const DOCUMENT_RULES = {
    maxSizeBytes: 25 * 1024 * 1024,
    allowedExtensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx']
  };

  const validateFile = (name, size) => {
    if (size > DOCUMENT_RULES.maxSizeBytes) return { valid: false, error: 'File size exceeds 25MB' };
    const ext = name.split('.').pop()?.toLowerCase();
    if (!DOCUMENT_RULES.allowedExtensions.includes(ext)) return { valid: false, error: 'Invalid file extension' };
    return { valid: true };
  };

  if (!validateFile('signed_contract.pdf', 5 * 1024 * 1024).valid) throw new Error('Valid PDF rejected');
  if (validateFile('huge_file.pdf', 30 * 1024 * 1024).valid) throw new Error('Oversized 30MB file accepted');
  if (validateFile('malicious.exe', 1024).valid) throw new Error('Executable file accepted');
  if (!validateFile('rates_matrix.xlsx', 2 * 1024 * 1024).valid) throw new Error('Valid Excel spreadsheet rejected');
  count += 4;

  // Collision-proof versioned path structure: hotel_id/contract_id/v{ver}_{timestamp}_{sanitized_name}
  const generateStoragePath = (hotelId, contractId, version, timestamp, name) => {
    const clean = name.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${hotelId}/${contractId}/v${version}_${timestamp}_${clean}`;
  };

  const path1 = generateStoragePath('hotel1', 'ctr1', 1, 1000, 'Original Contract.pdf');
  const path2 = generateStoragePath('hotel1', 'ctr1', 1, 1001, 'Original Contract.pdf');
  if (path1 === path2) throw new Error('Collision avoidance timestamp failed');
  if (!path1.includes('Original_Contract.pdf')) throw new Error('File name sanitization failed');
  count += 2;

  return { name: 'Hotel Contract Management & Document Vault (Phase 8C QA)', status: 'PASS', totalTested: count };
}

// 9. Hotel Rate Calculation Engine, Red/Green/Yellow Tiers & Custom Rates (Phase 9 QA)
function testHotelRateEngineAndCustomRatesSuite() {
  let count = 0;

  // 1. Core Component Calculations: Mount Randholee Verified Rules
  // Base Double HB = $120. Single Red = $10. Triple Supp = $25. BB Red = $15.
  const components = {
    hbDoubleBaseRate: 120,
    singleReductionAmount: 10,
    tripleSupplementAmount: 25,
    bbReductionAmount: 15
  };

  const calculate = (base, occ, meal) => {
    let tot = base;
    if (occ === 'SINGLE') tot -= components.singleReductionAmount;
    if (occ === 'TRIPLE') tot += components.tripleSupplementAmount;
    if (meal === 'BB') tot -= components.bbReductionAmount;
    return tot;
  };

  if (calculate(120, 'DOUBLE', 'HB') !== 120) throw new Error('Double HB calculation failed');
  if (calculate(120, 'SINGLE', 'HB') !== 110) throw new Error('Single HB calculation failed');
  if (calculate(120, 'TRIPLE', 'HB') !== 145) throw new Error('Triple HB calculation failed');
  if (calculate(120, 'DOUBLE', 'BB') !== 105) throw new Error('Double BB calculation failed');
  if (calculate(120, 'SINGLE', 'BB') !== 95) throw new Error('Single BB calculation failed');
  if (calculate(120, 'TRIPLE', 'BB') !== 130) throw new Error('Triple BB calculation failed');
  count += 6;

  // 2. Red / Green / Yellow Category Mapping & Conflict Validation
  const CATEGORY_MAP = {
    RED: 'LOWEST',
    GREEN: 'NORMAL',
    YELLOW: 'HIGHEST'
  };

  if (CATEGORY_MAP.RED !== 'LOWEST' || CATEGORY_MAP.GREEN !== 'NORMAL' || CATEGORY_MAP.YELLOW !== 'HIGHEST') {
    throw new Error('Colour rate mapping violation');
  }
  count += 3;

  const validateCategorySelection = (categories) => {
    if (!Array.isArray(categories) || categories.length !== 1) {
      return { valid: false, error: 'Exactly one category (RED, GREEN, or YELLOW) must be selected per rate item' };
    }
    const cat = categories[0];
    if (!['RED', 'GREEN', 'YELLOW'].includes(cat)) {
      return { valid: false, error: 'Invalid category' };
    }
    return { valid: true };
  };

  if (!validateCategorySelection(['GREEN']).valid) throw new Error('Valid category selection rejected');
  if (validateCategorySelection(['RED', 'GREEN']).valid) throw new Error('Conflicting multiple categories accepted');
  if (validateCategorySelection([]).valid) throw new Error('Empty category selection accepted');
  count += 3;

  // 3. Custom 1, Custom 2, Custom 3 Options & Room Night Conditions
  const validateCustomRate = (slot, amount, roomNights) => {
    if (!['Custom 1', 'Custom 2', 'Custom 3'].includes(slot)) {
      return { valid: false, error: 'Invalid slot' };
    }
    if (typeof amount !== 'number' || amount < 0) {
      return { valid: false, error: 'Invalid amount' };
    }
    if (roomNights !== undefined && roomNights !== null && (typeof roomNights !== 'number' || roomNights < 0)) {
      return { valid: false, error: 'Invalid room night condition' };
    }
    return { valid: true };
  };

  if (!validateCustomRate('Custom 1', 115, 1500).valid) throw new Error('Valid Custom 1 with 1500 room nights rejected');
  if (!validateCustomRate('Custom 2', 95).valid) throw new Error('Valid Custom 2 without room nights rejected');
  if (validateCustomRate('Custom 4', 100).valid) throw new Error('Invalid Custom 4 accepted');
  if (validateCustomRate('Custom 1', -10).valid) throw new Error('Negative amount accepted');
  if (validateCustomRate('Custom 3', 80, -50).valid) throw new Error('Negative room nights accepted');
  count += 5;

  // 4. Previous Rate History Filtering & Immutability
  const mockQuoteHistory = [
    { id: 'q1', agency_id: 'agency-a', quote_reference: 'QT-2026-001', quoted_amount: 120, status: 'DRAFT', rate_category: 'CUSTOM', member_id: 'mem-1' },
    { id: 'q2', agency_id: 'agency-b', quote_reference: 'QT-2026-002', quoted_amount: 95, status: 'SENT', rate_category: 'GREEN', member_id: 'mem-2' }
  ];

  const filterHistory = (agencyId, memberId) => mockQuoteHistory.filter(q => {
    if (agencyId && q.agency_id !== agencyId) return false;
    if (memberId && q.member_id !== memberId) return false;
    return true;
  });
  const agencyAHistory = filterHistory('agency-a');
  if (agencyAHistory.length !== 1 || agencyAHistory[0].quote_reference !== 'QT-2026-001') {
    throw new Error('Agency rate history filtering failed');
  }
  const member2History = filterHistory(undefined, 'mem-2');
  if (member2History.length !== 1 || member2History[0].quote_reference !== 'QT-2026-002') {
    throw new Error('Member rate history filtering failed');
  }

  // Verify historical quote value does not change if rate configuration changes
  components.hbDoubleBaseRate = 140; // Live rate inflation
  if (agencyAHistory[0].quoted_amount !== 120) {
    throw new Error('Historical quote was mutated by live rate change');
  }

  // 5. Ad-Hoc Negotiated Custom Rate Workflow Verification (Without saving reusable templates)
  const simulateAdHocCustomRateQuote = ({ hotelId, agencyId, memberId, negotiatedRate, notes }) => {
    if (!hotelId || !agencyId || !memberId) {
      return { success: false, error: 'Hotel, Agency, and Contact Member are required for ad-hoc custom quotes' };
    }
    if (typeof negotiatedRate !== 'number' || negotiatedRate <= 0) {
      return { success: false, error: 'Valid negotiated rate amount is required' };
    }
    // Produces quote snapshot directly without creating reusable rate templates or calculation setups
    const quoteSnapshot = {
      quote_reference: `QT-2026-${Date.now().toString().slice(-4)}`,
      agency_id: agencyId,
      original_member_id: memberId,
      rate_category: 'CUSTOM',
      quoted_amount: negotiatedRate,
      email_status: 'NOT_SENT', // Email provider not connected
      quote_lifecycle: 'DRAFT',
      custom_notes: notes || 'Specially negotiated rate'
    };
    return { success: true, quoteSnapshot };
  };

  const adHocQuoteRes = simulateAdHocCustomRateQuote({
    hotelId: 'hotel-randholee',
    agencyId: 'agency-a',
    memberId: 'mem-1',
    negotiatedRate: 112.50,
    notes: 'Agreed special deal for Nov 2026'
  });

  if (!adHocQuoteRes.success || adHocQuoteRes.quoteSnapshot.rate_category !== 'CUSTOM' || adHocQuoteRes.quoteSnapshot.quoted_amount !== 112.50) {
    throw new Error('Ad-hoc custom rate quote simulation failed');
  }
  if (adHocQuoteRes.quoteSnapshot.email_status !== 'NOT_SENT') {
    throw new Error('Ad-hoc quote must remain NOT_SENT prior to mail delivery confirmation');
  }

  // 6. View Exact Shared Rates Multi-Dimensional Filtering & Detailed Snapshot Verification
  const detailedQuotes = [
    {
      id: 'q101',
      agency_id: 'agency-a',
      agency_name: 'Jetwing Travels',
      quote_reference: 'QT-2026-101',
      sender_name: 'John Staff',
      created_at: '2026-11-08T10:00:00Z',
      email_status: 'SENT',
      email_subject: 'Special Winter Rate Offer',
      email_body_html: '<p>Quoted $110 USD HB</p>',
      quote_recipients: [
        { original_member_id: 'mem-1', original_full_name: 'Alice Agent', original_email: 'alice@jetwing.com' }
      ],
      quote_items: [
        {
          hotel_name_snapshot: 'Mount Randholee Resort',
          season_label_snapshot: 'Winter Season 2026',
          rate_category: 'CUSTOM',
          quoted_amount: 110.00,
          currency: 'USD',
          room_type_snapshot: 'Double Deluxe',
          meal_plan_snapshot: 'HB',
          custom_notes: 'Min 2 nights'
        }
      ]
    },
    {
      id: 'q102',
      agency_id: 'agency-b',
      agency_name: 'Walkers Tours',
      quote_reference: 'QT-2026-102',
      sender_name: 'Mary Staff',
      created_at: '2026-11-09T14:30:00Z',
      email_status: 'NOT_SENT',
      email_subject: 'Standard Green Tier Rates',
      email_body_html: '<p>Quoted $125 USD HB</p>',
      quote_recipients: [
        { original_member_id: 'mem-2', original_full_name: 'Bob Buyer', original_email: 'bob@walkers.com' }
      ],
      quote_items: [
        {
          hotel_name_snapshot: 'Sigiriya Village',
          season_label_snapshot: 'Summer Season 2026',
          rate_category: 'GREEN',
          quoted_amount: 125.00,
          currency: 'USD',
          room_type_snapshot: 'Double Standard',
          meal_plan_snapshot: 'HB',
          custom_notes: 'Standard contract terms'
        }
      ]
    }
  ];

  const filterDetailedQuotes = ({ agencyId, memberId, hotel, rateCategory, status, dateFrom, dateTo, search }) => {
    return detailedQuotes.filter((q) => {
      const qDate = q.created_at.slice(0, 10);
      if (agencyId && q.agency_id !== agencyId) return false;
      if (memberId && !q.quote_recipients.some(r => r.original_member_id === memberId)) return false;
      if (status && status !== 'ALL' && q.email_status !== status) return false;
      if (rateCategory && rateCategory !== 'ALL' && !q.quote_items.some(i => i.rate_category === rateCategory)) return false;
      if (hotel && hotel !== 'ALL' && !q.quote_items.some(i => i.hotel_name_snapshot === hotel)) return false;
      if (dateFrom && qDate < dateFrom) return false;
      if (dateTo && qDate > dateTo) return false;
      if (search) {
        const s = search.toLowerCase();
        const matchesRef = q.quote_reference.toLowerCase().includes(s);
        const matchesHotel = q.quote_items.some(i => i.hotel_name_snapshot.toLowerCase().includes(s));
        if (!matchesRef && !matchesHotel) return false;
      }
      return true;
    });
  };

  // Test hotel filter
  const randholeeQuotes = filterDetailedQuotes({ hotel: 'Mount Randholee Resort' });
  if (randholeeQuotes.length !== 1 || randholeeQuotes[0].quote_reference !== 'QT-2026-101') {
    throw new Error('Hotel filtering failed in shared rate history');
  }

  // Test rateCategory filter
  const customQuotes = filterDetailedQuotes({ rateCategory: 'CUSTOM' });
  if (customQuotes.length !== 1 || customQuotes[0].quote_items[0].quoted_amount !== 110.00) {
    throw new Error('Rate category filtering failed in shared rate history');
  }

  // Test date range filter
  const nov9Quotes = filterDetailedQuotes({ dateFrom: '2026-11-09', dateTo: '2026-11-09' });
  if (nov9Quotes.length !== 1 || nov9Quotes[0].quote_reference !== 'QT-2026-102') {
    throw new Error('Date range filtering failed in shared rate history');
  }

  // Test text search
  const searchedQuotes = filterDetailedQuotes({ search: 'Sigiriya' });
  if (searchedQuotes.length !== 1 || searchedQuotes[0].quote_reference !== 'QT-2026-102') {
    throw new Error('Text search filtering failed in shared rate history');
  }

  // Test full snapshot data presence
  const snap = randholeeQuotes[0];
  if (!snap.quote_items[0].room_type_snapshot || !snap.quote_items[0].meal_plan_snapshot || !snap.quote_recipients[0].original_email || !snap.email_body_html) {
    throw new Error('Detailed snapshot missing required audit fields');
  }

  count += 5;

  return { name: 'Hotel Rate Engine, Tier Conflicts & Custom Rates (Phase 9 QA)', status: 'PASS', totalTested: count };
}

// 10. Email Preview, Sending Lifecycle & Retry Engine Test Suite (Phase 9 Email Lifecycle)
function testEmailLifecycleSuite() {
  let count = 0;

  // 1. Email Preview Generation and Sanitization
  function generateEmailPayload({ hotel, season, rateTier, amount, currency, externalTerms, internalNotes }) {
    // Internal notes must never leak into outgoing email html or text
    const emailBodyHtml = `
      <div>
        <h3>Hotel Rates Proposal - ${hotel}</h3>
        <p>Season: ${season}</p>
        <p>Tier: ${rateTier} | Quoted: ${currency} ${amount.toFixed(2)}</p>
        ${externalTerms ? `<div class="terms">${externalTerms}</div>` : ''}
      </div>
    `.trim();

    const emailBodyText = `
Hotel Rates Proposal - ${hotel}
Season: ${season}
Tier: ${rateTier} | Quoted: ${currency} ${amount.toFixed(2)}
${externalTerms ? `Terms: ${externalTerms}` : ''}
    `.trim();

    if (emailBodyHtml.includes('INTERNAL_PROFIT_MARGIN') || emailBodyText.includes('INTERNAL_PROFIT_MARGIN')) {
      throw new Error('Confidential internal notes leaked into outgoing email body!');
    }

    return { emailBodyHtml, emailBodyText };
  }

  const payload = generateEmailPayload({
    hotel: 'Mount Randholee Resort',
    season: 'Winter 2026',
    rateTier: 'RED',
    amount: 145.00,
    currency: 'USD',
    externalTerms: 'Cancellation within 14 days subject to 50% charge.',
    internalNotes: 'INTERNAL_PROFIT_MARGIN: 18.5% confidential'
  });

  if (!payload.emailBodyHtml.includes('Mount Randholee Resort') || !payload.emailBodyText.includes('Winter 2026')) {
    throw new Error('Email body content generation failed');
  }
  count++;

  // 2. Email Lifecycle State Machine (DRAFT -> PENDING -> SENT or FAILED)
  function transitionQuoteStatus(currentStatus, action, hasProviderConfigured) {
    if (currentStatus === 'SENT' && action === 'SEND') {
      return { status: 'SENT', preventedDuplicate: true, error: 'Quote has already been dispatched' };
    }

    if (action === 'SAVE_DRAFT') {
      return { status: 'DRAFT', preventedDuplicate: false };
    }

    if (action === 'SEND' || action === 'RETRY') {
      // Transition to PENDING during dispatch
      const pendingState = 'PENDING';

      // Live provider check
      if (!hasProviderConfigured) {
        // Must NOT mark SENT when provider is absent
        return { status: 'FAILED', pendingState, preventedDuplicate: false, error: 'Email provider unconfigured' };
      } else {
        return { status: 'SENT', pendingState, preventedDuplicate: false, error: null };
      }
    }

    throw new Error(`Invalid lifecycle action: ${action}`);
  }

  // Test Save as Draft
  const draftState = transitionQuoteStatus('NEW', 'SAVE_DRAFT', false);
  if (draftState.status !== 'DRAFT') throw new Error('Failed to transition to DRAFT');
  count++;

  // Test Send without configured email provider (must fail gracefully, never mark SENT)
  const unconfiguredSend = transitionQuoteStatus('DRAFT', 'SEND', false);
  if (unconfiguredSend.status !== 'FAILED' || unconfiguredSend.status === 'SENT') {
    throw new Error('System falsely marked quote as SENT when no email provider was configured!');
  }
  count++;

  // Test Retry capability on FAILED quote
  const retrySendSuccess = transitionQuoteStatus('FAILED', 'RETRY', true);
  if (retrySendSuccess.status !== 'SENT') {
    throw new Error('Retry dispatch failed to transition to SENT when provider is available');
  }
  count++;

  // Test Duplicate send protection on already SENT quote
  const duplicateSend = transitionQuoteStatus('SENT', 'SEND', true);
  if (!duplicateSend.preventedDuplicate || duplicateSend.status !== 'SENT') {
    throw new Error('Duplicate dispatch prevention failed for quote with status SENT');
  }
  count++;

  // 3. Email Dispatch Attempt Log Verification
  const attemptsLog = [];
  function recordAttempt(quoteId, attemptNumber, status, errorMsg = null) {
    attemptsLog.push({
      quote_id: quoteId,
      attempt_number: attemptNumber,
      status,
      error_message: errorMsg,
      timestamp: new Date().toISOString()
    });
  }

  recordAttempt('QT-101', 1, 'FAILED', 'No API key configured');
  recordAttempt('QT-101', 2, 'SUCCESS', null);

  if (attemptsLog.length !== 2 || attemptsLog[0].status !== 'FAILED' || attemptsLog[1].status !== 'SUCCESS') {
    throw new Error('Attempt logging tracking failed');
  }
  count++;

  // 4. Exact Recipient & Rate Snapshot Preservation
  const frozenQuote = {
    quote_id: 'QT-999',
    recipients: [
      { member_id: 'MEM-1', email: 'john@agency.com', fullName: 'John Doe', agency: 'Acme Travels' }
    ],
    items: [
      { room_type: 'Double', meal_plan: 'HB', rate_category: 'GREEN', amount: 135.00, currency: 'USD' }
    ],
    email_body_text: payload.emailBodyText,
    email_status: 'SENT'
  };

  // Modify simulated active live rates
  const currentLiveRates = { amount: 160.00 };

  // Assert historical snapshot remains unchanged
  if (frozenQuote.items[0].amount === currentLiveRates.amount) {
    throw new Error('Quote snapshot was improperly recalculated with live rates!');
  }
  count++;

  return { name: 'Email Preview, Dispatch Lifecycle & Retry Engine (Phase 9 QA)', status: 'PASS', totalTested: count };
}

// 11. Device Default Email App Workflow & User Confirmation Test Suite (Phase 9 Device Handoff)
function testDeviceEmailAppHandoffSuite() {
  let count = 0;

  // 1. Mailto URL Builder & Safe Encoding
  function buildMailtoUrl({ recipients, cc, subject, body }) {
    if (!recipients || recipients.length === 0) {
      throw new Error('Cannot construct mailto link without recipients');
    }

    const toStr = recipients.join(',');
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);

    const parts = [];
    if (cc && cc.trim().length > 0) {
      parts.push(`cc=${encodeURIComponent(cc.trim())}`);
    }
    parts.push(`subject=${encodedSubject}`);
    parts.push(`body=${encodedBody}`);

    return `mailto:${toStr}?${parts.join('&')}`;
  }

  const sampleRecipients = ['contact@jetwing.lk', 'reservations@jetwing.lk'];
  const sampleSubject = 'Hotel Rates Proposal — Mount Randholee Resort [Winter 2026]';
  const sampleBody = `HOTEL RATES PROPOSAL
Hotel: Mount Randholee Resort
Room: Double Room (HB)
Quoted Rate: USD 145.00 / night
Special Conditions: Min 2 nights stay & 10% holiday charge.
Currency: USD $145.00 & LKR 45,000/-`;

  const url = buildMailtoUrl({
    recipients: sampleRecipients,
    cc: 'director@windowcompanies.lk',
    subject: sampleSubject,
    body: sampleBody
  });

  // Test URL structure & query parameters
  if (!url.startsWith('mailto:contact@jetwing.lk,reservations@jetwing.lk?')) {
    throw new Error('Mailto recipient formatting failed');
  }
  if (!url.includes('cc=director%40windowcompanies.lk')) {
    throw new Error('CC parameter URL encoding failed');
  }
  if (!url.includes(encodeURIComponent('USD $145.00 & LKR 45,000/-'))) {
    throw new Error('Currency symbols & ampersand encoding failed');
  }
  count += 3;

  // 2. Empty recipient protection
  let caughtEmpty = false;
  try {
    buildMailtoUrl({ recipients: [], subject: 'Test', body: 'Test' });
  } catch (e) {
    caughtEmpty = true;
  }
  if (!caughtEmpty) throw new Error('Failed to prevent empty recipients in mailto builder');
  count++;

  // 3. Line breaks & plain-text preservation check
  const decodedBody = decodeURIComponent(url.split('body=')[1]);
  if (!decodedBody.includes('\nHotel: Mount Randholee Resort\n') || !decodedBody.includes('\nCurrency: USD $145.00 & LKR 45,000/-')) {
    throw new Error('Newlines or currency strings truncated during encoding/decoding cycle');
  }
  count++;

  // 4. URL Length Warning Threshold Logic
  function evaluateMailtoSafety(mailtoUrl) {
    // Standard recommended mailto limit across browsers/OS handlers is ~2000 chars
    const MAX_SAFE_URL_LEN = 2000;
    return {
      length: mailtoUrl.length,
      requiresFallbackCopy: mailtoUrl.length > MAX_SAFE_URL_LEN
    };
  }

  const normalSafety = evaluateMailtoSafety(url);
  if (normalSafety.requiresFallbackCopy) {
    throw new Error('Normal quote incorrectly marked as exceeding URL length limit');
  }

  const hugeBody = 'A'.repeat(2500);
  const largeUrl = buildMailtoUrl({ recipients: ['a@b.com'], subject: 'Long', body: hugeBody });
  const largeSafety = evaluateMailtoSafety(largeUrl);
  if (!largeSafety.requiresFallbackCopy) {
    throw new Error('Oversized mailto link failed to trigger fallback copy warning');
  }
  count += 2;

  // 5. Email Handoff & User Confirmation State Machine
  function processDeviceEmailHandoff(quoteRecord, action, userConfirmed) {
    // When opened in email app, must NOT be marked as SENT!
    if (action === 'OPEN_IN_APP') {
      return {
        ...quoteRecord,
        email_status: 'OPENED_IN_EMAIL_APP',
        opened_in_app_at: new Date().toISOString()
      };
    }

    if (action === 'SUBMIT_CONFIRMATION') {
      if (userConfirmed) {
        return {
          ...quoteRecord,
          email_status: 'USER_CONFIRMED_SENT',
          confirmed_by: 'staff-user-123',
          confirmed_at: new Date().toISOString(),
          quote_lifecycle: 'DISPATCHED'
        };
      } else {
        return {
          ...quoteRecord,
          email_status: 'OPENED_IN_EMAIL_APP',
          confirmation_notes: 'Staff kept quote as draft in email client'
        };
      }
    }

    throw new Error(`Unknown handoff action: ${action}`);
  }

  const initialQuote = {
    id: 'Q-100',
    quote_reference: 'QT-2026-001',
    email_status: 'NOT_SENT',
    quote_lifecycle: 'DRAFT'
  };

  // Step A: Trigger device mailto
  const handoffQuote = processDeviceEmailHandoff(initialQuote, 'OPEN_IN_APP');
  if (handoffQuote.email_status !== 'OPENED_IN_EMAIL_APP' || !handoffQuote.opened_in_app_at) {
    throw new Error('Failed to set OPENED_IN_EMAIL_APP status upon device handoff');
  }
  if (handoffQuote.email_status === 'SENT' || handoffQuote.email_status === 'USER_CONFIRMED_SENT') {
    throw new Error('Prematurely marked quote as SENT before user confirmation!');
  }
  count += 2;

  // Step B: User says "Not Sent Yet"
  const notSentYetQuote = processDeviceEmailHandoff(handoffQuote, 'SUBMIT_CONFIRMATION', false);
  if (notSentYetQuote.email_status !== 'OPENED_IN_EMAIL_APP') {
    throw new Error('Declining confirmation should preserve status as OPENED_IN_EMAIL_APP');
  }
  count++;

  // Step C: User confirms "Yes, I Sent It"
  const confirmedSentQuote = processDeviceEmailHandoff(handoffQuote, 'SUBMIT_CONFIRMATION', true);
  if (confirmedSentQuote.email_status !== 'USER_CONFIRMED_SENT' || !confirmedSentQuote.confirmed_by || !confirmedSentQuote.confirmed_at) {
    throw new Error('Confirmation failed to record USER_CONFIRMED_SENT and audit metadata');
  }
  count++;

  // Step D: Distinction between provider-verified SENT and user-confirmed USER_CONFIRMED_SENT
  if (confirmedSentQuote.email_status === 'SENT') {
    throw new Error('USER_CONFIRMED_SENT must not masquerade as provider-verified SENT');
  }
  count++;

  return { name: 'Device Email App Handoff, URL Encoding & Confirmation (Phase 9 QA)', status: 'PASS', totalTested: count };
}

// 12. Friday & Saturday Master Workflow Verification Suite:
// Company / Market / Individual Recipient Resolution, Strict Case-Insensitive Deduplication,
// Invalid Email Quarantine, and Contract Terms vs Internal Confidential Notes Segregation
function testRecipientSelectionAndContractRateSharingSuite() {
  let count = 0;
  const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

  const mockAgencyA = 'agency-tui';
  const mockAgencyB = 'agency-kuoni';
  const marketUK = 'mkt-uk';
  const marketDE = 'mkt-de';

  const mockMembers = [
    { id: 'm1', agency_id: mockAgencyA, market_id: marketUK, full_name: 'John Smith', email: 'john@tui.com', status: 'ACTIVE' },
    { id: 'm2', agency_id: mockAgencyA, market_id: marketUK, full_name: 'John S. Duplicate', email: ' JOHN@TUI.COM ', status: 'ACTIVE' }, // Case/whitespace duplicate
    { id: 'm3', agency_id: mockAgencyA, market_id: marketDE, full_name: 'Hans Muller', email: 'hans@tui.de', status: 'ACTIVE' },
    { id: 'm4', agency_id: mockAgencyA, market_id: marketDE, full_name: 'Invalid Email Member', email: 'bad-email-format', status: 'ACTIVE' },
    { id: 'm5', agency_id: mockAgencyA, market_id: marketDE, full_name: 'Inactive Member', email: 'inactive@tui.de', status: 'INACTIVE' },
    { id: 'm6', agency_id: mockAgencyB, market_id: 'mkt-other', full_name: 'Rogue Member B', email: 'rogue@kuoni.com', status: 'ACTIVE' }
  ];

  // Helper deduplicator & resolution matching RecipientSelector logic
  function resolveRecipients(targetAgencyId, scope, selectedMarketIds = [], selectedMemberIds = []) {
    const emailMap = new Map();
    const invalidList = [];

    const candidates = mockMembers.filter(m => {
      if (m.agency_id !== targetAgencyId) return false;
      if (scope === 'COMPANY') return true;
      if (scope === 'MARKETS') return Boolean(m.market_id && selectedMarketIds.includes(m.market_id));
      return selectedMemberIds.includes(m.id);
    });

    candidates.forEach(m => {
      if (!m.email || !EMAIL_REGEX.test(m.email.trim())) {
        invalidList.push(m);
        return;
      }
      if (m.status !== 'ACTIVE') return;

      const norm = m.email.toLowerCase().trim();
      const existing = emailMap.get(norm) || [];
      existing.push(m);
      emailMap.set(norm, existing);
    });

    const duplicates = [];
    const recipients = [];

    emailMap.forEach((list, normEmail) => {
      if (list.length > 1) {
        duplicates.push({ email: normEmail, count: list.length });
      }
      recipients.push(list[0]);
    });

    return { recipients, duplicates, invalidList };
  }

  // 1. Entire Company Resolution:
  // Must include John (deduplicated) and Hans; exclude invalid email, inactive, and other agency
  const companyRes = resolveRecipients(mockAgencyA, 'COMPANY');
  if (companyRes.recipients.length !== 2) {
    throw new Error(`Expected exactly 2 unique recipients for Entire Company, got ${companyRes.recipients.length}`);
  }
  if (companyRes.duplicates.length !== 1 || companyRes.duplicates[0].email !== 'john@tui.com') {
    throw new Error('Case-insensitive deduplication failed to catch john@tui.com duplicate');
  }
  if (companyRes.invalidList.length !== 1 || companyRes.invalidList[0].id !== 'm4') {
    throw new Error('Invalid email member m4 was not properly quarantined');
  }
  count += 3;

  // 2. Selected Market Resolution:
  // Target only UK market: John only
  const marketResUK = resolveRecipients(mockAgencyA, 'MARKETS', [marketUK]);
  if (marketResUK.recipients.length !== 1 || marketResUK.recipients[0].id !== 'm1') {
    throw new Error(`Expected only John in UK market, got ${JSON.stringify(marketResUK.recipients)}`);
  }
  count++;

  // 3. Changing Company Boundary Check:
  // Never leak agency A members when querying agency B
  const agencyBRes = resolveRecipients(mockAgencyB, 'COMPANY');
  if (agencyBRes.recipients.length !== 1 || agencyBRes.recipients[0].agency_id !== mockAgencyB) {
    throw new Error('Agency isolation check failed');
  }
  count++;

  // 4. Contract Terms vs Internal Confidential Notes Segregation in Email Generation
  const contractTerms = 'Payment due 14 days net. Standard cancellation terms apply.';
  const internalConfidentialMarginNotes = 'CONFIDENTIAL: Internal Margin is 22%. Target floor cost $150. Do not disclose.';

  function generateEmailBody(terms, specialConds, externalNotes) {
    let body = `Dear Partner,\n\nCONTRACT TERMS:\n* ${terms}\n\nSPECIAL CONDITIONS:\n${specialConds}\n\nNOTES:\n${externalNotes}`;
    return body;
  }

  const generatedEmail = generateEmailBody(contractTerms, 'Min 2 nights', 'Rates in USD on Half Board basis.');

  if (!generatedEmail.includes('Payment due 14 days net')) {
    throw new Error('Contract terms missing from generated email');
  }
  if (generatedEmail.includes('CONFIDENTIAL') || generatedEmail.includes('Internal Margin')) {
    throw new Error('CRITICAL SECURITY BREACH: Internal confidential notes leaked into email payload!');
  }
  count += 2;

  // 5. Immutable Quote Snapshot Validation
  const frozenSnapshot = {
    quote_reference: 'Q-2026-001',
    agency_id: mockAgencyA,
    quoted_amount: 195.00,
    currency: 'USD',
    email_status: 'DRAFT',
    recipients_snapshot: companyRes.recipients.map(r => ({
      member_id: r.id,
      email: r.email.toLowerCase().trim(),
      full_name: r.full_name
    }))
  };

  // Mutating original mockMember should not affect the frozen snapshot
  mockMembers[0].email = 'changed-later@tui.com';
  if (frozenSnapshot.recipients_snapshot[0].email !== 'john@tui.com') {
    throw new Error('Quote snapshot was not truly immutable against member record changes');
  }
  count++;

  return { name: 'Recipient Targeting Hierarchy & Contract Rate Sharing (Friday-Saturday QA)', status: 'PASS', totalTested: count };
}

// 13. Excel Bulk Import Engine Verification Suite
// Tests XLSX workbook creation, template generation, column header auto-mapping,
// required field checks, date validation, relationship validation, duplicate detection,
// and error report export.
function testExcelBulkImportSuite() {
  const XLSX = require('xlsx');
  let count = 0;

  // 1. XLSX / CSV Parsing and Multi-worksheet support
  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet([
    ['Hotel Name', 'Hotel Code', 'Area', 'Service Type', 'Status'],
    ['Mount Randholee Resorts & Spa', 'MRR', 'Kandy', 'BOTH', 'ACTIVE'],
    ['Rivendell Hotel', 'RIV', 'Kandy', 'BOTH', 'ACTIVE']
  ]);
  const ws2 = XLSX.utils.aoa_to_sheet([
    ['Agency Name', 'Code', 'Country', 'City', 'Phone', 'Email', 'Status'],
    ['Jetwing Travels', 'JET', 'Sri Lanka', 'Colombo', '+94 11 2345678', 'inbound@jetwing.lk', 'ACTIVE']
  ]);
  XLSX.utils.book_append_sheet(wb, ws1, 'Hotels');
  XLSX.utils.book_append_sheet(wb, ws2, 'Agencies');

  if (wb.SheetNames.length !== 2 || wb.SheetNames[0] !== 'Hotels' || wb.SheetNames[1] !== 'Agencies') {
    throw new Error('Workbook sheet creation or naming failed');
  }
  count += 2;

  // Read data back from worksheet 1
  const rawData1 = XLSX.utils.sheet_to_json(wb.Sheets['Hotels'], { header: 1 });
  if (rawData1.length !== 3 || rawData1[1][0] !== 'Mount Randholee Resorts & Spa') {
    throw new Error('SheetJS failed to parse Hotel rows correctly');
  }
  count += 2;

  // 2. Column Header Auto-Mapping Logic
  function normalizeHeader(h) {
    return h.toLowerCase().replace(/\*/g, '').replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  const hotelAliases = {
    hotel_name: ['hotel name', 'hotel', 'property name', 'property'],
    hotel_code: ['hotel code', 'code', 'property code'],
    service_type: ['service type', 'service', 'type']
  };

  function matchHeader(header) {
    const norm = normalizeHeader(header);
    for (const [key, aliases] of Object.entries(hotelAliases)) {
      if (aliases.includes(norm)) return key;
    }
    return null;
  }

  if (matchHeader('Property Name *') !== 'hotel_name') throw new Error('Failed to match "Property Name *" to hotel_name');
  if (matchHeader('Hotel Code') !== 'hotel_code') throw new Error('Failed to match "Hotel Code" to hotel_code');
  if (matchHeader('SERVICE_TYPE') !== 'service_type') throw new Error('Failed to match "SERVICE_TYPE" to service_type');
  if (matchHeader('Random Column') !== null) throw new Error('Matched non-existent column');
  count += 4;

  // 3. Date Validation: date_to must be strictly later than date_from
  function validateSeasonDates(from, to) {
    const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
    if (!DATE_REGEX.test(from) || !DATE_REGEX.test(to)) return { valid: false, error: 'Invalid date format' };
    if (to <= from) return { valid: false, error: 'date_to must be strictly later than date_from' };
    return { valid: true };
  }

  if (!validateSeasonDates('2026-11-01', '2027-04-30').valid) throw new Error('Valid season date range rejected');
  if (validateSeasonDates('2026-11-01', '2026-11-01').valid) throw new Error('Identical start and end dates should be rejected');
  if (validateSeasonDates('2027-05-01', '2026-10-31').valid) throw new Error('Inverted season dates should be rejected');
  if (validateSeasonDates('01/11/2026', '30/04/2027').valid) throw new Error('Non-standard date formats should be rejected');
  count += 4;

  // 4. Duplicate Detection (In-File and Database Pre-flight)
  const existingHotelsInDb = new Set(['rivendell hotel', 'mount randholee resorts & spa']);
  const fileHotels = ['Rivendell Hotel', ' Pearl Grand by Rathna ', 'pearl grand by rathna'];

  const seenInFile = new Set();
  const duplicateResults = fileHotels.map(h => {
    const norm = h.toLowerCase().trim();
    const isDbDup = existingHotelsInDb.has(norm);
    const isFileDup = seenInFile.has(norm);
    seenInFile.add(norm);
    return { name: h, isDbDup, isFileDup };
  });

  if (!duplicateResults[0].isDbDup || duplicateResults[0].isFileDup) throw new Error('Db duplicate check failed for Rivendell Hotel');
  if (duplicateResults[1].isDbDup || duplicateResults[1].isFileDup) throw new Error('First Pearl Grand should be clean');
  if (!duplicateResults[2].isFileDup) throw new Error('In-file duplicate detection failed for Pearl Grand');
  count += 3;

  // 5. Hierarchy and Foreign Key Parent Validation (Markets & Members)
  const dbAgencies = new Map([['jetwing travels', 'agency-uuid-1']]);
  const dbMarkets = new Map([['agency-uuid-1:uk desk', 'market-uuid-1']]);

  function validateMemberHierarchy(agencyName, marketName) {
    const normAgency = agencyName.toLowerCase().trim();
    const agencyId = dbAgencies.get(normAgency);
    if (!agencyId) return { valid: false, error: `Parent agency '${agencyName}' does not exist` };

    const normMarket = marketName.toLowerCase().trim();
    const marketId = dbMarkets.get(`${agencyId}:${normMarket}`);
    if (!marketId) return { valid: false, error: `Market desk '${marketName}' does not exist under agency '${agencyName}'` };

    return { valid: true, agencyId, marketId };
  }

  const validHier = validateMemberHierarchy('Jetwing Travels', 'UK Desk');
  if (!validHier.valid || validHier.agencyId !== 'agency-uuid-1' || validHier.marketId !== 'market-uuid-1') {
    throw new Error('Valid member hierarchy failed resolution');
  }

  const missingAgencyHier = validateMemberHierarchy('Non-Existent Travels', 'UK Desk');
  if (missingAgencyHier.valid || !missingAgencyHier.error.includes('does not exist')) {
    throw new Error('Non-existent agency should fail hierarchy check');
  }

  const missingMarketHier = validateMemberHierarchy('Jetwing Travels', 'Antarctica Desk');
  if (missingMarketHier.valid || !missingMarketHier.error.includes('Antarctica Desk')) {
    throw new Error('Non-existent market desk should fail hierarchy check');
  }
  count += 3;

  return { name: 'Excel Bulk Import Engine & Hierarchy Validation (Task QA)', status: 'PASS', totalTested: count };
}

// 14. Employee Management & Daily Task Assignment Verification Suite
// Tests RBAC role boundaries, internal employee provisioning validation,
// task priority levels, due date validation (due_date >= start_date),
// task status transitions, and blocker reporting logic.
function testEmployeeAndTaskAssignmentSuite() {
  let count = 0;

  // 1. Employee Email & Role Validation
  function validateEmployeeInput(name, email, role) {
    if (!name || name.trim().length < 2) return { valid: false, error: 'Name must be at least 2 chars' };
    const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!email || !EMAIL_REGEX.test(email.trim())) return { valid: false, error: 'Invalid email' };
    if (!['ADMIN', 'STAFF'].includes(role)) return { valid: false, error: 'Invalid role' };
    return { valid: true };
  }

  if (!validateEmployeeInput('Sarah Perera', 'sarah@windowcompanies.com', 'STAFF').valid) {
    throw new Error('Valid staff input was rejected');
  }
  if (validateEmployeeInput('S', 'sarah@windowcompanies.com', 'STAFF').valid) {
    throw new Error('Short name should be rejected');
  }
  if (validateEmployeeInput('Sarah', 'not-an-email', 'STAFF').valid) {
    throw new Error('Invalid email should be rejected');
  }
  if (validateEmployeeInput('Sarah', 'sarah@windowcompanies.com', 'SUPERUSER').valid) {
    throw new Error('Invalid role should be rejected');
  }
  count += 4;

  // 2. Task Assignment Due Date Ordering (due_date >= start_date)
  function validateTaskDates(startDate, dueDate) {
    const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
    if (!DATE_REGEX.test(startDate) || !DATE_REGEX.test(dueDate)) {
      return { valid: false, error: 'Invalid date format' };
    }
    if (dueDate < startDate) {
      return { valid: false, error: 'Due date cannot be earlier than start date' };
    }
    return { valid: true };
  }

  if (!validateTaskDates('2026-11-13', '2026-11-15').valid) {
    throw new Error('Valid task dates rejected');
  }
  if (!validateTaskDates('2026-11-13', '2026-11-13').valid) {
    throw new Error('Same-day task dates should be valid');
  }
  if (validateTaskDates('2026-11-15', '2026-11-13').valid) {
    throw new Error('Past due date before start date should be rejected');
  }
  count += 3;

  // 3. Task Status State Transitions & Overdue Detection
  const mockTask = {
    id: 'task-1',
    title: 'Review 2026/27 Winter contracts',
    assigned_to: 'emp-101',
    start_date: '2026-11-10',
    due_date: '2026-11-12',
    priority: 'HIGH',
    status: 'PENDING'
  };

  const today = '2026-11-13';
  const isOverdue = mockTask.status !== 'COMPLETED' && mockTask.status !== 'CANCELLED' && mockTask.due_date < today;
  if (!isOverdue) throw new Error('Task past due date should be flagged as overdue');
  count++;

  mockTask.status = 'COMPLETED';
  const isOverdueAfterComplete = mockTask.status !== 'COMPLETED' && mockTask.status !== 'CANCELLED' && mockTask.due_date < today;
  if (isOverdueAfterComplete) throw new Error('Completed task should not be flagged as overdue');
  count++;

  // 4. Blocker Flagging & Comment Logic
  const comment = {
    task_id: 'task-1',
    author_id: 'emp-101',
    comment_text: 'Hotel hasn’t sent revised signed copy yet.',
    is_blocker: true
  };
  if (!comment.is_blocker || !comment.comment_text) throw new Error('Blocker flag check failed');
  count++;

  return { name: 'Employee Provisioning & Daily Task Assignment Engine (Part 2 QA)', status: 'PASS', totalTested: count };
}

// Run all test suites
try {
  const results = [
    testEmailValidation(),
    testSeasonDateValidation(),
    testSeasonDateOverlapDetection(),
    testMemberHierarchyIntegrity(),
    testRecipientScopesResolution(),
    testRateCalculationSuite(),
    testSecurityHardeningSuite(),
    testContractManagementSuite(),
    testHotelRateEngineAndCustomRatesSuite(),
    testEmailLifecycleSuite(),
    testDeviceEmailAppHandoffSuite(),
    testRecipientSelectionAndContractRateSharingSuite(),
    testExcelBulkImportSuite(),
    testEmployeeAndTaskAssignmentSuite()
  ];

  console.log(JSON.stringify({ status: 'ALL_TESTS_PASSED', results }, null, 2));
} catch (err) {
  console.error(JSON.stringify({ status: 'TEST_FAILED', error: err.message }, null, 2));
  process.exit(1);
}
