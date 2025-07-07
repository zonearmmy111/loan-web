import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Save, X, Calendar, DollarSign, User, Trash2 } from 'lucide-react';
import { supabase } from './supabaseClient';

const DEFAULT_INTEREST = 0.2;
const DEFAULT_PENALTY = 0.05;

const LoanTracker = () => {
  const [loans, setLoans] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [editRateLoan, setEditRateLoan] = useState(null);
  const [rateForm, setRateForm] = useState({ interestRate: '', penaltyRate: '' });
  
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
    note: ''
  });

  const [payment, setPayment] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [editingPayment, setEditingPayment] = useState(null);
  const [editPaymentForm, setEditPaymentForm] = useState({ amount: '', date: '' });

  const [editCustomer, setEditCustomer] = useState(null);
  const [editCustomerForm, setEditCustomerForm] = useState({ borrowerName: '', note: '', phone: '' });

  // โหลดข้อมูล loans จาก Supabase
  useEffect(() => {
    const fetchLoans = async () => {
      const { data, error } = await supabase.from('loans').select('*');
      if (error) {
        alert('โหลดข้อมูลผิดพลาด: ' + error.message);
      } else {
        setLoans(data);
      }
    };
    fetchLoans();
  }, []);

  const refreshLoans = async () => {
    const { data, error } = await supabase.from('loans').select('*');
    if (!error) setLoans(data);
  };

  const calculateCurrentStatus = (loan) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const startDate = new Date(loan.startDate);
    startDate.setHours(0,0,0,0);
    const payments = loan.payments || [];
    
    let currentPrincipal = loan.principal;
    let totalPaid = 0;
    let interestRate = loan.interestRate !== null && loan.interestRate !== undefined ? loan.interestRate : DEFAULT_INTEREST;
    let penaltyRate = loan.penaltyRate !== null && loan.penaltyRate !== undefined ? loan.penaltyRate : DEFAULT_PENALTY;
    let periodStart = new Date(startDate);
    let periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 7);
    let penalty = 0;
    let interestDue = 0;
    let nextPaymentDue = new Date(periodEnd);
    let lastInterestPaidDate = null;
    let interestPaidThisPeriod = 0;
    let prepay = false;
    
    // Sort payments by date
    const sortedPayments = [...payments].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    for (const payment of sortedPayments) {
      totalPaid += payment.amount;
      const paymentDate = new Date(payment.date);
      paymentDate.setHours(0,0,0,0);
      // ถ้า paymentDate < periodEnd แปลว่าจ่ายก่อนครบกำหนด (prepay)
      if (paymentDate < periodEnd) {
        // ดอกเบี้ยรอบนี้
        const periodInterest = currentPrincipal * interestRate;
        let paymentLeft = payment.amount;
        if (interestPaidThisPeriod < periodInterest) {
          const payInterest = Math.min(paymentLeft, periodInterest - interestPaidThisPeriod);
          interestPaidThisPeriod += payInterest;
          paymentLeft -= payInterest;
          if (interestPaidThisPeriod >= periodInterest) {
            lastInterestPaidDate = paymentDate;
            prepay = true;
            // ไม่ reset รอบใหม่ทันที แต่ mark ว่าจ่ายล่วงหน้าแล้ว
          }
        }
        if (paymentLeft > 0) {
          currentPrincipal = Math.max(0, currentPrincipal - paymentLeft);
        }
      } else {
        // จ่ายตรงหรือหลังครบกำหนด
        // ดอกเบี้ยรอบนี้
        const periodInterest = currentPrincipal * interestRate;
        let paymentLeft = payment.amount;
        if (interestPaidThisPeriod < periodInterest) {
          const payInterest = Math.min(paymentLeft, periodInterest - interestPaidThisPeriod);
          interestPaidThisPeriod += payInterest;
          paymentLeft -= payInterest;
          if (interestPaidThisPeriod >= periodInterest) {
            lastInterestPaidDate = paymentDate;
            // reset รอบใหม่ทันที
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
    // หลังวน payment ทั้งหมด ให้คำนวณรอบล่าสุด
    const periodInterest = currentPrincipal * interestRate;
    if (prepay) {
      // ถ้าจ่ายล่วงหน้า nextPaymentDue = periodEnd + 8 วัน (workaround)
      nextPaymentDue = new Date(periodEnd);
      nextPaymentDue.setDate(nextPaymentDue.getDate() + 8);
      if (today < periodEnd) {
        interestDue = 0;
        penalty = 0;
      } else if (today >= periodEnd && today < nextPaymentDue) {
        interestDue = periodInterest;
        penalty = 0;
      } else if (today >= nextPaymentDue) {
        const daysOverdue = Math.floor((today - nextPaymentDue) / (1000 * 60 * 60 * 24));
        penalty = currentPrincipal * penaltyRate * daysOverdue;
        interestDue = periodInterest;
      }
    } else if (lastInterestPaidDate) {
      // ถ้าจ่ายตรงหรือหลังครบกำหนด nextPaymentDue = periodStart + 7 วัน
      if (today < periodEnd) {
        interestDue = 0;
        penalty = 0;
        nextPaymentDue = new Date(periodEnd);
      } else if (today >= periodEnd && today < nextPaymentDue) {
        interestDue = periodInterest;
        penalty = 0;
      } else if (today >= nextPaymentDue) {
        const daysOverdue = Math.floor((today - nextPaymentDue) / (1000 * 60 * 60 * 24));
        penalty = currentPrincipal * penaltyRate * daysOverdue;
        interestDue = periodInterest;
      }
    } else {
      // ยังไม่เคยจ่ายดอกเบี้ยเลย
      nextPaymentDue = new Date(periodEnd);
      if (today < periodEnd) {
        interestDue = 0;
        penalty = 0;
      } else if (today >= periodEnd && today < nextPaymentDue) {
        interestDue = periodInterest;
        penalty = 0;
      } else if (today >= nextPaymentDue) {
        const daysOverdue = Math.floor((today - nextPaymentDue) / (1000 * 60 * 60 * 24));
        penalty = currentPrincipal * penaltyRate * daysOverdue;
        interestDue = periodInterest;
      }
    }
    const principalDueDate = new Date(startDate);
    principalDueDate.setHours(12,0,0,0);
    principalDueDate.setDate(principalDueDate.getDate() + 7);
    return {
      currentPrincipal,
      weeklyInterest: periodInterest,
      interestDue: Math.max(0, interestDue),
      interestPaidThisWeek: interestPaidThisPeriod,
      penalty,
      totalDue: currentPrincipal + Math.max(0, interestDue) + penalty,
      totalPaid,
      nextPaymentDue,
      principalDueDate,
      isOverdue: today > nextPaymentDue,
      daysOverdue: today > nextPaymentDue ? Math.floor((today - nextPaymentDue) / (1000 * 60 * 60 * 24)) : 0,
      lastInterestPaymentDate: lastInterestPaidDate,
      interestRate,
      penaltyRate
    };
  };

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
      }
    ]).select();
    if (error) {
      alert('เพิ่มข้อมูลผิดพลาด: ' + error.message);
    } else {
      setLoans([...loans, ...data]);
      setNewLoan({ borrowerName: '', principal: '', startDate: getLocalDateString(), phone: '', note: '' });
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
      setLoans(loans.map(l => l.id === loanId ? { ...l, payments: updatedPayments } : l));
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
        setLoans(loans.filter(loan => loan.id !== loanId));
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
      setLoans(loans.map(l => l.id === loanId ? { ...l, payments: updatedPayments } : l));
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
      setLoans(loans.map(l => l.id === loanId ? { ...l, payments: updatedPayments } : l));
      if (selectedLoan && selectedLoan.id === loanId) setSelectedLoan({ ...loan, payments: updatedPayments });
      setEditingPayment(null);
    }
  };

  const startEditCustomer = (loan) => {
    setEditCustomer(loan.id);
    setEditCustomerForm({
      borrowerName: loan.borrowerName || '',
      note: loan.note || '',
      phone: loan.phone || ''
    });
  };

  const saveEditCustomer = async (loanId) => {
    const { borrowerName, note, phone } = editCustomerForm;
    const { data, error } = await supabase.from('loans').update({ borrowerName, note, phone }).eq('id', loanId).select();
    if (!error) {
      setLoans(loans.map(l => l.id === loanId ? { ...l, borrowerName, note, phone } : l));
      setEditCustomer(null);
    }
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

          {/* Loans List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loans.map(loan => {
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
                      <User className="text-blue-600" size={20} />
                      <h3 className="font-bold text-lg text-gray-800 cursor-pointer hover:underline" onClick={e => { e.stopPropagation(); startEditCustomer(loan); }}>{loan.borrowerName}</h3>
                    </div>
                    {status.isOverdue && (
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                        เกินกำหนด {status.daysOverdue} วัน
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">เงินต้นคงเหลือ:</span>
                      <span className="font-medium text-blue-900">{formatCurrency(status.currentPrincipal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ดอกเบี้ยค้างชำระ:</span>
                      <span className="font-medium text-orange-500">{formatCurrency(status.interestDue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ค่าปรับ:</span>
                      <span className="font-medium text-red-500">{formatCurrency(status.penalty)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">เงินต้นที่ต้องจ่าย:</span>
                      <span className="font-medium text-blue-900">{formatCurrency(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ดอกเบี้ย+ค่าปรับที่ต้องจ่าย:</span>
                      <span className="font-medium text-orange-500">{formatCurrency(status.interestDue + status.penalty)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ต้องจ่ายรวม:</span>
                      <span className="font-extrabold text-pink-600 text-lg drop-shadow">{formatCurrency(status.totalDue)}</span>
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
                    <div className="flex justify-between">
                      <span className="text-gray-600">วันที่กู้:</span>
                      <span className="font-medium">{formatDate(loan.startDate)}</span>
                    </div>
                    {loan.note && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">หมายเหตุ:</span>
                        <span className="font-medium">{loan.note}</span>
                      </div>
                    )}
                    {loan.phone && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">ช่องทางการติดต่อ:</span>
                        <span className="font-medium">{loan.phone}</span>
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
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteLoan(selectedLoan.id);
                    }}
                    className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                    title="ลบรายการ"
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
                          <p className="text-sm text-gray-600">ดอกเบี้ยสัปดาห์นี้</p>
                          <p className="font-bold text-lg text-blue-600">{formatCurrency(status.weeklyInterest)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">ดอกเบี้ยจ่ายแล้ว</p>
                          <p className="font-bold text-lg text-green-600">{formatCurrency(status.interestPaidThisWeek)}</p>
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
                          <p className="text-sm text-gray-600">เงินต้นที่ต้องจ่าย</p>
                          <p className="font-bold text-lg">{formatCurrency(0)}</p>
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
                      
                      {status.isOverdue && (
                        <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-lg">
                          <p className="text-red-800 font-medium">⚠️ เกินกำหนดชำระ {status.daysOverdue} วัน</p>
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
      </div>
    </div>
  );
};

export default LoanTracker; 