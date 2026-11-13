/**
 * WINDOW COMPANIES CRM — RATE CALCULATION ENGINE
 * Pure, testable hotel rate calculation service implementing verified company rules,
 * component breakdowns, formula validation states, and occupancy/meal plan arithmetic.
 */

export type RateCategory = 'RED' | 'GREEN' | 'YELLOW';
export type OccupancyType = 'SINGLE' | 'DOUBLE' | 'TRIPLE';
export type MealPlanType = 'BB' | 'HB';

export interface HotelRateComponentValues {
  hbDoubleBaseRate: number;
  singleReductionAmount: number;
  singleReductionUnit?: 'PER_ROOM_PER_NIGHT' | 'PER_PERSON_PER_NIGHT';
  tripleSupplementAmount: number;
  tripleSupplementUnit?: 'PER_ROOM_PER_NIGHT' | 'PER_PERSON_PER_NIGHT';
  bbReductionAmount: number;
  bbReductionUnit?: 'PER_ROOM_PER_NIGHT' | 'PER_PERSON_PER_NIGHT';
}

export interface CalculationInput {
  hotelId: string;
  hotelName: string;
  seasonId: string;
  seasonLabel: string;
  rateCategory: RateCategory;
  occupancy: OccupancyType;
  mealPlan: MealPlanType;
  components: HotelRateComponentValues;
  currency?: string;
  isFormulaVerified?: boolean;
}

export interface StepBreakdown {
  step: string;
  operation: 'BASE' | 'DEDUCTION' | 'SUPPLEMENT';
  amountDelta: number;
  subtotal: number;
  explanation: string;
}

export interface CalculationResult {
  finalRate: number;
  currency: string;
  isFormulaVerified: boolean;
  occupancy: OccupancyType;
  mealPlan: MealPlanType;
  rateCategory: RateCategory;
  breakdown: StepBreakdown[];
  warnings: string[];
}

export const rateCalculationService = {
  /**
   * Verified calculations for Hotel Rates
   * Double HB is the standard anchor.
   * Single = Double - Single Reduction
   * Triple = Double + Triple Supplement
   * BB = HB - BB Reduction
   */
  calculateRate(input: CalculationInput): CalculationResult {
    const currency = input.currency || 'USD';
    const warnings: string[] = [];
    const breakdown: StepBreakdown[] = [];

    const base = Number(input.components.hbDoubleBaseRate) || 0;
    if (base <= 0) {
      warnings.push('HB Double Base Rate is 0 or unset. Calculations are pending valid base rate.');
    }

    let runningTotal = base;
    breakdown.push({
      step: 'Double HB Base Anchor',
      operation: 'BASE',
      amountDelta: base,
      subtotal: runningTotal,
      explanation: `Anchor base rate for Double room on Half Board (HB): ${currency} ${base.toFixed(2)}`
    });

    // 1. Occupancy adjustment (relative to Double)
    if (input.occupancy === 'SINGLE') {
      const singleRed = Number(input.components.singleReductionAmount) || 0;
      runningTotal = Math.max(0, runningTotal - singleRed);
      breakdown.push({
        step: 'Single Room Occupancy Deduction',
        operation: 'DEDUCTION',
        amountDelta: -singleRed,
        subtotal: runningTotal,
        explanation: `Deducted Single Room Reduction: -${currency} ${singleRed.toFixed(2)}`
      });
    } else if (input.occupancy === 'TRIPLE') {
      const tripleSupp = Number(input.components.tripleSupplementAmount) || 0;
      runningTotal = runningTotal + tripleSupp;
      breakdown.push({
        step: 'Triple Room Occupancy Supplement',
        operation: 'SUPPLEMENT',
        amountDelta: tripleSupp,
        subtotal: runningTotal,
        explanation: `Added Triple Room Supplement: +${currency} ${tripleSupp.toFixed(2)}`
      });
    }

    // 2. Meal Plan adjustment (relative to HB)
    if (input.mealPlan === 'BB') {
      const bbRed = Number(input.components.bbReductionAmount) || 0;
      runningTotal = Math.max(0, runningTotal - bbRed);
      breakdown.push({
        step: 'Bed & Breakfast (BB) Meal Deduction',
        operation: 'DEDUCTION',
        amountDelta: -bbRed,
        subtotal: runningTotal,
        explanation: `Deducted BB Reduction from HB: -${currency} ${bbRed.toFixed(2)}`
      });
    }

    if (!input.isFormulaVerified) {
      warnings.push('Formula components for this hotel are pending official company Excel sign-off.');
    }

    return {
      finalRate: Math.round(runningTotal * 100) / 100,
      currency,
      isFormulaVerified: Boolean(input.isFormulaVerified),
      occupancy: input.occupancy,
      mealPlan: input.mealPlan,
      rateCategory: input.rateCategory,
      breakdown,
      warnings
    };
  },

  /**
   * Generates a 3x2 matrix (Single, Double, Triple x BB, HB)
   */
  calculateMatrix(
    hotelId: string,
    hotelName: string,
    seasonId: string,
    seasonLabel: string,
    rateCategory: RateCategory,
    components: HotelRateComponentValues,
    currency = 'USD',
    isFormulaVerified = false
  ): Record<string, CalculationResult> {
    const occupancies: OccupancyType[] = ['SINGLE', 'DOUBLE', 'TRIPLE'];
    const meals: MealPlanType[] = ['BB', 'HB'];
    const matrix: Record<string, CalculationResult> = {};

    for (const occ of occupancies) {
      for (const meal of meals) {
        const key = `${occ}_${meal}`;
        matrix[key] = this.calculateRate({
          hotelId,
          hotelName,
          seasonId,
          seasonLabel,
          rateCategory,
          occupancy: occ,
          mealPlan: meal,
          components,
          currency,
          isFormulaVerified
        });
      }
    }

    return matrix;
  }
};

