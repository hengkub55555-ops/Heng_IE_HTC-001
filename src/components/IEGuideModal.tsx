import React from 'react';
import { BookOpen, Check, Calculator, Info } from 'lucide-react';

export const IEGuideTab: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="pb-3 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          <span>คู่มือสูตรและมาตรฐานการคำนวณทางวิศวกรรมอุตสาหการ (IE Standard Formulas & Methodology)</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          เอกสารอ้างอิงสูตรคำนวณกำลังคน (Manpower Planning), Takt Time, UPPH และการปรับสมดุลสายการผลิตที่ใช้ในระบบนี้
        </p>
      </div>

      {/* Grid of Formulas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Formula 1: Takt Time */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-cyan-300">1. Takt Time (จังหวะความต้องการของลูกค้า)</span>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800 px-2 py-0.5 rounded">
              วินาที/ชิ้น
            </span>
          </div>
          <div className="p-2.5 bg-slate-950/80 rounded-lg font-mono text-xs text-slate-200 border border-slate-800">
            Takt Time (TT) = เวลาทำงานสุทธิที่ใช้งานได้ (วินาที) / ความต้องการของลูกค้า (ชิ้น)
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            เป็นตัวกำหนดจังหวะความเร็วของสายการผลิต หาก Cycle Time ของขั้นตอนใดเกิน Takt Time แสดงว่าไลน์นั้นผลิตไม่ทันเป้าหมายของลูกค้า
          </p>
        </div>

        {/* Formula 2: UPH (Units Per Hour) */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-emerald-300">2. UPH (Units Per Hour)</span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
              ชิ้น/ชั่วโมง
            </span>
          </div>
          <div className="p-2.5 bg-slate-950/80 rounded-lg font-mono text-xs text-slate-200 border border-slate-800">
            UPH = 3,600 / Bottleneck Cycle Time (วินาที)
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            จำนวนชิ้นงานที่สายการผลิตสามารถผลิตได้ในเวลา 1 ชั่วโมง ถูกจำกัดด้วยขั้นตอนที่เป็นคอขวด (Bottleneck Station) ซึ่งมีรอบเวลาการทำงานนานที่สุด
          </p>
        </div>

        {/* Formula 3: UPPH (Units Per Person Hour) */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-sky-300">3. UPPH (Units Per Person Hour)</span>
            <span className="text-[10px] font-mono text-sky-400 bg-sky-950/60 border border-sky-800 px-2 py-0.5 rounded">
              ชิ้น / คน·ชั่วโมง
            </span>
          </div>
          <div className="p-2.5 bg-slate-950/80 rounded-lg font-mono text-xs text-slate-200 border border-slate-800">
            UPPH = ผลผลิตรวม (ชิ้น) / [จำนวนคนทำงานรวม (คน) × ชั่วโมงทำงาน (ชม.)]
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            ดัชนีชี้วัดผลิตภาพแรงงาน (Labor Productivity) ที่วิศวกร IE และผู้บริหารใช้เปรียบเทียบประสิทธิภาพ ยิ่งค่าสูงแสดงว่าใช้แรงงานได้อย่างคุ้มค่าสูงสุด
          </p>
        </div>

        {/* Formula 4: Line Balance Efficiency (LBE) */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-purple-300">4. Line Balance Efficiency (LBE)</span>
            <span className="text-[10px] font-mono text-purple-400 bg-purple-950/60 border border-purple-800 px-2 py-0.5 rounded">
              เปอร์เซ็นต์ %
            </span>
          </div>
          <div className="p-2.5 bg-slate-950/80 rounded-lg font-mono text-xs text-slate-200 border border-slate-800">
            LBE = [ผลรวมรอบเวลาทุกสถานี (∑ CT)] / [จำนวนสถานี (N) × CT สูงสุด] × 100%
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            ความสมดุลของการกระจายภาระงาน เกณฑ์มาตรฐานอุตสาหกรรมควรได้มากกว่า 85% หากน้อยกว่านี้จะมีเวลาสูญเปล่า (Balance Loss = 100 - LBE)
          </p>
        </div>

        {/* Formula 5: Manpower Required Scaling */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-amber-300">5. Required Manpower (การคำนวณคนตามเป้าผลิต)</span>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded">
              คน (Headcount)
            </span>
          </div>
          <div className="p-2.5 bg-slate-950/80 rounded-lg font-mono text-xs text-slate-200 border border-slate-800">
            DL MP = [ยอดผลิตเป้าหมาย × ปริมาณเนื้องาน (Work Content วินาที)] / [เวลาทำงานต่อกะ (วินาที) × OEE %]
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            สูตรคำนวณจำนวนคนทางตรงที่แม่นยำตามหลักการวิศวกรรม โดยคำนึงถึงประสิทธิภาพความพร้อมของเครื่องจักรและการทำงานจริง (OEE)
          </p>
        </div>

        {/* Formula 6: Spare Manpower Buffer */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-rose-300">6. Spare / Relief Manpower (กำลังคนสำรอง)</span>
            <span className="text-[10px] font-mono text-rose-400 bg-rose-950/60 border border-rose-800 px-2 py-0.5 rounded">
              บัฟเฟอร์ %
            </span>
          </div>
          <div className="p-2.5 bg-slate-950/80 rounded-lg font-mono text-xs text-slate-200 border border-slate-800">
            Spare MP = Total DL × อัตราการขาดงานเฉลี่ย (Absenteeism Buffer % เช่น 3% - 5%)
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            สำรองไว้สำหรับเปลี่ยนกะเข้าห้องน้ำ (Relief), ลากิจ, ลาป่วย หรือการอบรม เพื่อให้สายการผลิตหลักทำงานได้อย่างต่อเนื่องไม่มีการหยุดชะงัก
          </p>
        </div>
      </div>

      {/* IE Decision Matrix Card */}
      <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Calculator className="w-4 h-4 text-cyan-400" />
          <span>เกณฑ์การตัดสินใจเชิงวิศวกรรม: ล่วงเวลา (OT) vs การจ้างพนักงานใหม่ (Hiring)</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-2.5">ยอดผลิตเพิ่ม (Demand Boost)</th>
                <th className="p-2.5">ระยะเวลาความต้องการ (Duration)</th>
                <th className="p-2.5">กลยุทธ์ที่แนะนำ (IE Strategy)</th>
                <th className="p-2.5">เหตุผลและข้อควรระวัง (Considerations)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr>
                <td className="p-2.5 font-mono text-cyan-400 font-bold">+5% ถึง +15%</td>
                <td className="p-2.5">สั้นถึงปานกลาง (1-3 เดือน)</td>
                <td className="p-2.5 font-semibold text-emerald-400">ใช้ Overtime (OT 1.0 - 1.5 ชม.)</td>
                <td className="p-2.5 text-slate-400">ประหยัดค่าสรรหาและการฝึกอบรม คนเดิมชำนาญงานอยู่แล้ว</td>
              </tr>
              <tr>
                <td className="p-2.5 font-mono text-amber-400 font-bold">+15% ถึง +30%</td>
                <td className="p-2.5">ปานกลาง (2-4 เดือน)</td>
                <td className="p-2.5 font-semibold text-amber-300">OT 2.0 - 2.5 ชม. + รับพนักงานสัญญาจ้าง</td>
                <td className="p-2.5 text-slate-400">ป้องกันความเหนื่อยล้า (Fatigue loss) ที่อาจทำให้เกิดงานเสีย (Defect)</td>
              </tr>
              <tr>
                <td className="p-2.5 font-mono text-rose-400 font-bold">+30% ถึง +50% ขึ้นไป</td>
                <td className="p-2.5">ต่อเนื่อง (&gt; 3 เดือน)</td>
                <td className="p-2.5 font-semibold text-rose-400">เปิดกะ 3 (3-Shifts) หรือเปิดไลน์ผลิตใหม่</td>
                <td className="p-2.5 text-slate-400">ต้องวางแผนสรรหาพนักงานล่วงหน้า 30-45 วันเพื่อรองรับ Learning Curve</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
