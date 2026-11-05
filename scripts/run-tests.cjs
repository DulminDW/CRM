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

// Run all test suites
try {
  const results = [
    testEmailValidation(),
    testSeasonDateValidation(),
    testSeasonDateOverlapDetection(),
    testMemberHierarchyIntegrity(),
    testRecipientScopesResolution(),
    testRateCalculationSuite()
  ];

  console.log(JSON.stringify({ status: 'ALL_TESTS_PASSED', results }, null, 2));
} catch (err) {
  console.error(JSON.stringify({ status: 'TEST_FAILED', error: err.message }, null, 2));
  process.exit(1);
}
