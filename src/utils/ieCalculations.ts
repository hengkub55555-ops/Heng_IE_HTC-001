import {
  StationData,
  IndirectLaborRole,
  ShiftConfig,
  LineSummaryMetrics,
  MonthlyForecastItem,
  PlanVsActualRecord,
  PlantSummaryMetrics,
  DepartmentSummaryMetrics,
  LineDepartment,
} from '../types/manpower';

/**
 * Calculate overall line summary metrics from stations, IDL, and shift config
 */
export function calculateLineSummary(
  stations: StationData[],
  idlRoles: IndirectLaborRole[],
  config: ShiftConfig,
  lineId: string = 'line-b',
  lineName: string = 'Production Line',
  department?: LineDepartment,
  departmentName?: string
): LineSummaryMetrics {
  const totalDlShiftA = stations.reduce((sum, s) => sum + (s.mpShiftA || 0), 0);
  const totalDlShiftB = stations.reduce((sum, s) => sum + (s.mpShiftB || 0), 0);
  const totalDl = totalDlShiftA + totalDlShiftB;

  const totalIdl = idlRoles.reduce((sum, r) => sum + (r.stdMp || 0), 0);

  // Spare MP per shift based on spare buffer percentage (e.g. 4%)
  const spareShiftA = Math.round(totalDlShiftA * (config.spareMpPct / 100));
  const spareShiftB = Math.round(totalDlShiftB * (config.spareMpPct / 100));
  const totalSpare = spareShiftA + spareShiftB;

  const grandTotalMp = totalDl + totalIdl + totalSpare;

  // Bottleneck detection
  let maxCt = 0;
  let bottleneckName = 'None';
  stations.forEach((s) => {
    if (s.cycleTimeSec > maxCt) {
      maxCt = s.cycleTimeSec;
      bottleneckName = s.name;
    }
  });

  // Target UPH based on config or bottleneck CT
  const targetUph =
    config.targetUph !== undefined && config.targetUph > 0
      ? config.targetUph
      : maxCt > 0
      ? Math.round(3600 / maxCt)
      : 110;

  // Line Balance Efficiency (LBE)
  const sumCt = stations.reduce((sum, s) => sum + s.cycleTimeSec, 0);
  const stationCount = stations.length || 1;
  const lineBalanceEfficiencyPct =
    maxCt > 0 ? Number(((sumCt / (stationCount * maxCt)) * 100).toFixed(1)) : 100;

  // Line UPPH (Units Per Person-Hour)
  const lineUpph = totalDlShiftA > 0 ? Number((targetUph / totalDlShiftA).toFixed(3)) : 0;

  // Daily & Monthly standard capacity (2 shifts, standard operating hours)
  const dailyHours = config.plannedOperatingHours * 2;
  const oeeFactor = (config.plannedOeePct || 88) / 100;
  const dailyCapacityStandard = Math.round(targetUph * dailyHours * oeeFactor);
  const monthlyCapacityStandard = Math.round(dailyCapacityStandard * config.workingDaysPerMonth);

  return {
    lineId,
    lineName,
    department,
    departmentName,
    totalDlShiftA,
    totalDlShiftB,
    totalDl,
    totalIdl,
    spareShiftA,
    spareShiftB,
    totalSpare,
    grandTotalMp,
    targetUph,
    bottleneckCt: maxCt,
    bottleneckStationName: bottleneckName,
    lineBalanceEfficiencyPct,
    lineUpph,
    dailyCapacityStandard,
    monthlyCapacityStandard,
  };
}

/**
 * Calculate Plant-wide aggregated metrics across all process lines
 */
export function calculatePlantSummary(
  summariesOrLineA: Record<string, LineSummaryMetrics> | LineSummaryMetrics,
  maybeLineBSummary?: LineSummaryMetrics
): PlantSummaryMetrics {
  let lineSummaries: Record<string, LineSummaryMetrics> = {};

  if (
    summariesOrLineA &&
    typeof summariesOrLineA === 'object' &&
    !('totalDl' in summariesOrLineA)
  ) {
    lineSummaries = summariesOrLineA as Record<string, LineSummaryMetrics>;
  } else if ('totalDl' in summariesOrLineA) {
    lineSummaries['line-a'] = summariesOrLineA as LineSummaryMetrics;
    if (maybeLineBSummary) {
      lineSummaries['line-b'] = maybeLineBSummary;
    }
  }

  const summariesList = Object.values(lineSummaries);

  const totalPlantDlShiftA = summariesList.reduce((acc, s) => acc + s.totalDlShiftA, 0);
  const totalPlantDlShiftB = summariesList.reduce((acc, s) => acc + s.totalDlShiftB, 0);
  const totalPlantDl = summariesList.reduce((acc, s) => acc + s.totalDl, 0);
  const totalPlantIdl = summariesList.reduce((acc, s) => acc + s.totalIdl, 0);
  const totalPlantSpare = summariesList.reduce((acc, s) => acc + s.totalSpare, 0);
  const grandPlantTotalMp = totalPlantDl + totalPlantIdl + totalPlantSpare;
  const combinedDailyCapacity = summariesList.reduce((acc, s) => acc + s.dailyCapacityStandard, 0);
  const combinedMonthlyCapacity = summariesList.reduce((acc, s) => acc + s.monthlyCapacityStandard, 0);

  const plantAverageUpph =
    totalPlantDlShiftA > 0
      ? Number(
          (
            summariesList.reduce((acc, s) => acc + s.targetUph, 0) /
            totalPlantDlShiftA
          ).toFixed(3)
        )
      : 0;

  // Department Subtotals
  const deptDefs: { dept: LineDepartment; name: string; matchLine: (id: string) => boolean }[] = [
    {
      dept: 'assembly',
      name: 'สายการประกอบหลัก (Main Assembly)',
      matchLine: (id) => id === 'line-a' || id === 'line-b',
    },
    {
      dept: 'door',
      name: 'สายการผลิตประตู (Door Production)',
      matchLine: (id) => id.includes('door'),
    },
    {
      dept: 'parts',
      name: 'ขึ้นรูปและชิ้นส่วนพลาสติก (Parts & Molding)',
      matchLine: (id) => id.includes('injection') || id.includes('thermoforming'),
    },
  ];

  const departments: Record<LineDepartment, DepartmentSummaryMetrics> = {} as any;

  deptDefs.forEach(({ dept, name, matchLine }) => {
    const matched = summariesList.filter((s) => matchLine(s.lineId));
    const dlA = matched.reduce((a, b) => a + b.totalDlShiftA, 0);
    const dlB = matched.reduce((a, b) => a + b.totalDlShiftB, 0);
    const dl = matched.reduce((a, b) => a + b.totalDl, 0);
    const idl = matched.reduce((a, b) => a + b.totalIdl, 0);
    const spare = matched.reduce((a, b) => a + b.totalSpare, 0);
    const grand = dl + idl + spare;
    const dailyCap = matched.reduce((a, b) => a + b.dailyCapacityStandard, 0);
    const monthlyCap = matched.reduce((a, b) => a + b.monthlyCapacityStandard, 0);
    const avgUph = matched.length > 0 ? Math.round(matched.reduce((a, b) => a + b.targetUph, 0) / matched.length) : 0;

    departments[dept] = {
      department: dept,
      departmentName: name,
      lineIds: matched.map((s) => s.lineId),
      lineCount: matched.length,
      totalDlShiftA: dlA,
      totalDlShiftB: dlB,
      totalDl: dl,
      totalIdl: idl,
      totalSpare: spare,
      grandTotalMp: grand,
      combinedDailyCapacity: dailyCap,
      combinedMonthlyCapacity: monthlyCap,
      averageUph: avgUph,
    };
  });

  const defaultLineA = lineSummaries['line-a'] || summariesList[0] || ({} as LineSummaryMetrics);
  const defaultLineB = lineSummaries['line-b'] || summariesList[1] || defaultLineA;

  return {
    totalPlantDlShiftA,
    totalPlantDlShiftB,
    totalPlantDl,
    totalPlantIdl,
    totalPlantSpare,
    grandPlantTotalMp,
    combinedDailyCapacity,
    combinedMonthlyCapacity,
    plantAverageUpph,
    lineSummaries,
    departments,
    lineASummary: defaultLineA,
    lineBSummary: defaultLineB,
  };
}

/**
 * Calculate station level IE metrics
 */
export function calculateStationMetrics(
  station: StationData,
  shiftHours: number = 8,
  oeePct: number = 88
) {
  // Calculated UPH based on CT
  const calculatedUph = station.cycleTimeSec > 0 ? Math.round(3600 / station.cycleTimeSec) : station.uph;
  const effectiveUph = station.uph || calculatedUph;

  // UPPH = UPH / MP (Shift A)
  const calculatedUpph =
    station.mpShiftA > 0 ? Number((effectiveUph / station.mpShiftA).toFixed(2)) : 0;
  const finalUpph = station.manualUpph !== undefined ? station.manualUpph : calculatedUpph;

  // Output per shift (approx: standard net output per operator per shift)
  const shiftOutput = Math.round(effectiveUph * shiftHours * (oeePct / 100));
  const outputPerPerson =
    station.mpShiftA > 0 ? Math.round(shiftOutput / station.mpShiftA) : 0;
  const finalOutputShift =
    station.manualOutputShift !== undefined ? station.manualOutputShift : outputPerPerson;

  // Total work content for station in man-seconds
  const workContentSec = station.cycleTimeSec * station.mpShiftA;

  return {
    effectiveUph,
    finalUpph,
    finalOutputShift,
    workContentSec,
    shiftOutput,
  };
}

/**
 * Calculate Monthly Forecast details
 */
export function calculateForecastItem(
  item: Partial<MonthlyForecastItem>,
  stations: StationData[],
  idlRoles: IndirectLaborRole[],
  shiftConfig: ShiftConfig,
  baseDlShiftA: number,
  baseTotalMp: number
): MonthlyForecastItem {
  const workingDays = item.workingDays || shiftConfig.workingDaysPerMonth || 24;
  const targetMonthlyVolume = item.targetMonthlyVolume || 40000;
  const shiftMode = item.shiftMode || '2_SHIFTS';
  const otHoursPerDay = item.otHoursPerDay || 0;
  const plannedOeePct = item.plannedOeePct || shiftConfig.plannedOeePct || 88;

  const dailyTargetVolume = Math.round(targetMonthlyVolume / workingDays);

  // Number of active shifts
  const shiftCount = shiftMode === '1_SHIFT' ? 1 : shiftMode === '3_SHIFTS' ? 3 : 2;

  // Operating hours per shift
  const baseShiftHours = shiftConfig.plannedOperatingHours || 8;
  const totalShiftHours =
    shiftMode === '2_SHIFTS_OT' ? baseShiftHours + otHoursPerDay : baseShiftHours;
  const totalOperatingHoursDay = totalShiftHours * shiftCount;

  // Required UPH to hit daily target with given OEE
  const oeeFactor = plannedOeePct / 100;
  const requiredUph =
    totalOperatingHoursDay > 0
      ? Math.ceil(dailyTargetVolume / (totalOperatingHoursDay * oeeFactor))
      : 110;

  // Takt Time in seconds per unit: (Available Net Working Seconds per day) / Daily Target
  const availableDailySec = totalOperatingHoursDay * 3600 * oeeFactor;
  const taktTimeSec = dailyTargetVolume > 0 ? Number((availableDailySec / dailyTargetVolume).toFixed(1)) : 23;

  // Baseline standard line target UPH
  const lineTargetUph = shiftConfig.targetUph || (baseDlShiftA > 150 ? 110 : 100);
  const uphRatio = requiredUph / (lineTargetUph > 0 ? lineTargetUph : 100);
  
  // Required DL per shift
  const requiredDlPerShift = Math.max(1, Math.round(baseDlShiftA * uphRatio));
  
  let requiredDlShiftA = requiredDlPerShift;
  let requiredDlShiftB = shiftCount >= 2 ? requiredDlPerShift : 0;
  let requiredDlShiftC = shiftCount === 3 ? requiredDlPerShift : 0;
  const totalRequiredDl = requiredDlShiftA + requiredDlShiftB + requiredDlShiftC;

  // Scale IDL based on role types
  const dlScaleRatio = totalRequiredDl / (baseDlShiftA * 2 || 1);
  const totalRequiredIdl = Number(
    idlRoles
      .reduce((sum, r) => {
        if (r.isFixed) {
          return sum + r.stdMp;
        }
        return sum + Math.max(1, Math.round(r.stdMp * dlScaleRatio));
      }, 0)
      .toFixed(1)
  );

  // Spare MP (buffer by default)
  const totalRequiredSpare = Math.round(totalRequiredDl * (shiftConfig.spareMpPct / 100));

  const grandTotalMp = totalRequiredDl + totalRequiredIdl + totalRequiredSpare;
  const mpDeltaFromBase = grandTotalMp - baseTotalMp;

  // Capacity Utilization %
  const baselineMonthlyCap = Math.round(lineTargetUph * 16 * workingDays * oeeFactor);
  const capacityUtilizationPct = Number(
    ((targetMonthlyVolume / (baselineMonthlyCap || 1)) * 100).toFixed(1)
  );

  return {
    id: item.id || `f-${item.monthIndex}`,
    monthIndex: item.monthIndex || 1,
    monthName: item.monthName || 'Month',
    workingDays,
    shiftMode,
    otHoursPerDay,
    targetMonthlyVolume,
    plannedOeePct,
    dailyTargetVolume,
    requiredUph,
    taktTimeSec,
    requiredDlShiftA,
    requiredDlShiftB,
    requiredDlShiftC,
    totalRequiredDl,
    totalRequiredIdl,
    totalRequiredSpare,
    grandTotalMp,
    mpDeltaFromBase,
    capacityUtilizationPct,
  };
}

/**
 * Format numbers with comma separators
 */
export function formatNumber(val: number | undefined | null, decimals: number = 0): string {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return val.toLocaleString('th-TH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format percent string
 */
export function formatPct(val: number | undefined | null, decimals: number = 1): string {
  if (val === undefined || val === null || isNaN(val)) return '0.0%';
  return `${val.toFixed(decimals)}%`;
}

/**
 * Export data to UTF-8 CSV with BOM for full Excel Thai compatibility
 */
export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const bom = '\uFEFF';
  const csvContent =
    bom +
    [
      headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map((row) =>
        row
          .map((cell) => {
            const str = cell !== undefined && cell !== null ? String(cell) : '';
            return `"${str.replace(/"/g, '""')}"`;
          })
          .join(',')
      ),
    ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy 2D array to clipboard in Tab-Separated format for direct Excel paste
 */
export async function copyToExcelClipboard(headers: string[], rows: (string | number)[][]): Promise<boolean> {
  try {
    const tsvContent = [
      headers.join('\t'),
      ...rows.map((row) => row.map((cell) => (cell !== undefined && cell !== null ? String(cell) : '')).join('\t')),
    ].join('\n');

    await navigator.clipboard.writeText(tsvContent);
    return true;
  } catch {
    return false;
  }
}
