/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Gender = 'MALE' | 'FEMALE';

export type HeirType = 
  | 'HUSBAND' | 'WIFE'
  | 'SON' | 'DAUGHTER'
  | 'FATHER' | 'MOTHER'
  | 'GRANDFATHER' | 'GRANDMOTHER'
  | 'GRANDSON' | 'GRANDDAUGHTER'
  | 'BROTHER_GERMAN' | 'SISTER_GERMAN'
  | 'BROTHER_FATHER' | 'SISTER_FATHER'
  | 'BROTHER_MOTHER' | 'SISTER_MOTHER'
  | 'UNCLE_GERMAN' | 'UNCLE_FATHER'
  | 'SON_BROTHER_GERMAN' | 'SON_BROTHER_FATHER';

export interface HeirInput {
  id: string;
  type: HeirType;
  count: number;
  isSubstitute?: boolean; // Ahli Waris Pengganti (KHI)
}

export interface AssetData {
  totalAssets: number;
  debts: number;
  funeralCosts: number;
  will: number; // Max 1/3
  isJointProperty: boolean; // Harta Bersama (50% split)
  familyName?: string;
  deceasedGender: Gender;
}

export interface DistributionResult {
  heirType: HeirType;
  label: string;
  count: number;
  shareDescription: string;
  fraction: { numerator: number; denominator: number };
  siham: number;
  amount: number;
  isAshabah: boolean;
  dalil: string;
  detailedDalil?: string;
  isBlocked: boolean;
  blockedBy?: string;
}

export interface FaraidCalculation {
  initialAssets: number;
  afterJointProperty: number;
  afterPreDistribution: number;
  distributions: DistributionResult[];
  totalNumerator: number;
  baseDenominator: number;
  initialBaseDenominator: number;
  adjustmentType?: 'AUL' | 'RADD' | 'NORMAL';
  hasInkisar: boolean;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  assets: AssetData;
  heirs: { id: string; type: HeirType; gender: 'MALE' | 'FEMALE' }[];
  calculation: FaraidCalculation;
}
