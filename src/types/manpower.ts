export type LaborCategory = 'DL' | 'IDL';

export type LineId =
  | 'line-a'
  | 'line-b'
  | 'line-door-a'
  | 'line-door-b'
  | 'line-door-c'
  | 'line-injection'
  | 'line-thermoforming'
  | string;

export type LineDepartment = 'assembly' | 'door' | 'parts';

export interface StationData {
  id: string;
  no: number;
  name: string;
  category: 'DL';
  mpShiftA: number;
  mpShiftB: number;
  cycleTimeSec: number; // CT in seconds
  uph: number;          // Units per hour (e.g. 110 or 3600 / CT)
  manualUpph?: number;  // Optional override from standard sheet
  manualOutputShift?: number; // Optional override output per shift
  notes?: string;
  isBottleneck?: boolean;
}

export interface IndirectLaborRole {
  id: string;
  title: string;
  category: 'IDL';
  stdMp: number;
  ratioPerDl?: number; // e.g. 1 leader per 42 DL
  isFixed: boolean;    // true if fixed regardless of volume (e.g. Manager)
  notes?: string;
}

export interface ShiftConfig {
  shiftHours: number;           // Standard hours (default 8)
  breakMinutes: number;         // Unpaid break (default 60)
  plannedOperatingHours: number;// Net working hours (e.g. 7.5h or 8h)
  otHoursShiftA: number;        // Overtime hours Shift A
  otHoursShiftB: number;        // Overtime hours Shift B
  workingDaysPerMonth: number;  // Standard working days (default 24)
  plannedOeePct: number;        // Planned OEE / Line efficiency % (default 85-90%)
  spareMpPct: number;           // Spare / Absenteeism buffer % (default 4.0%)
  targetUph?: number;           // Target Line Speed in Units Per Hour
}

export interface MonthlyForecastItem {
  id: string;
  monthIndex: number;           // 1 to 12
  monthName: string;            // 'ม.ค. (Jan)', 'ก.พ. (Feb)', etc.
  workingDays: number;
  shiftMode: '1_SHIFT' | '2_SHIFTS' | '2_SHIFTS_OT' | '3_SHIFTS';
  otHoursPerDay: number;
  targetMonthlyVolume: number;  // units
  plannedOeePct: number;
  
  // Calculated outputs
  dailyTargetVolume: number;
  requiredUph: number;
  taktTimeSec: number;
  requiredDlShiftA: number;
  requiredDlShiftB: number;
  requiredDlShiftC?: number;
  totalRequiredDl: number;
  totalRequiredIdl: number;
  totalRequiredSpare: number;
  grandTotalMp: number;
  mpDeltaFromBase: number;      // Difference from current baseline MP
  capacityUtilizationPct: number;
  otCostEstimated?: number;
  hiringCostEstimated?: number;
}

export interface PlanVsActualRecord {
  id: string;
  date: string;                 // YYYY-MM-DD
  shift: 'Shift-A' | 'Shift-B' | 'All Day';
  lineId: LineId;
  lineName: string;
  
  // Plan
  planVolume: number;
  planDlMp: number;
  planIdlMp: number;
  planOperatingHours: number;
  planUph: number;
  planUpph: number;
  
  // Actual
  actualVolume: number;
  actualDlMp: number;
  actualIdlMp: number;
  actualOperatingHours: number;
  actualOtHours: number;
  actualUph: number;
  actualUpph: number;
  
  // Variances & Losses (in minutes)
  lineBreakdownMins: number;
  materialShortageMins: number;
  changeoverMins: number;
  absenteeismLossMins: number;
  speedLossMins: number;
  otherLossMins: number;
  
  notes?: string;
}

export interface LineSummaryMetrics {
  lineId: string;
  lineName: string;
  department?: LineDepartment;
  departmentName?: string;
  totalDlShiftA: number;
  totalDlShiftB: number;
  totalDl: number;
  totalIdl: number;
  spareShiftA: number;
  spareShiftB: number;
  totalSpare: number;
  grandTotalMp: number;
  targetUph: number;
  bottleneckCt: number;
  bottleneckStationName: string;
  lineBalanceEfficiencyPct: number;
  lineUpph: number;
  dailyCapacityStandard: number;
  monthlyCapacityStandard: number;
}

export interface LineData {
  id: LineId;
  name: string;
  shortCode?: string;
  department?: LineDepartment;
  departmentName?: string;
  modelType: string;
  stations: StationData[];
  idlRoles: IndirectLaborRole[];
  shiftConfig: ShiftConfig;
  forecastData: Partial<MonthlyForecastItem>[];
}

export interface DepartmentSummaryMetrics {
  department: LineDepartment;
  departmentName: string;
  lineIds: LineId[];
  lineCount: number;
  totalDlShiftA: number;
  totalDlShiftB: number;
  totalDl: number;
  totalIdl: number;
  totalSpare: number;
  grandTotalMp: number;
  combinedDailyCapacity: number;
  combinedMonthlyCapacity: number;
  averageUph: number;
}

export interface PlantSummaryMetrics {
  totalPlantDlShiftA: number;
  totalPlantDlShiftB: number;
  totalPlantDl: number;
  totalPlantIdl: number;
  totalPlantSpare: number;
  grandPlantTotalMp: number;
  combinedDailyCapacity: number;
  combinedMonthlyCapacity: number;
  plantAverageUpph: number;
  lineSummaries: Record<string, LineSummaryMetrics>;
  departments: Record<LineDepartment, DepartmentSummaryMetrics>;
  lineASummary: LineSummaryMetrics;
  lineBSummary: LineSummaryMetrics;
}

export type VsmNodeRole = 'upstream_parts' | 'sub_assembly_door' | 'main_assembly';

export interface VsmNodeConfig {
  lineId: LineId;
  role: VsmNodeRole;
  partName: string;
  feedsInto: LineId[];
  bomPerLineAUnit: number;
  bomPerLineBUnit: number;
  allocationLineAPct: number;
  allocationLineBPct: number;
  shiftsPerDay: 1 | 2 | 3;
  otHoursPerDay: number;
  changeoverMinsPerDay: number;
  transferLeadTimeMins: number;
  initialBufferStock: number;
  safetyBufferHours: number;
  headStartHours: number;
  lotSize: number;
}

export type VsmDeliveryStatus = 'ON_TIME' | 'AT_RISK' | 'LATE_SHORTAGE';

export interface VsmHourlyPoint {
  hourIndex: number;       // 0..23 starting at 08:00
  clockLabel: string;      // '08:00', '09:00', ...
  supplyUnits: number;     // Units arriving to downstream supermarket this hour
  demandUnits: number;     // Units consumed by Line A + Line B this hour
  cumSupply: number;
  cumDemand: number;
  bufferEnd: number;       // Ending supermarket buffer at this hour
}

export interface VsmNodeEvaluation {
  config: VsmNodeConfig;
  lineName: string;
  shortCode: string;
  color: string;
  grossUph: number;
  oeePct: number;
  netUph: number;
  operatingHoursPerDay: number;
  netProductionHoursPerDay: number;
  dailyCapacityUnits: number;
  demandRateLineAPerHr: number;
  demandRateLineBPerHr: number;
  totalDemandRatePerHr: number;
  dailyDemandLineA: number;
  dailyDemandLineB: number;
  totalDailyDemand: number;
  hourlyBalance: number;         // netUph - totalDemandRatePerHr
  dailyBalance: number;          // dailyCapacityUnits - totalDailyDemand
  endingBufferUnits: number;
  minBufferUnits: number;
  safetyBufferUnits: number;
  firstShortageClock: string | null;
  firstShortageHour: number | null;
  bufferCoverageHours: number;
  cycleTimeSec: number;
  taktTimeSec: number;
  status: VsmDeliveryStatus;
  statusReason: string;
  recommendedAction: string;
  hourlyTimeline: VsmHourlyPoint[];
}

