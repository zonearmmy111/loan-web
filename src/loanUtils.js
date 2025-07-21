// Utility function สำหรับคำนวณสถานะเงินกู้
export function calculateCurrentStatus(loan, currentDate) {
  const principal = loan.principal || 0;
  const interestRate = loan.interestRate ?? 0.2;
  const penaltyRate = loan.penaltyRate ?? 0.05;
  const startDate = new Date(loan.startDate);
  const today = currentDate; // ใช้เวลาที่ส่งเข้ามา
  const payments = (loan.payments || []).map(p => ({ ...p, date: new Date(p.date) })).sort((a, b) => a.date - b.date);

  let currentPrincipal = principal;
  let interestDue = 0;
  let interestPaid = 0;
  let penalty = 0;
  let penaltyPaid = 0;
  let totalPaid = 0;
  let interestThisPeriod = currentPrincipal * interestRate;
  let interestPaidThisPeriod = 0;
  let penaltyThisPeriod = 0;
  let penaltyPaidThisPeriod = 0;
  let paymentIdx = 0;
  let nextPaymentDue;
  let principalDueDate;
  let lastInterestPaymentDate = null;
  let isOverdue = false;
  let daysOverdue = 0;
  let paidAllInterest = false;
  let hadPenalty = false;
  let periodStart = new Date(startDate);
  let periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + 7);

  // DEBUG LOG: ข้อมูลเริ่มต้น
  // console.log('==== Loan Calculation Debug Start ====');
  // console.log('Principal:', principal, 'InterestRate:', interestRate, 'PenaltyRate:', penaltyRate);
  // console.log('Payments:', payments);
  // วนรอบ 7 วัน
  while (true) {
    let periodPenalty = 0;
    let periodInterest = currentPrincipal * interestRate;
    let periodInterestDue = periodInterest;
    let periodInterestPaid = 0;
    let periodPenaltyPaid = 0;
    let periodPayments = [];
    // รวบรวม payment ที่อยู่ในรอบนี้ (หรือหลังครบกำหนดแต่ยังไม่จ่ายครบ)
    while (paymentIdx < payments.length && payments[paymentIdx].date <= periodEnd) {
      periodPayments.push(payments[paymentIdx]);
      paymentIdx++;
    }
    // ถ้าไม่มี payment ในรอบนี้ และเลย periodEnd ให้คิดค่าปรับถึงวันนี้เท่านั้น
    if (periodPayments.length === 0 && today > periodEnd) {
      // ตรวจสอบว่ามี payment หลังครบกำหนดหรือไม่
      if (paymentIdx < payments.length && payments[paymentIdx].date > periodEnd) {
        // มี payment หลังครบกำหนด ให้ขยับ periodStart/periodEnd ไปยังรอบถัดไป แล้ววน loop ต่อ
        periodStart = new Date(periodEnd);
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + 7);
        continue;
      }
      // ไม่มี payment หลังครบกำหนด ให้คิดค่าปรับถึงวันนี้ (กรณีไม่มีการจ่ายเลย)
      let lateDays = Math.max(0, Math.floor((today - periodEnd) / (1000 * 60 * 60 * 24)));
      isOverdue = lateDays > 0;
      daysOverdue = lateDays;
      periodPenalty = currentPrincipal * penaltyRate * lateDays;
      penalty += periodPenalty;
      interestDue += periodInterest;
      hadPenalty = hadPenalty || (lateDays > 0);
      break;
    }
    // ถ้ามี payment ในรอบนี้
    let paidThisPeriod = false;
    for (const payment of periodPayments) {
      let paymentLeft = payment.amount;
      totalPaid += payment.amount;
      // ถ้าจ่ายหลัง periodEnd ให้คิดค่าปรับเฉพาะวันที่ยังไม่จ่ายดอกเบี้ย (คิดจากวันครบกำหนดถึงวันจ่ายจริงเท่านั้น)
      let lateDays = 0;
      if (payment.date > periodEnd) {
        lateDays = Math.max(0, Math.floor((payment.date - periodEnd) / (1000 * 60 * 60 * 24)));
        if (lateDays > 0) {
          periodPenalty = currentPrincipal * penaltyRate * lateDays;
          let payPenalty = Math.min(paymentLeft, periodPenalty);
          penaltyPaidThisPeriod += payPenalty;
          penaltyPaid += payPenalty;
          paymentLeft -= payPenalty;
          penalty += periodPenalty - payPenalty;
          hadPenalty = true;
          // ปรับปรุงให้ daysOverdue แสดงจำนวนวันที่จ่ายช้า (ถ้าเป็นรอบล่าสุด)
          daysOverdue = lateDays;
          isOverdue = true;
        }
      }
      // หักดอกเบี้ย
      let payInterest = Math.min(paymentLeft, periodInterestDue);
      periodInterestPaid += payInterest;
      interestPaid += payInterest;
      paymentLeft -= payInterest;
      periodInterestDue -= payInterest;
      // หักเงินต้น
      if (paymentLeft > 0) {
        let payPrincipal = Math.min(paymentLeft, currentPrincipal);
        currentPrincipal -= payPrincipal;
        paymentLeft -= payPrincipal;
      }
      if (periodInterestDue === 0 && periodPenalty - penaltyPaidThisPeriod <= 0) {
        paidAllInterest = true;
        lastInterestPaymentDate = payment.date;
        paidThisPeriod = true;
        // ถ้าจ่ายดอกเบี้ยครบในรอบนั้น (ไม่ว่าจะมีค่าปรับหรือไม่) ให้ reset ดอกเบี้ยค้างชำระ
        interestDue = 0;
        // *** กลับไปใช้ break แทน continue เพื่อให้ logic เหมือนเดิม ***
        break;
      }
    }
    // ถ้ายังมีดอกเบี้ยค้างชำระ จะคิดค่าปรับในรอบถัดไป
    if (periodInterestDue > 0) {
      interestDue += periodInterestDue;
      isOverdue = true;
    }
    // ถ้าจ่ายครบค่าปรับ+ดอกเบี้ยแล้ว (ในรอบที่เคยโดนค่าปรับ)
    if (paidThisPeriod && hadPenalty) {
      // เริ่มรอบใหม่จากวันที่จ่ายนี้
      periodStart = new Date(lastInterestPaymentDate);
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 7);
      hadPenalty = false;
      continue;
    }
    // ถ้าจ่ายครบดอกเบี้ย (ไม่เคยโดนค่าปรับ)
    if (paidThisPeriod && !hadPenalty) {
      // เริ่มรอบใหม่จาก periodEnd เดิม
      periodStart = new Date(periodEnd);
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 7);
      continue;
    }
    // ถ้าเลยวันนี้หรือไม่มี payment เพิ่มแล้ว ให้ break
    if (periodEnd > today || paymentIdx >= payments.length) {
      break;
    }
  }
  // ดอกเบี้ยรอบนี้ (รอบที่ยังไม่ถึงกำหนด)
  let currentInterest = currentPrincipal * interestRate;
  // รวมต้องจ่าย = เงินต้นคงเหลือ + ดอกเบี้ยรอบนี้
  let totalDue = currentPrincipal + currentInterest;
  nextPaymentDue = periodEnd;
  principalDueDate = periodEnd;
  // DEBUG LOG: สรุปผลลัพธ์
  // console.log('==== Loan Calculation Debug End ====');
  // console.log('Result:', {
  //   currentPrincipal,
  //   weeklyInterest: currentInterest,
  //   interestDue,
  //   interestPaidThisWeek: interestPaid,
  //   penalty,
  //   totalDue,
  //   penaltyPaidThisPeriod,
  //   totalPaid,
  //   nextPaymentDue,
  //   principalDueDate,
  //   isOverdue,
  //   daysOverdue,
  //   lastInterestPaymentDate,
  //   interestRate,
  //   penaltyRate
  // });
  return {
    currentPrincipal,
    weeklyInterest: currentInterest,
    interestDue,
    interestPaidThisWeek: interestPaid,
    penalty,
    totalDue,
    penaltyPaidThisPeriod,
    totalPaid,
    nextPaymentDue,
    principalDueDate,
    isOverdue,
    daysOverdue,
    lastInterestPaymentDate,
    interestRate,
    penaltyRate
  };
} 