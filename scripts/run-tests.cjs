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

// Run all test suites
try {
  const results = [
    testEmailValidation(),
    testSeasonDateValidation(),
    testSeasonDateOverlapDetection(),
    testMemberHierarchyIntegrity()
  ];

  console.log(JSON.stringify({ status: 'ALL_TESTS_PASSED', results }, null, 2));
} catch (err) {
  console.error(JSON.stringify({ status: 'TEST_FAILED', error: err.message }, null, 2));
  process.exit(1);
}
