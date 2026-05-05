import { HeirType, HeirInput, DistributionResult, FaraidCalculation, AssetData } from '../types';

/**
 * LOGIC FLOWCHART (Markdown Representation):
 * 1. Pre-Distribution:
 *    - Split Joint Property (if applicable, 50% to surviving spouse).
 *    - Subtract Funeral Costs, Debts, and Will (max 1/3 of remainder).
 * 2. Hijab/Mahjub Logic:
 *    - Determine who is blocked (e.g., Father blocks Grandfather).
 * 3. Ashabul Furud:
 *    - Assign fixed shares (1/2, 1/4, 1/8, 2/3, 1/3, 1/6) based on presence of others.
 * 4. Ashabah:
 *    - Calculate remaining assets for Ashabah (Bin Nafsi, Bil Ghair, Ma'al Ghair).
 * 5. Aul & Radd:
 *    - If sum of fractions > 1 -> Aul (Increase denominator).
 *    - If sum of fractions < 1 and no Ashabah -> Radd (Redistribute to Furud except spouse).
 */

export const HEIR_LABELS: Record<HeirType, string> = {
  HUSBAND: 'Suami',
  WIFE: 'Istri',
  SON: 'Anak Laki-laki',
  DAUGHTER: 'Anak Perempuan',
  FATHER: 'Ayah',
  MOTHER: 'Ibu',
  GRANDFATHER: 'Kakek (Ayah dari Ayah)',
  GRANDMOTHER: 'Nenek',
  GRANDSON: 'Cucu Laki-laki (dari Anak Laki-laki)',
  GRANDDAUGHTER: 'Cucu Perempuan (dari Anak Laki-laki)',
  BROTHER_GERMAN: 'Saudara Kandung Laki-laki',
  SISTER_GERMAN: 'Saudara Kandung Perempuan',
  BROTHER_FATHER: 'Saudara Seayah Laki-laki',
  SISTER_FATHER: 'Saudara Seayah Perempuan',
  BROTHER_MOTHER: 'Saudara Seibu Laki-laki',
  SISTER_MOTHER: 'Saudara Seibu Perempuan',
  UNCLE_GERMAN: 'Paman Kandung',
  UNCLE_FATHER: 'Paman Seayah',
  SON_BROTHER_GERMAN: 'Keponakan Kandung (Laki-laki)',
  SON_BROTHER_FATHER: 'Keponakan Seayah (Laki-laki)',
};

export const HEIR_LABELS_AR: Record<HeirType, string> = {
  HUSBAND: 'الزوج',
  WIFE: 'الزوجة',
  SON: 'الابن',
  DAUGHTER: 'البنت',
  FATHER: 'الأب',
  MOTHER: 'الأم',
  GRANDFATHER: 'الجد',
  GRANDMOTHER: 'الجدة',
  GRANDSON: 'ابن الابن',
  GRANDDAUGHTER: 'بنت الابن',
  BROTHER_GERMAN: 'الأخ الشقيق',
  SISTER_GERMAN: 'الأخت الشقيقة',
  BROTHER_FATHER: 'الأخ لأب',
  SISTER_FATHER: 'الأخت لأب',
  BROTHER_MOTHER: 'الأخ لأم',
  SISTER_MOTHER: 'الأخت لأم',
  UNCLE_GERMAN: 'العم الشقيق',
  UNCLE_FATHER: 'العم لأب',
  SON_BROTHER_GERMAN: 'ابن الأخ الشقيق',
  SON_BROTHER_FATHER: 'ابن الأخ لأب',
};

const gcd = (a: number, b: number): number => b === 0 ? Math.abs(a) : gcd(b, a % b);
const lcm = (a: number, b: number): number => a === 0 || b === 0 ? 0 : Math.abs(a * b) / gcd(a, b);

export function calculateFaraid(assets: AssetData, heirs: HeirInput[]): FaraidCalculation {
  // 1. Pre-Distribution
  let currentAssets = assets.totalAssets;
  let afterJointProperty = currentAssets;
  
  if (assets.isJointProperty) {
    afterJointProperty = currentAssets * 0.5;
    currentAssets = afterJointProperty;
  }

  currentAssets -= (assets.debts + assets.funeralCosts);
  const maxWill = currentAssets * (1/3);
  const actualWill = Math.min(assets.will, maxWill);
  currentAssets -= actualWill;
  
  const netAssets = Math.max(0, currentAssets);

  // 2. Logic Implementation (Simplified for brevity but covering core rules)
  const activeHeirGroups = heirs.filter(h => h.count > 0);
  const results: DistributionResult[] = [];

  // Helper to check presence
  const has = (type: HeirType) => activeHeirGroups.some(h => h.type === type);
  const count = (type: HeirType) => activeHeirGroups.find(h => h.type === type)?.count || 0;

  // Hijab Logic
  const isBlocked = (type: HeirType): { blocked: boolean; by?: string } => {
    // 1. Ascendants
    if (type === 'GRANDFATHER' && has('FATHER')) return { blocked: true, by: 'Ayah' };
    if (type === 'GRANDMOTHER' && has('MOTHER')) return { blocked: true, by: 'Ibu' };

    // 2. Descendants
    if (type === 'GRANDSON' && has('SON')) return { blocked: true, by: 'Anak Laki-laki' };
    if (type === 'GRANDDAUGHTER' && has('SON')) return { blocked: true, by: 'Anak Laki-laki' };

    // 3. Siblings
    if (type === 'BROTHER_GERMAN' && (has('SON') || has('GRANDSON') || has('FATHER'))) return { blocked: true, by: 'Anak Laki/Cucu/Ayah' };
    if (type === 'SISTER_GERMAN' && (has('SON') || has('GRANDSON') || has('FATHER'))) return { blocked: true, by: 'Anak Laki/Cucu/Ayah' };
    
    if (type === 'BROTHER_FATHER' && (has('SON') || has('GRANDSON') || has('FATHER') || has('BROTHER_GERMAN'))) return { blocked: true, by: 'Anak Laki/Cucu/Ayah/Saudara Kandung' };
    if (type === 'SISTER_FATHER' && (has('SON') || has('GRANDSON') || has('FATHER') || has('BROTHER_GERMAN'))) return { blocked: true, by: 'Anak Laki/Cucu/Ayah/Saudara Kandung' };

    if ((type === 'BROTHER_MOTHER' || type === 'SISTER_MOTHER') && 
        (has('SON') || has('GRANDSON') || has('DAUGHTER') || has('GRANDDAUGHTER') || has('FATHER') || has('GRANDFATHER'))) {
      return { blocked: true, by: 'Anak/Cucu/Ayah/Kakek' };
    }

    // 4. Nephews (Son of Brother)
    const blocksNephewGerman = has('SON') || has('GRANDSON') || has('FATHER') || has('GRANDFATHER') || has('BROTHER_GERMAN') || has('BROTHER_FATHER');
    if (type === 'SON_BROTHER_GERMAN' && blocksNephewGerman) return { blocked: true, by: 'Anak/Cucu/Ayah/Kakek/Saudara' };
    
    const blocksNephewFather = blocksNephewGerman || has('SON_BROTHER_GERMAN');
    if (type === 'SON_BROTHER_FATHER' && blocksNephewFather) return { blocked: true, by: 'Anak/Cucu/Ayah/Kakek/Saudara/Keponakan Kandung' };

    // 5. Uncles
    const blocksUncleGerman = blocksNephewFather || has('SON_BROTHER_FATHER');
    if (type === 'UNCLE_GERMAN' && blocksUncleGerman) return { blocked: true, by: 'Anak/Cucu/Ayah/Kakek/Saudara/Keponakan' };

    const blocksUncleFather = blocksUncleGerman || has('UNCLE_GERMAN');
    if (type === 'UNCLE_FATHER' && blocksUncleFather) return { blocked: true, by: 'Anak/Cucu/Ayah/Kakek/Saudara/Keponakan/Paman Kandung' };

    return { blocked: false };
  };

  // Basic Ashabul Furud Calculation
  // This is a complex matrix, we'll implement the primary ones
  
  let totalNumerator = 0;
  let baseDenominator = 24; // Common base for Faraid

  const addShare = (type: HeirType, num: number, den: number, dalil: string, desc: string, detailedDalil?: string) => {
    const blockStatus = isBlocked(type);
    if (blockStatus.blocked) {
      results.push({
        heirType: type,
        label: HEIR_LABELS[type],
        count: count(type),
        fraction: { numerator: 0, denominator: 1 },
        siham: 0,
        amount: 0,
        isAshabah: false,
        dalil: `Terhijab oleh ${blockStatus.by}`,
        detailedDalil: `Ahli waris ini tidak mendapatkan bagian karena terhalang (hijab mahjub) oleh ${blockStatus.by}.`,
        isBlocked: true,
        blockedBy: blockStatus.by,
        shareDescription: '0'
      });
      return;
    }

    const multiplier = baseDenominator / den;
    const totalHeirNumerator = num * multiplier;
    
    results.push({
      heirType: type,
      label: HEIR_LABELS[type],
      count: count(type),
      fraction: { numerator: num, denominator: den },
      siham: 0, // Calculated later
      amount: 0,
      isAshabah: false,
      dalil,
      detailedDalil,
      isBlocked: false,
      shareDescription: `${num}/${den}`
    });
    
    totalNumerator += totalHeirNumerator;
  };

  // Example Logic for Husband/Wife
  if (has('HUSBAND')) {
    const hasDescendants = has('SON') || has('DAUGHTER') || has('GRANDSON') || has('GRANDDAUGHTER');
    if (hasDescendants) {
      addShare('HUSBAND', 1, 4, 'QS. An-Nisa: 12', '1/4 karena ada keturunan', 
        'Suami mendapatkan seperempat bagian dari harta yang ditinggalkan istri jika istri mempunyai anak atau cucu. (QS. An-Nisa: 12)');
    } else {
      addShare('HUSBAND', 1, 2, 'QS. An-Nisa: 12', '1/2 karena tidak ada keturunan',
        'Suami mendapatkan setengah bagian dari harta yang ditinggalkan istri jika istri tidak mempunyai anak atau cucu. (QS. An-Nisa: 12)');
    }
  }

  if (has('WIFE')) {
    const hasDescendants = has('SON') || has('DAUGHTER') || has('GRANDSON') || has('GRANDDAUGHTER');
    if (hasDescendants) {
      addShare('WIFE', 1, 8, 'QS. An-Nisa: 12', '1/8 karena ada keturunan',
        'Para istri mendapatkan seperdelapan bagian dari harta yang ditinggalkan suami jika suami mempunyai anak atau cucu. (QS. An-Nisa: 12)');
    } else {
      addShare('WIFE', 1, 4, 'QS. An-Nisa: 12', '1/4 karena tidak ada keturunan',
        'Para istri mendapatkan seperempat bagian dari harta yang ditinggalkan suami jika suami tidak mempunyai anak atau cucu. (QS. An-Nisa: 12)');
    }
  }

  // Father/Mother
  if (has('FATHER')) {
    const hasMaleDescendant = has('SON') || has('GRANDSON');
    const hasFemaleDescendant = has('DAUGHTER') || has('GRANDDAUGHTER');
    
    if (hasMaleDescendant) {
      addShare('FATHER', 1, 6, 'QS. An-Nisa: 11', '1/6 karena ada anak laki-laki',
        'Ayah mendapatkan seperenam bagian jika pewaris memiliki anak laki-laki atau cucu laki-laki. (QS. An-Nisa: 11)');
    } else if (hasFemaleDescendant) {
      // 1/6 + Ashabah
      addShare('FATHER', 1, 6, 'QS. An-Nisa: 11', '1/6 (sebagai Furud)',
        'Ayah mendapatkan seperenam bagian sebagai furud karena ada anak perempuan, dan berpotensi mendapatkan sisa (ashabah). (QS. An-Nisa: 11)');
    }
    // If no descendants, Father is purely Ashabah (handled below)
  }

  // Grandfather (Al-Jad as-Sahih)
  if (has('GRANDFATHER') && !has('FATHER')) {
    const hasDescendant = has('SON') || has('DAUGHTER') || has('GRANDSON') || has('GRANDDAUGHTER');
    if (hasDescendant) {
      addShare('GRANDFATHER', 1, 6, 'Ijma Sahabat', '1/6 (posisi ayah)',
        'Kakek menempati posisi ayah jika ayah tidak ada dan ada keturunan. (Ijma Sahabat)');
    }
    // If no descendants, Grandfather can be Ashabah (handled later)
  }

  if (has('MOTHER')) {
    const hasDescendants = has('SON') || has('DAUGHTER') || has('GRANDSON') || has('GRANDDAUGHTER');
    const hasMultipleSiblings = (count('BROTHER_GERMAN') + count('SISTER_GERMAN') + count('BROTHER_FATHER') + count('SISTER_FATHER') + count('BROTHER_MOTHER') + count('SISTER_MOTHER')) >= 2;
    if (hasDescendants || hasMultipleSiblings) {
      addShare('MOTHER', 1, 6, 'QS. An-Nisa: 11', '1/6 karena ada keturunan/saudara',
        'Ibu mendapatkan seperenam bagian jika pewaris memiliki anak atau dua orang saudara atau lebih. (QS. An-Nisa: 11)');
    } else {
      addShare('MOTHER', 1, 3, 'QS. An-Nisa: 11', '1/3 karena tidak ada keturunan/saudara',
        'Ibu mendapatkan sepertiga bagian jika pewaris tidak memiliki anak atau dua orang saudara atau lebih. (QS. An-Nisa: 11)');
    }
  }

  // Grandmother (Al-Jaddah)
  if (has('GRANDMOTHER') && !has('MOTHER')) {
    addShare('GRANDMOTHER', 1, 6, 'Hadits Riwayat Abu Dawud', '1/6 (warisan nenek)',
      'Nenek (baik dari pihak ibu maupun ayah) mendapatkan seperenam bagian jika tidak ada ibu. (HR. Abu Dawud dan Tirmidzi)');
  }

  // Daughters (Furud if no Son)
  if (has('DAUGHTER') && !has('SON')) {
    const daughterCount = count('DAUGHTER');
    if (daughterCount === 1) {
      addShare('DAUGHTER', 1, 2, 'QS. An-Nisa: 11', '1/2 (anak tunggal)',
        'Jika anak perempuan itu seorang saja, maka ia memperoleh setengah harta. (QS. An-Nisa: 11)');
    } else {
      addShare('DAUGHTER', 2, 3, 'QS. An-Nisa: 11', '2/3 (lebih dari satu anak)',
        'Jika anak perempuan itu lebih dari dua, maka bagi mereka dua pertiga dari harta yang ditinggalkan. (QS. An-Nisa: 11)');
    }
  }

  // Granddaughters (Furud if no Son/Grandson)
  if (has('GRANDDAUGHTER') && !has('SON') && !has('GRANDSON')) {
    const daughterCount = count('DAUGHTER');
    const gdCount = count('GRANDDAUGHTER');
    
    if (daughterCount === 0) {
      if (gdCount === 1) {
        addShare('GRANDDAUGHTER', 1, 2, 'QS. An-Nisa: 11 (Qiyas)', '1/2 (cucu tunggal)',
          'Jika anak perempuan itu seorang saja, maka ia memperoleh setengah harta. Cucu perempuan menempati posisi anak perempuan jika anak perempuan tidak ada. (Qiyas)');
      } else {
        addShare('GRANDDAUGHTER', 2, 3, 'QS. An-Nisa: 11 (Qiyas)', '2/3 (cucu jamak)',
          'Jika cucu perempuan itu lebih dari dua, maka bagi mereka dua pertiga dari harta yang ditinggalkan. (Qiyas)');
      }
    } else if (daughterCount === 1) {
      // Takmilatun lits-tsulutsain: 1/6 to complete 2/3
      addShare('GRANDDAUGHTER', 1, 6, 'Hadits Riwayat Bukhari', '1/6 (pelengkap 2/3)',
        'Cucu perempuan dari anak laki-laki mendapatkan seperenam bagian jika bersama dengan seorang anak perempuan kandung sebagai penyempurna dua pertiga bagian. (HR. Bukhari)');
    }
  }

  // Siblings (Mother's side)
  if (has('BROTHER_MOTHER') || has('SISTER_MOTHER')) {
    const siblingCount = count('BROTHER_MOTHER') + count('SISTER_MOTHER');
    if (siblingCount === 1) {
      const type = has('BROTHER_MOTHER') ? 'BROTHER_MOTHER' : 'SISTER_MOTHER';
      addShare(type as HeirType, 1, 6, 'QS. An-Nisa: 12', '1/6 (saudara seibu tunggal)',
        'Jika seseorang mati, baik laki-laki maupun perempuan yang tidak meninggalkan ayah dan tidak meninggalkan anak, tetapi mempunyai seorang saudara laki-laki (seibu) atau seorang saudara perempuan (seibu), maka bagi masing-masing dari kedua jenis saudara itu seperenam harta. (QS. An-Nisa: 12)');
    } else {
      if (has('BROTHER_MOTHER')) addShare('BROTHER_MOTHER', 1, 3, 'QS. An-Nisa: 12', '1/3 (bersama saudara seibu)', 'Dibagi rata sepertiga bagian. (QS. An-Nisa: 12)');
      if (has('SISTER_MOTHER')) addShare('SISTER_MOTHER', 1, 3, 'QS. An-Nisa: 12', '1/3 (bersama saudara seibu)', 'Dibagi rata sepertiga bagian. (QS. An-Nisa: 12)');
    }
  }

  // Sisters (German) as Furud
  if (has('SISTER_GERMAN') && !has('SON') && !has('GRANDSON') && !has('FATHER') && !has('GRANDFATHER') && !has('BROTHER_GERMAN')) {
    const sisterCount = count('SISTER_GERMAN');
    if (sisterCount === 1) {
      addShare('SISTER_GERMAN', 1, 2, 'QS. An-Nisa: 176', '1/2 (saudara kandung tunggal)',
        'Jika seorang laki-laki meninggal dunia, dan ia tidak mempunyai anak dan mempunyai saudara perempuan, maka bagi saudaranya yang perempuan itu seperdua dari harta yang ditinggalkannya. (QS. An-Nisa: 176)');
    } else {
      addShare('SISTER_GERMAN', 2, 3, 'QS. An-Nisa: 176', '2/3 (saudara kandung jamak)',
        'Tetapi jika saudara perempuan itu dua orang, maka bagi keduanya dua pertiga dari harta yang ditinggalkan oleh yang meninggal. (QS. An-Nisa: 176)');
    }
  }

  // Sisters (Father's side) as Furud
  if (has('SISTER_FATHER') && !has('SON') && !has('GRANDSON') && !has('FATHER') && !has('GRANDFATHER') && !has('BROTHER_GERMAN') && !has('BROTHER_FATHER')) {
    const sisterFatherCount = count('SISTER_FATHER');
    const sisterGermanCount = count('SISTER_GERMAN');
    
    if (sisterGermanCount === 0) {
      // If no Sister German, Sister Father takes 1/2 or 2/3
      if (sisterFatherCount === 1) {
        addShare('SISTER_FATHER', 1, 2, 'QS. An-Nisa: 176', '1/2 (saudara seayah tunggal)',
          'Saudara perempuan seayah menempati posisi saudara perempuan kandung jika tidak ada saudara perempuan kandung. (QS. An-Nisa: 176)');
      } else {
        addShare('SISTER_FATHER', 2, 3, 'QS. An-Nisa: 176', '2/3 (saudara seayah jamak)',
          'Dua atau lebih saudara perempuan seayah mendapatkan 2/3 jika tidak ada saudara kandung. (QS. An-Nisa: 176)');
      }
    } else if (sisterGermanCount === 1 && !has('BROTHER_GERMAN')) {
      // Takmilatun lits-tsulutsain: 1/6 for Sister Father to complete 2/3
      addShare('SISTER_FATHER', 1, 6, 'Ijma Sahabat', '1/6 (pelengkap 2/3)',
        'Saudara perempuan seayah mendapatkan 1/6 jika ada satu saudara perempuan kandung (yang sudah mengambil 1/2), untuk menyempurnakan bagian dua pertiga bagi kaum wanita.');
    }
  }

  // Ashabah Logic
  const remainingNumerator = baseDenominator - totalNumerator;
  
  // Priority list for Ashabah Bin Nafsi (Male Residuaries)
  const ashabahPriority: HeirType[] = [
    'SON', 'GRANDSON', 'FATHER', 'GRANDFATHER', 
    'BROTHER_GERMAN', 'BROTHER_FATHER', 
    'SON_BROTHER_GERMAN', 'SON_BROTHER_FATHER', 
    'UNCLE_GERMAN', 'UNCLE_FATHER'
  ];

  // Find the highest priority active and unblocked male residuary
  const closestAshabahType = ashabahPriority.find(type => has(type) && !isBlocked(type).blocked);

  if (closestAshabahType && remainingNumerator > 0) {
    const unitValue = remainingNumerator; // Simplified for now, assuming 1 unit unless mixed gender
    
    if (closestAshabahType === 'SON' || closestAshabahType === 'GRANDSON') {
      const maleType = closestAshabahType;
      const femaleType = maleType === 'SON' ? 'DAUGHTER' : 'GRANDDAUGHTER';
      
      const maleCount = count(maleType);
      const femaleCount = has(femaleType) && !isBlocked(femaleType).blocked ? count(femaleType) : 0;
      
      const totalUnits = (maleCount * 2) + femaleCount;

      results.push({
        heirType: maleType,
        label: HEIR_LABELS[maleType],
        count: maleCount,
        fraction: { numerator: remainingNumerator * 2 * maleCount, denominator: baseDenominator * totalUnits },
        siham: 0,
        amount: 0,
        isAshabah: true,
        dalil: 'QS. An-Nisa: 11',
        detailedDalil: 'Bagian laki-laki sama dengan bagian dua orang anak perempuan. (QS. An-Nisa: 11)',
        isBlocked: false,
        shareDescription: 'Sisa (2:1)'
      });

      if (femaleCount > 0) {
        results.push({
          heirType: femaleType,
          label: HEIR_LABELS[femaleType],
          count: femaleCount,
          fraction: { numerator: remainingNumerator * femaleCount, denominator: baseDenominator * totalUnits },
          siham: 0,
          amount: 0,
          isAshabah: true,
          dalil: 'QS. An-Nisa: 11',
          detailedDalil: 'Menjadi Ashabah Bil Ghair bersama saudara laki-lakinya. (QS. An-Nisa: 11)',
          isBlocked: false,
          shareDescription: 'Sisa (1:1)'
        });
      }
    } else if (closestAshabahType === 'BROTHER_GERMAN' || closestAshabahType === 'BROTHER_FATHER') {
      const maleType = closestAshabahType;
      const femaleType = maleType === 'BROTHER_GERMAN' ? 'SISTER_GERMAN' : 'SISTER_FATHER';
      
      const maleCount = count(maleType);
      const femaleCount = has(femaleType) && !isBlocked(femaleType).blocked ? count(femaleType) : 0;
      
      const totalUnits = (maleCount * 2) + femaleCount;

      results.push({
        heirType: maleType,
        label: HEIR_LABELS[maleType],
        count: maleCount,
        fraction: { numerator: remainingNumerator * 2 * maleCount, denominator: baseDenominator * totalUnits },
        siham: 0,
        amount: 0,
        isAshabah: true,
        dalil: 'QS. An-Nisa: 176',
        detailedDalil: 'Jika mereka (ahli waris) terdiri dari saudara laki-laki dan perempuan, maka bagian laki-laki sama dengan dua bagian perempuan. (QS. An-Nisa: 176)',
        isBlocked: false,
        shareDescription: 'Sisa (2:1)'
      });

      if (femaleCount > 0) {
        results.push({
          heirType: femaleType,
          label: HEIR_LABELS[femaleType],
          count: femaleCount,
          fraction: { numerator: remainingNumerator * femaleCount, denominator: baseDenominator * totalUnits },
          siham: 0,
          amount: 0,
          isAshabah: true,
          dalil: 'QS. An-Nisa: 176',
          detailedDalil: 'Menjadi Ashabah Bil Ghair bersama saudara laki-lakinya. (QS. An-Nisa: 176)',
          isBlocked: false,
          shareDescription: 'Sisa (1:1)'
        });
      }
    } else {
      // Other male residuaries (Nephews, Uncles, Father/Grandfather as pure Ashabah)
      const existingRes = results.find(r => r.heirType === closestAshabahType);
      if (existingRes) {
        existingRes.fraction.numerator += remainingNumerator;
        existingRes.shareDescription += ' + Ashabah';
        existingRes.isAshabah = true;
      } else {
        results.push({
          heirType: closestAshabahType,
          label: HEIR_LABELS[closestAshabahType],
          count: count(closestAshabahType),
          fraction: { numerator: remainingNumerator, denominator: baseDenominator },
          siham: 0,
          amount: 0,
          isAshabah: true,
          dalil: 'Hadits Riwayat Bukhari',
          detailedDalil: 'Berikanlah bagian-bagian warisan yang telah ditetapkan kepada pemiliknya, dan sisanya untuk laki-laki yang paling utama (dekat). (HR. Bukhari)',
          isBlocked: false,
          shareDescription: 'Sisa'
        });
      }
    }
    totalNumerator = baseDenominator;
  }

  // Calculate remaining for Ashabah
  let adjustmentType: 'AUL' | 'RADD' | 'NORMAL' = 'NORMAL';
  
  if (totalNumerator > baseDenominator) {
    adjustmentType = 'AUL';
    baseDenominator = totalNumerator; // Aul: increase denominator to match numerator
  } else if (totalNumerator < baseDenominator && !closestAshabahType) {
    adjustmentType = 'RADD';
    // RADD Logic: Redistribute to Furud (except spouse)
    const spouseNumerator = results
      .filter(r => (r.heirType === 'HUSBAND' || r.heirType === 'WIFE') && !r.isBlocked)
      .reduce((sum, r) => sum + (r.fraction.numerator * (baseDenominator / r.fraction.denominator)), 0);
    
    const nonSpouseNumerator = totalNumerator - spouseNumerator;
    const remainingToDistribute = baseDenominator - totalNumerator;

    if (nonSpouseNumerator > 0) {
      // Proportional redistribution to non-spouse heirs
      results.forEach(res => {
        if (!res.isBlocked && res.heirType !== 'HUSBAND' && res.heirType !== 'WIFE') {
          const currentNum = res.fraction.numerator * (baseDenominator / res.fraction.denominator);
          const raddShare = (currentNum / nonSpouseNumerator) * remainingToDistribute;
          // Adjust the fraction to reflect the new share
          res.fraction.numerator = currentNum + raddShare;
          res.fraction.denominator = baseDenominator;
        }
      });
      totalNumerator = baseDenominator;
    }
  }

  const initialBaseDenominator = baseDenominator;

  // Find global LCD (Least Common Denominator)
  const allDens = results.filter(r => !r.isBlocked).map(r => r.fraction.denominator);
  if (allDens.length > 0) {
    baseDenominator = allDens.reduce((acc, den) => lcm(acc, den), 1);
  }

  // Calculate Initial Siham with the new global baseDenominator
  results.forEach(res => {
    if (!res.isBlocked) {
      res.fraction.numerator = Math.round(res.fraction.numerator * (baseDenominator / res.fraction.denominator));
      res.fraction.denominator = baseDenominator;
    }
  });

  // Inkisar Logic (Multiple heirs sharing a siham that is not divisible)
  let adjustmentMultiplier = 1;
  
  results.forEach(res => {
    if (res.isBlocked) return;
    
    const heirCount = res.count || 1;
    const siham = res.fraction.numerator;
    
    if (siham % heirCount !== 0) {
      const factor = heirCount / gcd(siham, heirCount);
      adjustmentMultiplier = lcm(adjustmentMultiplier, factor);
    }
  });

  if (adjustmentMultiplier > 1) {
    baseDenominator *= adjustmentMultiplier;
    results.forEach(res => {
      res.fraction.numerator *= adjustmentMultiplier;
      res.fraction.denominator = baseDenominator;
    });
  }

  // Calculate Final Siham and Amounts
  results.forEach(res => {
    if (!res.isBlocked) {
      res.siham = res.fraction.numerator;
      const effectiveShare = res.fraction.numerator / res.fraction.denominator;
      res.amount = netAssets * effectiveShare;
    } else {
      res.siham = 0;
      res.count = activeHeirGroups.find(h => h.type === res.heirType)?.count || 0;
    }
  });

  const finalTotalNumerator = results.reduce((sum, res) => sum + (res.isBlocked ? 0 : res.fraction.numerator), 0);

  return {
    initialAssets: assets.totalAssets,
    afterJointProperty,
    afterPreDistribution: netAssets,
    distributions: results,
    totalNumerator: finalTotalNumerator,
    baseDenominator,
    initialBaseDenominator,
    adjustmentType,
    hasInkisar: adjustmentMultiplier > 1
  };
}
