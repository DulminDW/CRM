import { supabase } from '../lib/supabase';

export type CalculationAdjustmentType = 'FIXED' | 'PERCENTAGE';
export type CalculationAdjustmentDirection = 'ADD' | 'DEDUCT';
export type CalculationScope = 'PER_ROOM' | 'PER_PERSON';

export interface RoomRowConfig {
  id: string; // e.g. 'SGL', 'DBL', 'TPL', 'QUAD', 'FAMILY'
  label: string; // e.g. 'Single', 'Double', 'Triple', 'Quadruple'
  occupancyCount: number; // e.g. 1, 2, 3, 4
  enabled: boolean;
  order: number;
}

export interface MealPlanColumnConfig {
  id: string; // e.g. 'BB', 'HB', 'FB', 'RO'
  label: string; // e.g. 'BB', 'HB', 'FB'
  enabled: boolean;
  order: number;
}

export interface AdjustmentRule {
  id: string;
  targetType: 'OCCUPANCY' | 'MEAL_PLAN' | 'CELL';
  targetRowId?: string; // e.g. 'SGL', 'TPL', 'QUAD'
  targetMealId?: string; // e.g. 'BB', 'FB'
  type: CalculationAdjustmentType; // 'FIXED' or 'PERCENTAGE'
  direction: CalculationAdjustmentDirection; // 'ADD' or 'DEDUCT'
  scope: CalculationScope; // 'PER_ROOM' or 'PER_PERSON'
  value: number; // amount or percentage
  currency?: string;
  notes?: string;
}

export interface RateCalculationSetupConfig {
  anchorRowId: string; // default 'DBL'
  anchorMealId: string; // default 'HB'
  roomRows: RoomRowConfig[];
  mealColumns: MealPlanColumnConfig[];
  occupancyAdjustments: Record<string, AdjustmentRule>; // targetRowId -> rule
  mealAdjustments: Record<string, AdjustmentRule>; // targetMealId -> rule
  cellAdjustments?: Record<string, AdjustmentRule>; // "rowId:mealId" -> rule
  currency: string;
  decimalPrecision: number;
}

export interface SavedCalculationSetup {
  id: string;
  setup_name: string;
  description?: string | null;
  config: RateCalculationSetupConfig;
  created_by: string;
  creator_name?: string | null;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  version_number: number;
}

export type CellValueStatus = 
  | 'ANCHOR_INPUT' 
  | 'AUTO_CALCULATED' 
  | 'MANUAL_OVERRIDE' 
  | 'SOURCE_IMPORTED' 
  | 'NOT_CONFIGURED';

export interface CalculatedRateCell {
  rowId: string;
  mealId: string;
  value: number | null;
  calculatedValue: number | null;
  status: CellValueStatus;
  ruleExplanation?: string;
  overriddenBy?: string;
  overriddenAt?: string;
}

export interface WorkingRateGrid {
  anchorValue: number | null;
  config: RateCalculationSetupConfig;
  cells: Record<string, CalculatedRateCell>; // key: `${rowId}:${mealId}`
}

/**
 * Creates default calculation configuration
 */
export function createDefaultCalculationConfig(): RateCalculationSetupConfig {
  return {
    anchorRowId: 'DBL',
    anchorMealId: 'HB',
    currency: 'USD',
    decimalPrecision: 2,
    roomRows: [
      { id: 'SGL', label: 'Single', occupancyCount: 1, enabled: true, order: 1 },
      { id: 'DBL', label: 'Double', occupancyCount: 2, enabled: true, order: 2 },
      { id: 'TPL', label: 'Triple', occupancyCount: 3, enabled: true, order: 3 },
      { id: 'QUAD', label: 'Quadruple', occupancyCount: 4, enabled: true, order: 4 },
      { id: 'FAMILY', label: 'Family', occupancyCount: 4, enabled: false, order: 5 }
    ],
    mealColumns: [
      { id: 'BB', label: 'BB', enabled: true, order: 1 },
      { id: 'HB', label: 'HB', enabled: true, order: 2 },
      { id: 'FB', label: 'FB', enabled: true, order: 3 }
    ],
    occupancyAdjustments: {
      SGL: {
        id: 'adj_sgl',
        targetType: 'OCCUPANCY',
        targetRowId: 'SGL',
        type: 'FIXED',
        direction: 'DEDUCT',
        scope: 'PER_ROOM',
        value: 10,
        notes: 'Single deduction from Double HB base'
      },
      TPL: {
        id: 'adj_tpl',
        targetType: 'OCCUPANCY',
        targetRowId: 'TPL',
        type: 'FIXED',
        direction: 'ADD',
        scope: 'PER_ROOM',
        value: 25,
        notes: 'Triple supplement over Double HB base'
      },
      QUAD: {
        id: 'adj_quad',
        targetType: 'OCCUPANCY',
        targetRowId: 'QUAD',
        type: 'FIXED',
        direction: 'ADD',
        scope: 'PER_ROOM',
        value: 50,
        notes: 'Quadruple supplement over Double HB base'
      }
    },
    mealAdjustments: {
      BB: {
        id: 'adj_bb',
        targetType: 'MEAL_PLAN',
        targetMealId: 'BB',
        type: 'FIXED',
        direction: 'DEDUCT',
        scope: 'PER_ROOM',
        value: 10,
        notes: 'BB reduction from HB'
      },
      FB: {
        id: 'adj_fb',
        targetType: 'MEAL_PLAN',
        targetMealId: 'FB',
        type: 'FIXED',
        direction: 'ADD',
        scope: 'PER_ROOM',
        value: 15,
        notes: 'FB supplement over HB'
      }
    }
  };
}

/**
 * Pure calculation function: calculates all cells in the grid
 */
export function calculateRateGrid(
  anchorValue: number | null,
  config: RateCalculationSetupConfig,
  existingCells: Record<string, CalculatedRateCell> = {}
): Record<string, CalculatedRateCell> {
  const result: Record<string, CalculatedRateCell> = {};
  const anchorRow = config.anchorRowId;
  const anchorMeal = config.anchorMealId;

  const enabledRows = config.roomRows.filter((r) => r.enabled);
  const enabledMeals = config.mealColumns.filter((m) => m.enabled);

  // If anchor is null or invalid
  if (anchorValue === null || isNaN(anchorValue) || anchorValue <= 0) {
    for (const r of enabledRows) {
      for (const m of enabledMeals) {
        const key = `${r.id}:${m.id}`;
        const existing = existingCells[key];
        if (existing && existing.status === 'MANUAL_OVERRIDE' && existing.value !== null) {
          result[key] = {
            ...existing,
            calculatedValue: null,
            ruleExplanation: 'Manual override retained (anchor missing)'
          };
        } else if (existing && existing.status === 'SOURCE_IMPORTED') {
          result[key] = { ...existing };
        } else {
          result[key] = {
            rowId: r.id,
            mealId: m.id,
            value: null,
            calculatedValue: null,
            status: 'NOT_CONFIGURED',
            ruleExplanation: 'Enter an anchor rate (e.g. Double HB) to calculate'
          };
        }
      }
    }
    return result;
  }

  // 1. Calculate anchor meal values for all enabled rows
  const rowAnchorValues: Record<string, { value: number; explanation: string }> = {};
  rowAnchorValues[anchorRow] = {
    value: anchorValue,
    explanation: 'Anchor base input'
  };

  for (const r of enabledRows) {
    if (r.id === anchorRow) continue;

    const rule = config.occupancyAdjustments[r.id];
    if (!rule || rule.value === undefined || rule.value === null) {
      // Missing rule for this occupancy
      continue;
    }

    let calculatedRowBase = anchorValue;
    let stepAmount = 0;
    if (rule.type === 'PERCENTAGE') {
      stepAmount = (anchorValue * rule.value) / 100;
    } else {
      stepAmount = rule.value;
    }

    if (rule.direction === 'ADD') {
      calculatedRowBase += stepAmount;
    } else {
      calculatedRowBase -= stepAmount;
    }

    const precision = config.decimalPrecision ?? 2;
    const roundedValue = Number(calculatedRowBase.toFixed(precision));
    const sign = rule.direction === 'ADD' ? '+' : '-';
    const unit = rule.type === 'PERCENTAGE' ? '%' : (config.currency || 'USD');
    rowAnchorValues[r.id] = {
      value: roundedValue,
      explanation: `${r.label} ${anchorMeal} = Anchor (${anchorValue}) ${sign} ${rule.value} ${unit} [${rule.scope}]`
    };
  }

  // 2. For each row and each meal plan, compute rate
  for (const r of enabledRows) {
    const baseObj = rowAnchorValues[r.id];

    for (const m of enabledMeals) {
      const key = `${r.id}:${m.id}`;
      const existing = existingCells[key];

      // If user has manually overridden this cell, preserve it!
      if (existing && existing.status === 'MANUAL_OVERRIDE' && existing.value !== null) {
        // Compute what auto would be for display/reset
        let prospectiveAuto: number | null = null;
        let prospectiveExplanation = 'Preserved manual override';

        if (baseObj) {
          if (m.id === anchorMeal) {
            prospectiveAuto = baseObj.value;
            prospectiveExplanation = baseObj.explanation;
          } else {
            const mealRule = config.mealAdjustments[m.id];
            if (mealRule && mealRule.value !== undefined && mealRule.value !== null) {
              let diff = 0;
              if (mealRule.type === 'PERCENTAGE') {
                diff = (baseObj.value * mealRule.value) / 100;
              } else {
                if (mealRule.scope === 'PER_PERSON') {
                  diff = mealRule.value * r.occupancyCount;
                } else {
                  diff = mealRule.value;
                }
              }
              const calcVal = mealRule.direction === 'ADD' ? baseObj.value + diff : baseObj.value - diff;
              prospectiveAuto = Number(calcVal.toFixed(config.decimalPrecision ?? 2));
              prospectiveExplanation = `${r.label} ${m.label} auto would be ${prospectiveAuto}`;
            }
          }
        }

        result[key] = {
          rowId: r.id,
          mealId: m.id,
          value: existing.value,
          calculatedValue: prospectiveAuto,
          status: 'MANUAL_OVERRIDE',
          ruleExplanation: prospectiveExplanation,
          overriddenBy: existing.overriddenBy,
          overriddenAt: existing.overriddenAt
        };
        continue;
      }

      // If source imported, keep unchanged
      if (existing && existing.status === 'SOURCE_IMPORTED') {
        result[key] = { ...existing };
        continue;
      }

      // If this is the Anchor cell itself
      if (r.id === anchorRow && m.id === anchorMeal) {
        result[key] = {
          rowId: r.id,
          mealId: m.id,
          value: anchorValue,
          calculatedValue: anchorValue,
          status: 'ANCHOR_INPUT',
          ruleExplanation: 'Primary anchor base rate'
        };
        continue;
      }

      // If occupancy base couldn't be calculated
      if (!baseObj) {
        result[key] = {
          rowId: r.id,
          mealId: m.id,
          value: null,
          calculatedValue: null,
          status: 'NOT_CONFIGURED',
          ruleExplanation: `No occupancy adjustment configured for ${r.label}`
        };
        continue;
      }

      // If this is the row's anchor meal (e.g. Single HB, Triple HB)
      if (m.id === anchorMeal) {
        result[key] = {
          rowId: r.id,
          mealId: m.id,
          value: baseObj.value,
          calculatedValue: baseObj.value,
          status: 'AUTO_CALCULATED',
          ruleExplanation: baseObj.explanation
        };
        continue;
      }

      // Meal plan adjustment from row base
      const mealRule = config.mealAdjustments[m.id];
      if (!mealRule || mealRule.value === undefined || mealRule.value === null) {
        result[key] = {
          rowId: r.id,
          mealId: m.id,
          value: null,
          calculatedValue: null,
          status: 'NOT_CONFIGURED',
          ruleExplanation: `No meal adjustment configured for ${m.label}`
        };
        continue;
      }

      let diff = 0;
      if (mealRule.type === 'PERCENTAGE') {
        diff = (baseObj.value * mealRule.value) / 100;
      } else {
        if (mealRule.scope === 'PER_PERSON') {
          diff = mealRule.value * r.occupancyCount;
        } else {
          diff = mealRule.value;
        }
      }

      const finalVal = mealRule.direction === 'ADD' ? baseObj.value + diff : baseObj.value - diff;
      const precision = config.decimalPrecision ?? 2;
      const rounded = Number(finalVal.toFixed(precision));
      const mSign = mealRule.direction === 'ADD' ? '+' : '-';
      const mUnit = mealRule.type === 'PERCENTAGE' ? '%' : (config.currency || 'USD');
      const perText = mealRule.scope === 'PER_PERSON' ? ` (${r.occupancyCount} pax × ${mealRule.value})` : '';

      result[key] = {
        rowId: r.id,
        mealId: m.id,
        value: rounded,
        calculatedValue: rounded,
        status: 'AUTO_CALCULATED',
        ruleExplanation: `${r.label} ${m.label} = ${r.label} ${anchorMeal} (${baseObj.value}) ${mSign} ${diff} ${mUnit}${perText}`
      };
    }
  }

  return result;
}

const LOCAL_STORAGE_KEY = 'window_crm_saved_rate_setups_v1';

export const calculationSetupService = {
  /**
   * List all saved calculation setups (from Supabase if available, fallback to localStorage)
   */
  async getSavedSetups(): Promise<SavedCalculationSetup[]> {
    try {
      const { data, error } = await supabase
        .from('rate_calculation_setups')
        .select('*')
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as SavedCalculationSetup[];
      }
    } catch {
      // Table may not be deployed yet in current phase
    }

    // Local fallback
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((s: SavedCalculationSetup) => !s.is_archived) : [];
      }
    } catch (e) {
      console.warn('Failed to parse setups from localStorage:', e);
    }
    return [];
  },

  /**
   * Save a calculation setup
   */
  async saveSetup(
    name: string,
    description: string | null,
    config: RateCalculationSetupConfig,
    userId: string,
    userName?: string
  ): Promise<SavedCalculationSetup> {
    const newSetup: SavedCalculationSetup = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `setup_${Date.now()}`,
      setup_name: name.trim(),
      description: description ? description.trim() : null,
      config: JSON.parse(JSON.stringify(config)),
      created_by: userId,
      creator_name: userName || 'Authorized Staff',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_archived: false,
      version_number: 1
    };

    // Try Supabase insert
    try {
      const { data, error } = await supabase
        .from('rate_calculation_setups')
        .insert([{
          id: newSetup.id,
          setup_name: newSetup.setup_name,
          description: newSetup.description,
          config: newSetup.config,
          created_by: userId,
          created_at: newSetup.created_at,
          updated_at: newSetup.updated_at,
          is_archived: false,
          version_number: 1
        }])
        .select()
        .single();

      if (!error && data) {
        return data as SavedCalculationSetup;
      }
    } catch {
      // Fallback to local storage persistence
    }

    // LocalStorage fallback
    try {
      const existing = await this.getSavedSetups();
      const updated = [newSetup, ...existing.filter((s) => s.id !== newSetup.id)];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }

    return newSetup;
  },

  /**
   * Update an existing setup
   */
  async updateSetup(
    id: string,
    updates: Partial<Pick<SavedCalculationSetup, 'setup_name' | 'description' | 'config' | 'is_archived'>>,
    userId: string
  ): Promise<void> {
    void userId;
    try {
      await supabase
        .from('rate_calculation_setups')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
    } catch {
      // Local fallback
    }

    try {
      const existing = await this.getSavedSetups();
      const idx = existing.findIndex((s) => s.id === id);
      if (idx !== -1) {
        existing[idx] = {
          ...existing[idx]!,
          ...updates,
          updated_at: new Date().toISOString(),
          version_number: (existing[idx]?.version_number || 1) + 1
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
      }
    } catch (e) {
      console.warn('LocalStorage update failed:', e);
    }
  },

  /**
   * Archive a setup
   */
  async archiveSetup(id: string, userId: string): Promise<void> {
    void userId;
    return this.updateSetup(id, { is_archived: true }, userId);
  }
};
