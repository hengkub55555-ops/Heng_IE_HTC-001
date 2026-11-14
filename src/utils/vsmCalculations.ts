import {
  LineData,
  VsmNodeConfig,
  VsmNodeEvaluation,
  VsmHourlyPoint,
  VsmDeliveryStatus,
} from '../types/manpower';
import { ALL_LINES_METADATA } from '../data/initialData';

export interface VsmPlantAnalysis {
  evaluations: Record<string, VsmNodeEvaluation>;
  feederEvaluations: VsmNodeEvaluation[];
  mainLineEvaluations: VsmNodeEvaluation[];
  overallStatus: VsmDeliveryStatus;
  onTimeCount: number;
  atRiskCount: number;
  shortageCount: number;
  totalDailyDemandUnitsA: number;
  totalDailyDemandUnitsB: number;
  totalDailyDemandCombined: number;
  totalLeadTimeHours: number;
  totalValueAddedSec: number;
  processCycleEfficiencyPct: number;
}

const formatClockHour = (hourOffsetFrom8AM: number): string => {
  const totalHour = (8 + hourOffsetFrom8AM) % 24;
  return `${String(totalHour).padStart(2, '0')}:00`;
};

/**
 * Compute full 24-hour VSM supply-demand synchronization across TF, Injection, Door A/B/C -> Line A & Line B
 */
export function evaluateVsmSupplyChain(
  lines: Record<string, LineData>,
  vsmConfigs: VsmNodeConfig[]
): VsmPlantAnalysis {
  const getConfig = (id: string) => vsmConfigs.find((c) => c.lineId === id);

  const lineAData = lines['line-a'];
  const lineBData = lines['line-b'];
  const cfgA = getConfig('line-a');
  const cfgB = getConfig('line-b');

  // Downstream Line A & B baseline parameters
  const grossUphA = lineAData?.shiftConfig?.targetUph || 100;
  const oeeA = lineAData?.shiftConfig?.plannedOeePct || 89;
  const netUphA = Number((grossUphA * (oeeA / 100)).toFixed(1));
  const shiftHoursA = lineAData?.shiftConfig?.plannedOperatingHours || 8;
  const shiftsA = cfgA?.shiftsPerDay || 2;
  const otA = cfgA?.otHoursPerDay || 0;
  const totalOpHoursA = Math.min(24, shiftsA * shiftHoursA + otA);
  const changeoverHrsA = (cfgA?.changeoverMinsPerDay || 0) / 60;
  const netOpHoursA = Math.max(0, totalOpHoursA - changeoverHrsA);
  const dailyDemandA = Math.round(netUphA * netOpHoursA);

  const grossUphB = lineBData?.shiftConfig?.targetUph || 110;
  const oeeB = lineBData?.shiftConfig?.plannedOeePct || 88;
  const netUphB = Number((grossUphB * (oeeB / 100)).toFixed(1));
  const shiftHoursB = lineBData?.shiftConfig?.plannedOperatingHours || 8;
  const shiftsB = cfgB?.shiftsPerDay || 2;
  const otB = cfgB?.otHoursPerDay || 0;
  const totalOpHoursB = Math.min(24, shiftsB * shiftHoursB + otB);
  const changeoverHrsB = (cfgB?.changeoverMinsPerDay || 0) / 60;
  const netOpHoursB = Math.max(0, totalOpHoursB - changeoverHrsB);
  const dailyDemandB = Math.round(netUphB * netOpHoursB);

  const evaluations: Record<string, VsmNodeEvaluation> = {};

  vsmConfigs.forEach((cfg) => {
    const lineObj = lines[cfg.lineId];
    const meta = ALL_LINES_METADATA.find((m) => m.id === cfg.lineId);

    const grossUph = lineObj?.shiftConfig?.targetUph || (cfg.lineId === 'line-b' ? 110 : 100);
    const oeePct = lineObj?.shiftConfig?.plannedOeePct || 88;
    const netUph = Number((grossUph * (oeePct / 100)).toFixed(1));
    const shiftHours = lineObj?.shiftConfig?.plannedOperatingHours || 8;
    const operatingHoursPerDay = Math.min(24, cfg.shiftsPerDay * shiftHours + cfg.otHoursPerDay);
    const changeoverHrs = cfg.changeoverMinsPerDay / 60;
    const netProductionHoursPerDay = Math.max(0, operatingHoursPerDay - changeoverHrs);
    const dailyCapacityUnits = Math.round(netUph * netProductionHoursPerDay);

    // Cycle time (Bottleneck station CT or 3600 / grossUph)
    const maxStationCt =
      lineObj && lineObj.stations.length > 0
        ? Math.max(...lineObj.stations.map((s) => s.cycleTimeSec))
        : Math.round(3600 / Math.max(1, grossUph));

    // Demand coming from Line A and Line B
    const isMain = cfg.role === 'main_assembly';
    const demandRateLineAPerHr = isMain
      ? cfg.lineId === 'line-a'
        ? netUphA
        : 0
      : Number((netUphA * cfg.bomPerLineAUnit * (cfg.allocationLineAPct / 100)).toFixed(1));

    const demandRateLineBPerHr = isMain
      ? cfg.lineId === 'line-b'
        ? netUphB
        : 0
      : Number((netUphB * cfg.bomPerLineBUnit * (cfg.allocationLineBPct / 100)).toFixed(1));

    const totalDemandRatePerHr = Number((demandRateLineAPerHr + demandRateLineBPerHr).toFixed(1));

    const dailyDemandLineA = isMain
      ? cfg.lineId === 'line-a'
        ? dailyDemandA
        : 0
      : Math.round(dailyDemandA * cfg.bomPerLineAUnit * (cfg.allocationLineAPct / 100));

    const dailyDemandLineB = isMain
      ? cfg.lineId === 'line-b'
        ? dailyDemandB
        : 0
      : Math.round(dailyDemandB * cfg.bomPerLineBUnit * (cfg.allocationLineBPct / 100));

    const totalDailyDemand = dailyDemandLineA + dailyDemandLineB;
    const taktTimeSec =
      totalDemandRatePerHr > 0 ? Number((3600 / totalDemandRatePerHr).toFixed(1)) : 0;

    const hourlyBalance = Number((netUph - totalDemandRatePerHr).toFixed(1));
    const dailyBalance = dailyCapacityUnits - totalDailyDemand;

    // 24-Hour Material Flow Simulation (t = 0 is 08:00, t = 15 is 23:00, t = 23 is 07:00)
    // Main Assembly lines run during hours 0 .. ceil(totalOpHours) - 1
    // Feeder lines may have headStartHours (pre-run before 08:00, which arrives into initial/early hours)
    // and transferLeadTimeMins delay before produced parts reach downstream supermarket.
    const delayHours = cfg.transferLeadTimeMins / 60;
    const preRunBonusUnits =
      !isMain && cfg.headStartHours > 0
        ? Math.round(
            Math.max(0, cfg.headStartHours - delayHours) *
              netUph *
              // Only count pre-run if total hours fit within 24h or represents prior night shift carry-over
              1
          )
        : 0;

    // Active production hours on the 08:00 -> 08:00 timeline
    // If 3 shifts -> runs up to 24h; if 2 shifts + OT -> runs 0..operatingHoursPerDay
    // Subtract changeover from early shift efficiency
    const effectiveEfficiencyDuringRun =
      operatingHoursPerDay > 0 ? netProductionHoursPerDay / operatingHoursPerDay : 1;

    // Build hourly arrival & consumption arrays (24 slots)
    const hourlyTimeline: VsmHourlyPoint[] = [];
    let runningBuffer = cfg.initialBufferStock + preRunBonusUnits;
    let cumSupply = cfg.initialBufferStock + preRunBonusUnits;
    let cumDemand = 0;
    let minBufferUnits = runningBuffer;
    let firstShortageHour: number | null = null;
    let firstShortageClock: string | null = null;

    // Track fractional production arrival due to transferLeadTimeMins
    const hourlyProduced: number[] = Array(24).fill(0);
    for (let h = 0; h < 24; h++) {
      // Production active fraction in hour h [h, h+1]
      const activeFrac = Math.max(0, Math.min(1, operatingHoursPerDay - h));
      hourlyProduced[h] = netUph * effectiveEfficiencyDuringRun * activeFrac;
    }

    for (let h = 0; h < 24; h++) {
      // Supply arriving at hour h considering transferLeadTimeMins
      // Example: delayHours = 0.75h -> 25% of hour h production + 75% of hour h-1 production arrives in hour h
      const wholeDelay = Math.floor(delayHours);
      const fracDelay = delayHours - wholeDelay;

      let arrived = 0;
      const idxCurrent = h - wholeDelay;
      const idxPrev = h - wholeDelay - 1;
      if (idxCurrent >= 0 && idxCurrent < 24) {
        arrived += hourlyProduced[idxCurrent] * (1 - fracDelay);
      }
      if (idxPrev >= 0 && idxPrev < 24) {
        arrived += hourlyProduced[idxPrev] * fracDelay;
      }

      // Downstream demand in hour h
      let demandH = 0;
      if (!isMain) {
        const activeFracA = Math.max(0, Math.min(1, totalOpHoursA - h));
        const activeFracB = Math.max(0, Math.min(1, totalOpHoursB - h));
        const effA = totalOpHoursA > 0 ? netOpHoursA / totalOpHoursA : 1;
        const effB = totalOpHoursB > 0 ? netOpHoursB / totalOpHoursB : 1;
        demandH =
          demandRateLineAPerHr * effA * activeFracA +
          demandRateLineBPerHr * effB * activeFracB;
      } else {
        const activeFracSelf = Math.max(0, Math.min(1, operatingHoursPerDay - h));
        demandH = netUph * effectiveEfficiencyDuringRun * activeFracSelf;
        arrived = demandH; // Main assembly produces finished goods directly
      }

      const supplyRounded = Math.round(arrived);
      const demandRounded = Math.round(demandH);

      cumSupply += supplyRounded;
      cumDemand += demandRounded;
      runningBuffer = Math.round(runningBuffer + arrived - demandH);

      if (runningBuffer < minBufferUnits) {
        minBufferUnits = runningBuffer;
      }

      if (!isMain && runningBuffer < 0 && firstShortageHour === null) {
        firstShortageHour = h;
        firstShortageClock = formatClockHour(h);
      }

      hourlyTimeline.push({
        hourIndex: h,
        clockLabel: formatClockHour(h),
        supplyUnits: supplyRounded,
        demandUnits: demandRounded,
        cumSupply: Math.round(cumSupply),
        cumDemand: Math.round(cumDemand),
        bufferEnd: runningBuffer,
      });
    }

    const endingBufferUnits = runningBuffer;
    const safetyBufferUnits = Math.round(totalDemandRatePerHr * cfg.safetyBufferHours);
    const bufferCoverageHours =
      totalDemandRatePerHr > 0
        ? Number(((cfg.initialBufferStock + preRunBonusUnits) / totalDemandRatePerHr).toFixed(1))
        : 24;

    // Determine On-Time Delivery Status
    let status: VsmDeliveryStatus = 'ON_TIME';
    let statusReason = '';
    let recommendedAction = '';

    if (isMain) {
      status = 'ON_TIME';
      statusReason = `ไลน์ประกอบหลักเป้าหมาย ${grossUph} UPH (สุทธิ ${netUph}/ชม. หลังหัก OEE)`;
      recommendedAction = 'ควบคุมไลน์ให้เดินตาม Takt Time และติดตามความพร้อมชิ้นส่วนต้นน้ำ';
    } else if (minBufferUnits < 0) {
      status = 'LATE_SHORTAGE';
      const deficitAmt = Math.abs(minBufferUnits);
      if (dailyBalance < 0) {
        statusReason = `กำลังผลิตรวมขาด ${Math.abs(dailyBalance).toLocaleString()} ชิ้น/วัน · สต็อกหน้าไลน์หมดเวลา ${firstShortageClock}`;
      } else {
        statusReason = `กำลังผลิตต่อวันพอ แต่สต็อกต้นกะไม่พอรอ Lead Time (${cfg.transferLeadTimeMins} นาที) · ขาดเวลา ${firstShortageClock}`;
      }

      if (dailyBalance < 0 && cfg.shiftsPerDay < 3) {
        const neededExtraHrs = Number((Math.abs(dailyBalance) / Math.max(1, netUph)).toFixed(1));
        recommendedAction = `เพิ่มกะเป็น 3 กะ หรือเปิด OT ${neededExtraHrs} ชม./วัน และสำรองสต็อกต้นกะอย่างน้อย ${deficitAmt + safetyBufferUnits} ชิ้น`;
      } else if (dailyBalance < 0) {
        const neededUph = Math.ceil((totalDailyDemand / Math.max(1, netProductionHoursPerDay)) / (oeePct / 100));
        recommendedAction = `ผลิตเต็ม 24 ชม. แล้วยังไม่พอ ต้องปรับความเร็วเป็น ${neededUph} UPH (หรือเพิ่มเครื่องจักร/Subcon)`;
      } else {
        recommendedAction = `เพิ่ม Initial Buffer หรือเริ่มผลิตก่อนไลน์ประกอบ (Head-start) อย่างน้อย ${Math.ceil(cfg.transferLeadTimeMins / 60 + 1)} ชม.`;
      }
    } else if (minBufferUnits < safetyBufferUnits || dailyBalance < 0) {
      status = 'AT_RISK';
      statusReason =
        dailyBalance < 0
          ? `รอดได้ด้วยสต็อกเก่า แต่กำลังผลิตจริงต่ำกว่ายอดใช้ ${Math.abs(dailyBalance).toLocaleString()} ชิ้น/วัน (Buffer ลดลง)`
          : `ส่งทันเวลาแต่ Buffer ต่ำสุด (${minBufferUnits} ชิ้น) ต่ำกว่าเกณฑ์ปลอดภัย (${safetyBufferUnits} ชิ้น)`;
      recommendedAction =
        dailyBalance < 0
          ? `ควรเพิ่ม OT ${Math.ceil(Math.abs(dailyBalance) / Math.max(1, netUph))} ชม. เพื่อไม่ให้กินสต็อกสะสมหมดในวันถัดไป`
          : `เพิ่มสต็อกกันชนอีก ${safetyBufferUnits - minBufferUnits} ชิ้น หรือลดเวลา Changeover (SMED)`;
    } else {
      status = 'ON_TIME';
      statusReason = `ส่ง Part ทันเวลา 100% · กำลังผลิตเกินพอ (+${dailyBalance.toLocaleString()} ชิ้น/วัน) และมี Buffer ต่ำสุด ${minBufferUnits} ชิ้น`;
      recommendedAction = 'สถานะสมดุล (Synchronized) รักษารอบการส่ง Kanban ตามขนาด Lot';
    }

    evaluations[cfg.lineId] = {
      config: cfg,
      lineName: lineObj?.name || meta?.name || cfg.lineId,
      shortCode: lineObj?.shortCode || meta?.shortCode || cfg.lineId,
      color: meta?.color || '#06b6d4',
      grossUph,
      oeePct,
      netUph,
      operatingHoursPerDay,
      netProductionHoursPerDay,
      dailyCapacityUnits,
      demandRateLineAPerHr,
      demandRateLineBPerHr,
      totalDemandRatePerHr,
      dailyDemandLineA,
      dailyDemandLineB,
      totalDailyDemand,
      hourlyBalance,
      dailyBalance,
      endingBufferUnits,
      minBufferUnits,
      safetyBufferUnits,
      firstShortageClock,
      firstShortageHour,
      bufferCoverageHours,
      cycleTimeSec: maxStationCt,
      taktTimeSec,
      status,
      statusReason,
      recommendedAction,
      hourlyTimeline,
    };
  });

  const feederIds = ['line-thermoforming', 'line-injection', 'line-door-a', 'line-door-b', 'line-door-c'];
  const mainIds = ['line-a', 'line-b'];

  const feederEvaluations = feederIds.map((id) => evaluations[id]).filter(Boolean);
  const mainLineEvaluations = mainIds.map((id) => evaluations[id]).filter(Boolean);

  const onTimeCount = feederEvaluations.filter((e) => e.status === 'ON_TIME').length;
  const atRiskCount = feederEvaluations.filter((e) => e.status === 'AT_RISK').length;
  const shortageCount = feederEvaluations.filter((e) => e.status === 'LATE_SHORTAGE').length;

  const overallStatus: VsmDeliveryStatus =
    shortageCount > 0 ? 'LATE_SHORTAGE' : atRiskCount > 0 ? 'AT_RISK' : 'ON_TIME';

  // Critical path Lead Time calculation (TF -> Door -> Main Assembly)
  const tfEval = evaluations['line-thermoforming'];
  const doorEvals = ['line-door-a', 'line-door-b', 'line-door-c']
    .map((id) => evaluations[id])
    .filter(Boolean);
  const avgDoorWaitHrs =
    doorEvals.length > 0
      ? doorEvals.reduce((s, d) => s + d.config.transferLeadTimeMins / 60 + d.bufferCoverageHours, 0) /
        doorEvals.length
      : 2;
  const tfWaitHrs = tfEval
    ? tfEval.config.transferLeadTimeMins / 60 + tfEval.bufferCoverageHours
    : 2;
  const mainTransferHrs =
    ((cfgA?.transferLeadTimeMins || 20) + (cfgB?.transferLeadTimeMins || 20)) / 120;

  const totalValueAddedSec =
    (tfEval?.cycleTimeSec || 28) +
    (evaluations['line-door-b']?.cycleTimeSec || 32) +
    (evaluations['line-b']?.cycleTimeSec || 23);

  const totalLeadTimeHours = Number(
    (tfWaitHrs + avgDoorWaitHrs + mainTransferHrs + totalValueAddedSec / 3600).toFixed(2)
  );
  const processCycleEfficiencyPct =
    totalLeadTimeHours > 0
      ? Number(((totalValueAddedSec / (totalLeadTimeHours * 3600)) * 100).toFixed(2))
      : 0;

  return {
    evaluations,
    feederEvaluations,
    mainLineEvaluations,
    overallStatus,
    onTimeCount,
    atRiskCount,
    shortageCount,
    totalDailyDemandUnitsA: dailyDemandA,
    totalDailyDemandUnitsB: dailyDemandB,
    totalDailyDemandCombined: dailyDemandA + dailyDemandB,
    totalLeadTimeHours,
    totalValueAddedSec,
    processCycleEfficiencyPct,
  };
}

/**
 * Auto-Balance VSM Feeder Plans so TF, Injection, and Door Lines deliver on time to Line A & B
 */
export function autoBalanceVsmConfigs(
  lines: Record<string, LineData>,
  vsmConfigs: VsmNodeConfig[]
): {
  updatedConfigs: VsmNodeConfig[];
  uphAdjustmentsNeeded: { lineId: string; currentUph: number; requiredUph: number }[];
} {
  const analysis = evaluateVsmSupplyChain(lines, vsmConfigs);
  const uphAdjustmentsNeeded: { lineId: string; currentUph: number; requiredUph: number }[] = [];

  const updatedConfigs = vsmConfigs.map((cfg) => {
    if (cfg.role === 'main_assembly') return cfg;

    const evalItem = analysis.evaluations[cfg.lineId];
    if (!evalItem) return cfg;

    const next = { ...cfg };
    const lineObj = lines[cfg.lineId];
    const shiftHours = lineObj?.shiftConfig?.plannedOperatingHours || 8;
    const netUph = evalItem.netUph;

    // 1. Ensure daily capacity >= totalDailyDemand
    const requiredNetHours = evalItem.totalDailyDemand / Math.max(1, netUph);
    const requiredGrossHours = requiredNetHours + next.changeoverMinsPerDay / 60;

    if (requiredGrossHours <= 2 * shiftHours) {
      next.shiftsPerDay = 2;
      next.otHoursPerDay = 0;
    } else if (requiredGrossHours <= 2 * shiftHours + 4) {
      next.shiftsPerDay = 2;
      next.otHoursPerDay = Number(Math.ceil((requiredGrossHours - 2 * shiftHours) * 2) / 2);
    } else if (requiredGrossHours <= 3 * shiftHours) {
      next.shiftsPerDay = 3;
      next.otHoursPerDay = 0;
    } else {
      // Even 3 shifts (24h) at current UPH is slightly short; max out 3 shifts and flag UPH upgrade
      next.shiftsPerDay = 3;
      next.otHoursPerDay = 0;
      const maxNetHrs24 = Math.max(1, 24 - next.changeoverMinsPerDay / 60);
      const reqUph = Math.ceil(
        evalItem.totalDailyDemand / maxNetHrs24 / (evalItem.oeePct / 100)
      );
      if (reqUph > evalItem.grossUph) {
        uphAdjustmentsNeeded.push({
          lineId: cfg.lineId,
          currentUph: evalItem.grossUph,
          requiredUph: reqUph,
        });
      }
    }

    // 2. Ensure head-start & initial buffer cover transferLeadTime + safetyBufferHours
    const minSafetyUnits = Math.ceil(evalItem.totalDemandRatePerHr * Math.max(1.5, next.safetyBufferHours));
    const leadTimeUnits = Math.ceil(evalItem.totalDemandRatePerHr * (next.transferLeadTimeMins / 60));
    const recommendedBuffer = Math.max(next.initialBufferStock, minSafetyUnits + leadTimeUnits);

    next.initialBufferStock = Math.ceil(recommendedBuffer / 10) * 10;
    if (next.headStartHours < Math.ceil(next.transferLeadTimeMins / 60)) {
      next.headStartHours = Math.ceil(next.transferLeadTimeMins / 60) + 1;
    }

    return next;
  });

  return { updatedConfigs, uphAdjustmentsNeeded };
}
