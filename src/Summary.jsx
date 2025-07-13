import React from 'react';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0
  }).format(amount);
};

const Summary = ({ loans }) => {
  // จำนวนลูกค้าทั้งหมด
  const totalCustomers = loans.length;

  // คำนวณสถานะแต่ละ loan
  const getStatus = (loan) => {
    // เงินต้นคงเหลือ, ดอกเบี้ยค้างชำระ, ค่าปรับ
    let currentPrincipal = loan.principal;
    let totalPaid = 0;
    let interestRate = loan.interestRate ?? 0.2;
    let penaltyRate = loan.penaltyRate ?? 0.05;
    let payments = loan.payments || [];
    let periodStart = new Date(loan.startDate);
    let periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 7);
    let penalty = 0;
    let interestDue = 0;
    let nextPaymentDue = new Date(periodEnd);
    let interestPaidThisPeriod = 0;
    let prepay = false;
    const principalDueDate = new Date(loan.startDate);
    principalDueDate.setDate(principalDueDate.getDate() + 7);
    const sortedPayments = [...payments].sort((a, b) => new Date(a.date) - new Date(b.date));
    for (const payment of sortedPayments) {
      totalPaid += payment.amount;
      const paymentDate = new Date(payment.date);
      paymentDate.setHours(0,0,0,0);
      if (paymentDate < periodEnd) {
        const periodInterest = currentPrincipal * interestRate;
        let paymentLeft = payment.amount;
        if (interestPaidThisPeriod < periodInterest) {
          const payInterest = Math.min(paymentLeft, periodInterest - interestPaidThisPeriod);
          interestPaidThisPeriod += payInterest;
          paymentLeft -= payInterest;
          if (interestPaidThisPeriod >= periodInterest) {
            prepay = true;
          }
        }
        if (paymentLeft > 0) {
          currentPrincipal = Math.max(0, currentPrincipal - paymentLeft);
        }
      } else {
        const periodInterest = currentPrincipal * interestRate;
        let paymentLeft = payment.amount;
        if (interestPaidThisPeriod < periodInterest) {
          const payInterest = Math.min(paymentLeft, periodInterest - interestPaidThisPeriod);
          interestPaidThisPeriod += payInterest;
          paymentLeft -= payInterest;
          if (interestPaidThisPeriod >= periodInterest) {
            periodStart = new Date(paymentDate);
            periodEnd = new Date(periodStart);
            periodEnd.setDate(periodEnd.getDate() + 7);
            interestPaidThisPeriod = 0;
            prepay = false;
          }
        }
        if (paymentLeft > 0) {
          currentPrincipal = Math.max(0, currentPrincipal - paymentLeft);
        }
      }
    }
    const periodInterest = currentPrincipal * interestRate;
    if (prepay) {
      nextPaymentDue = new Date(periodEnd);
      nextPaymentDue.setDate(nextPaymentDue.getDate() + 7);
      interestDue = 0;
      penalty = 0;
    } else {
      nextPaymentDue = new Date(principalDueDate);
      interestDue = 0;
      penalty = 0;
    }
    return {
      currentPrincipal,
      interestDue,
      penalty,
      totalPaid,
    };
  };

  // รวมยอดเงินกู้ทั้งหมด
  const totalPrincipal = loans.reduce((sum, l) => sum + (l.principal || 0), 0);
  // รวมยอดเงินที่เก็บได้ (รวมทุก payment)
  const totalPaid = loans.reduce((sum, l) => sum + ((l.payments || []).reduce((s, p) => s + (p.amount || 0), 0)), 0);
  // รวมยอดเงินคงค้าง (เงินต้นคงเหลือ + ดอกเบี้ยค้างชำระ + ค่าปรับ)
  const totalOutstanding = loans.reduce((sum, l) => {
    const s = getStatus(l);
    return sum + s.currentPrincipal + s.interestDue + s.penalty;
  }, 0);
  // รวมกำไร (ดอกเบี้ยที่เก็บได้ = totalPaid - เงินต้นทั้งหมด)
  const profit = Math.max(0, totalPaid - totalPrincipal);
  // จำนวนลูกค้าที่ปิดบัญชี (จ่ายครบ)
  const fullyPaidCount = loans.filter(l => {
    const s = getStatus(l);
    return s.currentPrincipal === 0 && s.interestDue === 0 && s.penalty === 0;
  }).length;
  // จำนวนลูกค้าที่ค้างชำระ
  const activeCount = totalCustomers - fullyPaidCount;

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">สรุปผลรวม</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="text-gray-600">ยอดเงินกู้ทั้งหมด</div>
          <div className="text-2xl font-bold text-blue-700">{formatCurrency(totalPrincipal)}</div>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <div className="text-gray-600">ยอดเงินที่เก็บได้แล้ว</div>
          <div className="text-2xl font-bold text-green-700">{formatCurrency(totalPaid)}</div>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4">
          <div className="text-gray-600">ยอดเงินคงค้าง</div>
          <div className="text-2xl font-bold text-yellow-700">{formatCurrency(totalOutstanding)}</div>
        </div>
        <div className="bg-pink-50 rounded-xl p-4">
          <div className="text-gray-600">กำไรจากดอกเบี้ย</div>
          <div className="text-2xl font-bold text-pink-700">{formatCurrency(profit)}</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="text-gray-600">จำนวนลูกค้าทั้งหมด</div>
          <div className="text-2xl font-bold text-gray-700">{totalCustomers}</div>
        </div>
        <div className="bg-purple-50 rounded-xl p-4">
          <div className="text-gray-600">ลูกค้าที่ปิดบัญชีแล้ว</div>
          <div className="text-2xl font-bold text-purple-700">{fullyPaidCount}</div>
        </div>
        <div className="bg-red-50 rounded-xl p-4">
          <div className="text-gray-600">ลูกค้าที่ค้างชำระ</div>
          <div className="text-2xl font-bold text-red-700">{activeCount}</div>
        </div>
      </div>
    </div>
  );
};

export default Summary; 