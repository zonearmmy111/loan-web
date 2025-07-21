import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Save, X, Calendar, DollarSign, User, Trash2 } from 'lucide-react';
import { supabase } from './supabaseClient';

const DEFAULT_INTEREST = 0.2;
const DEFAULT_PENALTY = 0.05;

const LoanTracker = ({ loans, refreshLoans }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [editRateLoan, setEditRateLoan] = useState(null);
  const [rateForm, setRateForm] = useState({ interestRate: '', penaltyRate: '' });
  const [activeTab, setActiveTab] = useState('active'); // 'active' หรือ 'paid'
  const [showBill, setShowBill] = useState(false);
  
  const getLocalDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [newLoan, setNewLoan] = useState({
    borrowerName: '',
    principal: '',
    startDate: getLocalDateString(),
    phone: '',
    note: '',
    paidInterest: false,
    hasCollateral: false
  });

  const [payment, setPayment] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [editingPayment, setEditingPayment] = useState(null);
  const [editPaymentForm, setEditPaymentForm] = useState({ amount: '', date: '' });

  const [editCustomer, setEditCustomer] = useState(null);
  const [editCustomerForm, setEditCustomerForm] = useState({ borrowerName: '', note: '', phone: '', paidInterest: false, hasCollateral: false });

  // โหลดข้อมูล loans จาก Supabase
  useEffect(() => {
    const fetchLoans = async () => {
      const { data, error } = await supabase.from('loans').select('*');
      if (error) {
        alert('โหลดข้อมูลผิดพลาด: ' + error.message);
      } else {
        refreshLoans(data);
      }
    };
    fetchLoans();
  }, []);

  // เพิ่ม loan ลง Supabase
  const addLoan = async () => {
    if (!newLoan.borrowerName || !newLoan.principal) return;
    const { data, error } = await supabase.from('loans').insert([
      {
        borrowerName: newLoan.borrowerName,
        principal: parseFloat(newLoan.principal),
        startDate: newLoan.startDate,
        phone: newLoan.phone,
        note: newLoan.note,
        payments: [],
        interestRate: DEFAULT_INTEREST,
        penaltyRate: DEFAULT_PENALTY,
        paidInterest: newLoan.paidInterest,
        hasCollateral: newLoan.hasCollateral
      }
    ]).select();
    if (error) {
      alert('เพิ่มข้อมูลผิดพลาด: ' + error.message);
    } else {
      refreshLoans([...loans, ...data]);
      setNewLoan({ borrowerName: '', principal: '', startDate: getLocalDateString(), phone: '', note: '', paidInterest: false, hasCollateral: false });
      setShowAddForm(false);
    }
  };

  // เพิ่ม/อัปเดต payments ใน Supabase
  const addPayment = async (loanId) => {
    if (!payment.amount) return;
    const loan = loans.find(l => l.id === loanId);
    const updatedPayments = [...(loan.payments || []), {
      id: Date.now(),
      amount: parseFloat(payment.amount),
      date: payment.date
    }];
    const { data, error } = await supabase.from('loans').update({ payments: updatedPayments }).eq('id', loanId).select();
    if (error) {
      alert('บันทึกการจ่ายเงินผิดพลาด: ' + error.message);
    } else {
      refreshLoans(loans.map(l => l.id === loanId ? { ...l, payments: updatedPayments } : l));
      setSelectedLoan({ ...loan, payments: updatedPayments });
      setPayment({ amount: '', date: new Date().toISOString().split('T')[0] });
    }
  };

  // ลบ loan ใน Supabase
  const deleteLoan = async (loanId) => {
    const confirmed = window.confirm('คุณแน่ใจหรือไม่ที่จะลบข้อมูลนี้?');
    if (confirmed) {
      const { error } = await supabase.from('loans').delete().eq('id', loanId);
      if (error) {
        alert('ลบข้อมูลผิดพลาด: ' + error.message);
      } else {
        refreshLoans(loans.filter(loan => loan.id !== loanId));
        setSelectedLoan(null);
      }
    }
  };

  // อัปเดตอัตราดอกเบี้ย/ค่าปรับ
  const saveRate = async () => {
    if (!editRateLoan) return;
    const { error } = await supabase.from('loans').update({
      interestRate: rateForm.interestRate === '' ? null : parseFloat(rateForm.interestRate),
      penaltyRate: rateForm.penaltyRate === '' ? null : parseFloat(rateForm.penaltyRate),
    }).eq('id', editRateLoan.id);
    if (error) {
      alert('บันทึกอัตราดอกเบี้ยผิดพลาด: ' + error.message);
    } else {
      setEditRateLoan(null);
      setRateForm({ interestRate: '', penaltyRate: '' });
      refreshLoans();
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  // เพิ่มฟังก์ชันช่วยแสดงข้อความครบกำหนด
  const getDueText = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    // set time to 0 for compare only date
    today.setHours(0,0,0,0);
    due.setHours(0,0,0,0);
    const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return { text: 'พรุ่งนี้', color: 'text-orange-500' };
    if (diffDays === 0) return { text: 'วันนี้', color: 'text-green-600 font-bold' };
    if (diffDays < 0) return { text: 'เกินกำหนดชำระ', color: 'text-red-600 font-bold' };
    // แสดงวันที่ปกติ
    return { text: formatDate(dueDate), color: 'text-purple-600' };
  };

  const deletePayment = async (loanId, paymentId) => {
    const loan = loans.find(l => l.id === loanId);
    const updatedPayments = (loan.payments || []).filter(p => p.id !== paymentId);
    const { data, error } = await supabase.from('loans').update({ payments: updatedPayments }).eq('id', loanId).select();
    if (!error) {
      refreshLoans(loans.map(l => l.id === loanId ? { ...l, payments: updatedPayments } : l));
      if (selectedLoan && selectedLoan.id === loanId) setSelectedLoan({ ...loan, payments: updatedPayments });
    }
  };

  const startEditPayment = (payment) => {
    setEditingPayment(payment.id);
    setEditPaymentForm({ amount: payment.amount, date: payment.date });
  };

  const saveEditPayment = async (loanId, paymentId) => {
    const loan = loans.find(l => l.id === loanId);
    const updatedPayments = (loan.payments || []).map(p =>
      p.id === paymentId ? { ...p, amount: parseFloat(editPaymentForm.amount), date: editPaymentForm.date } : p
    );
    const { data, error } = await supabase.from('loans').update({ payments: updatedPayments }).eq('id', loanId).select();
    if (!error) {
      refreshLoans(loans.map(l => l.id === loanId ? { ...l, payments: updatedPayments } : l));
      if (selectedLoan && selectedLoan.id === loanId) setSelectedLoan({ ...loan, payments: updatedPayments });
      setEditingPayment(null);
    }
  };

  const startEditCustomer = (loan) => {
    setEditCustomer(loan.id);
    setEditCustomerForm({
      borrowerName: loan.borrowerName || '',
      note: loan.note || '',
      phone: loan.phone || '',
      paidInterest: loan.paidInterest || false,
      hasCollateral: loan.hasCollateral || false
    });
  };

  const saveEditCustomer = async (loanId) => {
    const { borrowerName, note, phone, paidInterest, hasCollateral } = editCustomerForm;
    console.log('saveEditCustomer', { loanId, borrowerName, note, phone, paidInterest, hasCollateral });
    const { data, error } = await supabase.from('loans').update({ borrowerName, note, phone, paidInterest, hasCollateral }).eq('id', loanId).select();
    if (!error) {
      refreshLoans(loans.map(l => l.id === loanId ? { ...l, borrowerName, note, phone, paidInterest, hasCollateral } : l));
      setEditCustomer(null);
    } else {
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + error.message);
      console.error('saveEditCustomer error', error);
    }
  };

  // เพิ่มฟังก์ชันนี้ไว้ก่อน return
  const calculateCurrentStatus = (loan) => {
    const principal = loan.principal || 0;
    const interestRate = loan.interestRate ?? 0.2;
    const penaltyRate = loan.penaltyRate ?? 0.05;
    const startDate = new Date(loan.startDate);
    const today = new Date();
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
    console.log('==== Loan Calculation Debug Start ====');
    console.log('Principal:', principal, 'InterestRate:', interestRate, 'PenaltyRate:', penaltyRate);
    console.log('Payments:', payments);
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
      // DEBUG LOG: รอบใหม่
      console.log('--- Period ---');
      console.log('PeriodStart:', periodStart, 'PeriodEnd:', periodEnd, 'CurrentPrincipal:', currentPrincipal);
      console.log('PeriodPayments:', periodPayments);
      // ถ้าไม่มี payment ในรอบนี้ และเลย periodEnd ให้คิดค่าปรับถึงวันนี้เท่านั้น
      if (periodPayments.length === 0 && today > periodEnd) {
        let lateDays = Math.max(0, Math.floor((today - periodEnd) / (1000 * 60 * 60 * 24)));
        isOverdue = lateDays > 0;
        daysOverdue = lateDays;
        periodPenalty = currentPrincipal * penaltyRate * lateDays;
        penalty += periodPenalty;
        interestDue += periodInterest;
        hadPenalty = hadPenalty || (lateDays > 0);
        // DEBUG LOG: ไม่มี payment ในรอบนี้และเลยกำหนด
        console.log('No payment in this period. LateDays:', lateDays, 'Penalty:', periodPenalty, 'InterestDue:', periodInterest);
        if (paymentIdx >= payments.length || payments[paymentIdx].date <= periodEnd) {
          break;
        }
        periodStart = new Date(periodEnd);
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + 7);
        continue;
      }
      // ถ้ามี payment ในรอบนี้
      let paidThisPeriod = false;
      for (const payment of periodPayments) {
        let paymentLeft = payment.amount;
        totalPaid += payment.amount;
        // ถ้าจ่ายหลัง periodEnd ให้คิดค่าปรับเฉพาะวันที่ยังไม่จ่ายดอกเบี้ย (คิดจากวันครบกำหนดถึงวันจ่ายจริงเท่านั้น)
        if (payment.date > periodEnd) {
          let lateDays = Math.max(0, Math.floor((payment.date - periodEnd) / (1000 * 60 * 60 * 24)));
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
            // DEBUG LOG: จ่ายหลังครบกำหนด
            console.log('Payment after due. PaymentDate:', payment.date, 'LateDays:', lateDays, 'Penalty:', periodPenalty, 'PayPenalty:', payPenalty, 'PaymentLeft:', paymentLeft);
          }
        }
        // หักดอกเบี้ย
        let payInterest = Math.min(paymentLeft, periodInterestDue);
        periodInterestPaid += payInterest;
        interestPaid += payInterest;
        paymentLeft -= payInterest;
        periodInterestDue -= payInterest;
        // DEBUG LOG: หักดอกเบี้ย
        console.log('PayInterest:', payInterest, 'PaymentLeft:', paymentLeft, 'InterestDueAfter:', periodInterestDue);
        // หักเงินต้น
        if (paymentLeft > 0) {
          let payPrincipal = Math.min(paymentLeft, currentPrincipal);
          currentPrincipal -= payPrincipal;
          paymentLeft -= payPrincipal;
          // DEBUG LOG: หักเงินต้น
          console.log('PayPrincipal:', payPrincipal, 'CurrentPrincipalAfter:', currentPrincipal, 'PaymentLeft:', paymentLeft);
        }
        if (periodInterestDue === 0 && periodPenalty - penaltyPaidThisPeriod <= 0) {
          paidAllInterest = true;
          lastInterestPaymentDate = payment.date;
          paidThisPeriod = true;
          // ถ้าจ่ายดอกเบี้ยครบในรอบนั้น (ไม่ว่าจะมีค่าปรับหรือไม่) ให้ reset ดอกเบี้ยค้างชำระ
          interestDue = 0;
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
        // DEBUG LOG: reset รอบใหม่หลังจ่ายครบค่าปรับ+ดอกเบี้ย
        console.log('Reset period after full payment (with penalty). NewPeriodStart:', periodStart, 'NewPeriodEnd:', periodEnd);
        continue;
      }
      // ถ้าจ่ายครบดอกเบี้ย (ไม่เคยโดนค่าปรับ)
      if (paidThisPeriod && !hadPenalty) {
        // เริ่มรอบใหม่จาก periodEnd เดิม
        periodStart = new Date(periodEnd);
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + 7);
        // DEBUG LOG: reset รอบใหม่หลังจ่ายครบดอกเบี้ย
        console.log('Reset period after full payment (no penalty). NewPeriodStart:', periodStart, 'NewPeriodEnd:', periodEnd);
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
    console.log('==== Loan Calculation Debug End ====');
    console.log('Result:', {
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
    });
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
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <DollarSign className="text-blue-600" />
              ระบบจัดการเงินกู้
            </h1>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
            >
              <Plus size={20} />
              เพิ่มรายการใหม่
            </button>
          </div>

          {/* Add New Loan Form */}
          {showAddForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">เพิ่มรายการใหม่</h2>
                  <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={24} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อผู้กู้</label>
                    <input
                      type="text"
                      value={newLoan.borrowerName}
                      onChange={(e) => setNewLoan({ ...newLoan, borrowerName: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="ระบุชื่อผู้กู้"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">จำนวนเงินต้น (บาท)</label>
                    <input
                      type="number"
                      value={newLoan.principal}
                      onChange={(e) => setNewLoan({ ...newLoan, principal: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">วันที่เริ่มต้น</label>
                    <input
                      type="date"
                      value={newLoan.startDate}
                      onChange={(e) => setNewLoan({ ...newLoan, startDate: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ช่องทางการติดต่อ</label>
                    <input
                      type="text"
                      value={newLoan.phone}
                      onChange={(e) => setNewLoan({ ...newLoan, phone: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="ระบุช่องทางการติดต่อ เช่น เบอร์โทร ไลน์ เฟซบุ๊ก ฯลฯ"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">หมายเหตุ</label>
                    <textarea
                      value={newLoan.note}
                      onChange={(e) => setNewLoan({ ...newLoan, note: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="ระบุหมายเหตุ (ถ้ามี)"
                      rows={2}
                    />
                  </div>
                  
                  <div>
                    <label className="inline-flex items-center mt-2">
                      <input
                        type="checkbox"
                        checked={newLoan.paidInterest}
                        onChange={e => setNewLoan({ ...newLoan, paidInterest: e.target.checked })}
                        className="form-checkbox h-5 w-5 text-green-600"
                      />
                      <span className="ml-2 text-sm text-gray-700">ตัดดอกแล้ว</span>
                    </label>
                  </div>

                  <div>
                    <label className="inline-flex items-center mt-2">
                      <input
                        type="checkbox"
                        checked={newLoan.hasCollateral}
                        onChange={e => setNewLoan({ ...newLoan, hasCollateral: e.target.checked })}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="ml-2 text-sm text-blue-700 font-bold">ต่อดอก</span>
                    </label>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={addLoan}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      เพิ่มรายการ
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabs for Active / Fully Paid */}
          <div className="flex gap-2 mb-4">
            <button
              className={`px-4 py-2 rounded-lg font-bold border-2 transition-colors ${activeTab === 'active' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'}`}
              onClick={() => setActiveTab('active')}
            >
              ลูกค้าที่ค้างชำระ
            </button>
            <button
              className={`px-4 py-2 rounded-lg font-bold border-2 transition-colors ${activeTab === 'paid' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-green-600 border-green-300 hover:bg-green-50'}`}
              onClick={() => setActiveTab('paid')}
            >
              ลูกค้าที่จ่ายครบแล้ว
            </button>
          </div>

          {/* Loans List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...loans]
              .filter(loan => {
                const status = calculateCurrentStatus(loan);
                const isFullyPaid = status.currentPrincipal === 0 && status.interestDue === 0 && status.penalty === 0;
                return activeTab === 'active' ? !isFullyPaid : isFullyPaid;
              })
              .sort((a, b) => {
                const aStatus = calculateCurrentStatus(a);
                const bStatus = calculateCurrentStatus(b);
                // เลือกวันที่สำหรับเปรียบเทียบตาม paidInterest
                const aKey = a.paidInterest ? aStatus.principalDueDate : aStatus.nextPaymentDue;
                const bKey = b.paidInterest ? bStatus.principalDueDate : bStatus.nextPaymentDue;
                return aKey - bKey;
              })
              .map(loan => {
                const status = calculateCurrentStatus(loan);
                const isFullyPaid = status.currentPrincipal === 0 && status.interestDue === 0 && status.penalty === 0;
                
                return (
                  <div
                    key={loan.id}
                    className={`bg-white border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg ${
                      status.isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => setSelectedLoan(loan)}
                    style={{ position: 'relative' }}
                  >
                    {isFullyPaid && (
                      <div className="absolute top-0 left-0 w-full rounded-t-xl bg-green-100 border-b-2 border-green-400 py-2 flex items-center justify-center z-10">
                        <span className="text-green-700 text-lg font-bold">✅ จ่ายครบแล้ว! เงินกู้เสร็จสิ้น</span>
                      </div>
                    )}
                    {/* ปุ่มแก้ไขอัตรา */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setEditRateLoan(loan);
                        setRateForm({
                          interestRate: loan.interestRate !== null && loan.interestRate !== undefined ? loan.interestRate : DEFAULT_INTEREST,
                          penaltyRate: loan.penaltyRate !== null && loan.penaltyRate !== undefined ? loan.penaltyRate : DEFAULT_PENALTY,
                        });
                      }}
                      className="absolute right-2 top-2 bg-yellow-200 hover:bg-yellow-300 text-yellow-800 rounded px-2 py-1 text-xs font-bold shadow"
                      title="แก้ไขอัตราดอกเบี้ย/ค่าปรับ"
                    >
                      <Edit2 size={14} className="inline" />
                    </button>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <User className={loan.paidInterest ? "text-red-600" : "text-blue-600"} size={20} />
                        <h3 className={`font-bold text-lg cursor-pointer hover:underline ${loan.paidInterest ? 'text-red-700' : 'text-gray-800'}`}
                          onClick={e => { e.stopPropagation(); startEditCustomer(loan); }}>
                          {loan.borrowerName}
                        </h3>
                      </div>
                      {status.isOverdue && status.daysOverdue > 0 && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                          เกินกำหนด {status.daysOverdue} วัน (ค่าปรับ {status.penaltyRate * 100}% ของเงินต้นต่อวัน = {formatCurrency(status.currentPrincipal * status.penaltyRate)} /วัน รวม {formatCurrency(status.penalty)})
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">เงินต้นคงเหลือ:</span>
                        <span className="font-medium text-blue-900">{formatCurrency(status.currentPrincipal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">ดอกเบี้ย+ค่าปรับที่ต้องจ่าย:</span>
                        <span className="font-medium text-orange-500">{formatCurrency(status.interestDue + status.penalty)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">ครบกำหนดจ่ายดอกเบี้ย:</span>
                        {(() => {
                          const due = getDueText(status.nextPaymentDue.toISOString().split('T')[0]);
                          return <span className={`font-bold ${due.color}`}>{due.text}</span>;
                        })()}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">ครบกำหนดจ่ายเงินต้น:</span>
                        <span className="font-bold text-purple-600">{formatDate(status.principalDueDate.toISOString().split('T')[0])}</span>
                      </div>
                      {loan.phone && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">ช่องทางการติดต่อ:</span>
                          <span className="font-medium">{loan.phone}</span>
                        </div>
                      )}
                      {loan.note && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">หมายเหตุ:</span>
                          <span className="font-medium">{loan.note}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          {loans.length === 0 && (
            <div className="text-center py-12">
              <DollarSign className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-500 text-lg">ยังไม่มีรายการเงินกู้</p>
              <p className="text-gray-400">คลิก "เพิ่มรายการใหม่" เพื่อเริ่มต้น</p>
            </div>
          )}
        </div>

        {/* Modal แก้ไขอัตราดอกเบี้ย/ค่าปรับ */}
        {editRateLoan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">แก้ไขอัตราดอกเบี้ย/ค่าปรับ</h2>
                <button onClick={() => setEditRateLoan(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">อัตราดอกเบี้ย (เช่น 0.2 = 20%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={rateForm.interestRate}
                    onChange={e => setRateForm({ ...rateForm, interestRate: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">อัตราค่าปรับ (เช่น 0.05 = 5%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={rateForm.penaltyRate}
                    onChange={e => setRateForm({ ...rateForm, penaltyRate: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={saveRate}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    บันทึก
                  </button>
                  <button
                    onClick={() => setEditRateLoan(null)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loan Details Modal */}
        {selectedLoan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">รายละเอียด - {selectedLoan.borrowerName}</h2>
                <div className="flex gap-2 items-center">
                  <button
                    className="bg-green-600 text-white px-4 py-1 rounded-lg font-bold hover:bg-green-700 transition-colors"
                    onClick={() => setShowBill(true)}
                  >
                    ออกบิล
                  </button>
                  <button
                    className="bg-red-600 text-white px-2 py-1 rounded-lg font-bold hover:bg-red-700 transition-colors flex items-center"
                    onClick={() => deleteLoan(selectedLoan.id)}
                    title="ลบลูกค้ารายนี้"
                  >
                    <Trash2 size={20} />
                  </button>
                  <button
                    onClick={() => setSelectedLoan(null)}
                    className="text-gray-400 hover:text-gray-600 p-2"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {(() => {
                const status = calculateCurrentStatus(selectedLoan);
                const isFullyPaid = status.currentPrincipal === 0 && status.interestDue === 0 && status.penalty === 0;
                return (
                  <div className="space-y-6">
                    {isFullyPaid && (
                      <div className="mb-4 p-3 bg-green-100 border border-green-400 rounded-lg flex items-center justify-center">
                        <span className="text-green-700 text-lg font-bold">✅ จ่ายครบแล้ว! เงินกู้เสร็จสิ้น</span>
                      </div>
                    )}
                    {/* เงื่อนไขพิเศษสำหรับลูกค้าไม่มีของค้ำ */}
                    {selectedLoan.hasCollateral === false && (
                      <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded-lg flex items-center">
                        <span className="text-yellow-800 text-base font-bold">
                          ลูกค้ารายนี้ไม่มีของค้ำประกัน: 7 วันแรกคิดดอกเบี้ย {status.interestRate * 100}% ของเงินต้น หลังจากนั้นคิดค่าปรับ {status.penaltyRate * 100}% ต่อวันจากเงินต้นคงเหลือ
                        </span>
                      </div>
                    )}
                    {/* Summary */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="font-bold text-lg mb-3 text-gray-800">สรุปสถานะปัจจุบัน</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">เงินต้นเริ่มต้น</p>
                          <p className="font-bold text-lg">{formatCurrency(selectedLoan.principal)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">เงินต้นคงเหลือ</p>
                          <p className="font-bold text-lg">{formatCurrency(status.currentPrincipal)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">{selectedLoan.hasCollateral === false ? 'ดอกเบี้ย 7 วันแรก' : 'ดอกเบี้ยสัปดาห์นี้'}</p>
                          <p className="font-bold text-lg text-blue-600">{formatCurrency(status.weeklyInterest)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">ดอกเบี้ยจ่ายแล้ว</p>
                          <p className="font-bold text-lg text-green-600">{formatCurrency(status.interestPaidThisWeek + (status.penaltyPaidThisWeek || 0))}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">ดอกเบี้ยค้างชำระ</p>
                          <p className="font-bold text-lg text-orange-600">{formatCurrency(status.interestDue)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">ค่าปรับ</p>
                          <p className="font-bold text-lg text-red-600">{formatCurrency(status.penalty)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">ดอกเบี้ย+ค่าปรับที่ต้องจ่าย</p>
                          <p className="font-bold text-lg text-orange-600">{formatCurrency(status.interestDue + status.penalty)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">รวมต้องจ่าย</p>
                          <p className="font-extrabold text-pink-600 text-lg drop-shadow">{formatCurrency(status.totalDue)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">ครบกำหนดจ่ายดอกเบี้ย:</p>
                          <p className="font-bold text-lg text-purple-600">{formatDate(status.nextPaymentDue.toISOString().split('T')[0])}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">ครบกำหนดจ่ายเงินต้น:</p>
                          <p className="font-bold text-lg text-purple-600">{formatDate(status.principalDueDate.toISOString().split('T')[0])}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">วันที่กู้</p>
                          <p className="font-bold text-lg text-gray-800">{formatDate(selectedLoan.startDate)}</p>
                        </div>
                      </div>
                      
                      {status.isOverdue && status.daysOverdue > 0 && (
                        <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-lg">
                          <p className="text-red-800 font-medium">
                            ⚠️ เกินกำหนดชำระ {status.daysOverdue} วัน (ค่าปรับ {status.penaltyRate * 100}% ของเงินต้นต่อวัน = {formatCurrency(status.currentPrincipal * status.penaltyRate)} /วัน รวม {formatCurrency(status.penalty)})
                          </p>
                        </div>
                      )}
                      
                      {selectedLoan.hasCollateral === false && status.penalty > 0 && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                          <p className="text-yellow-800 font-medium">
                            * หมายเหตุ: ค่าปรับคิดจากเงินต้นคงเหลือ x {status.penaltyRate * 100}% x จำนวนวันที่เกิน 7 วัน
                          </p>
                        </div>
                      )}
                      {status.interestPaidThisWeek >= status.weeklyInterest && status.interestDue === 0 && (
                        <div className="mt-3 p-3 bg-blue-100 border border-blue-300 rounded-lg">
                          <p className="text-blue-800 font-medium">✅ ชำระดอกเบี้ยสัปดาห์นี้เรียบร้อยแล้ว</p>
                          <p className="text-blue-700 text-sm">รอการชำระดอกเบี้ยในสัปดาห์ถัดไป</p>
                        </div>
                      )}
                    </div>

                    {/* Add Payment */}
                    <div className="bg-blue-50 rounded-xl p-4">
                      <h3 className="font-bold text-lg mb-3 text-gray-800">บันทึกการจ่ายเงิน</h3>
                      <div className="flex gap-3">
                        <input
                          type="number"
                          value={payment.amount}
                          onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
                          className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="จำนวนเงิน"
                        />
                        <input
                          type="date"
                          value={payment.date}
                          onChange={(e) => setPayment({ ...payment, date: e.target.value })}
                          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => addPayment(selectedLoan.id)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          บันทึก
                        </button>
                      </div>
                    </div>

                    {/* Payment History */}
                    <div>
                      <h3 className="font-bold text-lg mb-3 text-gray-800">ประวัติการจ่ายเงิน</h3>
                      {selectedLoan.payments && selectedLoan.payments.length > 0 ? (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {[...selectedLoan.payments].reverse().map(payment => (
                            <div key={payment.id} className="bg-gray-50 rounded-lg p-3 flex justify-between items-center gap-2">
                              {editingPayment === payment.id ? (
                                <>
                                  <input
                                    type="number"
                                    value={editPaymentForm.amount}
                                    onChange={e => setEditPaymentForm({ ...editPaymentForm, amount: e.target.value })}
                                    className="w-24 border rounded-lg px-2 py-1 mr-2"
                                  />
                                  <input
                                    type="date"
                                    value={editPaymentForm.date}
                                    onChange={e => setEditPaymentForm({ ...editPaymentForm, date: e.target.value })}
                                    className="w-32 border rounded-lg px-2 py-1 mr-2"
                                  />
                                  <button onClick={() => saveEditPayment(selectedLoan.id, payment.id)} className="text-green-600 font-bold mr-2">บันทึก</button>
                                  <button onClick={() => setEditingPayment(null)} className="text-gray-400 font-bold">ยกเลิก</button>
                                </>
                              ) : (
                                <>
                                  <div>
                                    <p className="font-medium">{formatCurrency(payment.amount)}</p>
                                    <p className="text-sm text-gray-600">{formatDate(payment.date)}</p>
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => startEditPayment(payment)} className="text-yellow-600 hover:text-yellow-800" title="แก้ไข"><Edit2 size={16} /></button>
                                    <button onClick={() => deletePayment(selectedLoan.id, payment.id)} className="text-red-600 hover:text-red-800" title="ลบ"><Trash2 size={16} /></button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">ยังไม่มีการจ่ายเงิน</p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Modal แก้ไขข้อมูลลูกค้า */}
        {editCustomer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">แก้ไขข้อมูลลูกค้า</h2>
                <button onClick={() => setEditCustomer(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อผู้กู้</label>
                  <input
                    type="text"
                    value={editCustomerForm.borrowerName}
                    onChange={e => setEditCustomerForm({ ...editCustomerForm, borrowerName: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ระบุชื่อผู้กู้"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ช่องทางการติดต่อ</label>
                  <input
                    type="text"
                    value={editCustomerForm.phone}
                    onChange={e => setEditCustomerForm({ ...editCustomerForm, phone: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ระบุช่องทางการติดต่อ เช่น เบอร์โทร ไลน์ เฟซบุ๊ก ฯลฯ"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">หมายเหตุ</label>
                  <textarea
                    value={editCustomerForm.note}
                    onChange={e => setEditCustomerForm({ ...editCustomerForm, note: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ระบุหมายเหตุ (ถ้ามี)"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="inline-flex items-center mt-2">
                    <input
                      type="checkbox"
                      checked={editCustomerForm.paidInterest}
                      onChange={e => setEditCustomerForm({ ...editCustomerForm, paidInterest: e.target.checked })}
                      className="form-checkbox h-5 w-5 text-green-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">ตัดดอกแล้ว</span>
                  </label>
                </div>
                <div>
                  <label className="inline-flex items-center mt-2">
                    <input
                      type="checkbox"
                      checked={editCustomerForm.hasCollateral}
                      onChange={e => setEditCustomerForm({ ...editCustomerForm, hasCollateral: e.target.checked })}
                      className="form-checkbox h-5 w-5 text-blue-600"
                    />
                    <span className="ml-2 text-sm text-blue-700 font-bold">ต่อดอก</span>
                  </label>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => saveEditCustomer(editCustomer)}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    บันทึก
                  </button>
                  <button
                    onClick={() => setEditCustomer(null)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showBill && selectedLoan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md relative">
              <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowBill(false)}><X size={24} /></button>
              <h2 className="text-2xl font-bold mb-4 text-center">ใบแจ้งหนี้/บิล</h2>
              <div className="mb-2 flex justify-between">
                <span className="font-medium">กำหนดชำระ:</span>
                <span>{formatDate(calculateCurrentStatus(selectedLoan).nextPaymentDue.toISOString().split('T')[0])}</span>
              </div>
              <div className="mb-2 flex justify-between">
                <span className="font-medium">เงินต้น:</span>
                <span>{formatCurrency(calculateCurrentStatus(selectedLoan).currentPrincipal)}</span>
              </div>
              <div className="mb-2 flex justify-between">
                <span className="font-medium">{selectedLoan.hasCollateral === false ? 'ดอกเบี้ย 7 วันแรก:' : 'ดอกเบี้ย:'}</span>
                <span>{formatCurrency(calculateCurrentStatus(selectedLoan).weeklyInterest)}{selectedLoan.paidInterest ? ' (หักดอกแล้ว)' : ''}</span>
              </div>
              <div className="mb-2 flex justify-between">
                <span className="font-medium">ค่าปรับ:</span>
                <span>{formatCurrency(calculateCurrentStatus(selectedLoan).penalty)}</span>
              </div>
              <div className="mb-2 flex justify-between border-t pt-2">
                <span className="font-bold">รวม:</span>
                <span className="font-bold text-pink-600">
                  {selectedLoan.paidInterest
                    ? formatCurrency(calculateCurrentStatus(selectedLoan).currentPrincipal + calculateCurrentStatus(selectedLoan).penalty)
                    : formatCurrency(calculateCurrentStatus(selectedLoan).currentPrincipal + calculateCurrentStatus(selectedLoan).weeklyInterest + calculateCurrentStatus(selectedLoan).penalty)
                  }
                </span>
              </div>
              <div className="text-xs text-yellow-700 mt-2 mb-2 font-medium">
                {`* หมายเหตุ: หากจ่ายเกินกำหนด จะคิดค่าปรับวันละ ${((calculateCurrentStatus(selectedLoan).penaltyRate || 0) * 100).toFixed(2).replace(/\.00$/, '')}% ของเงินต้นคงเหลือ`}
              </div>
              <div className="mt-4 mb-2">
                <div className="font-medium mb-1">ช่องทางการจ่ายเงิน:</div>
                <div>ธนาคาร กสิกรไทย เลขที่บัญชี 0693795338</div>
                <div>ชื่อ พยุงศักดิ์ ภานประดิษฐ</div>
              </div>
              <div className="flex justify-center mt-2">
                <img src="/qr-payment.jpg" alt="QR Code" className="w-60 h-60 object-contain" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoanTracker; 