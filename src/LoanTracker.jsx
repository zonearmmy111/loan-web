import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Save, X, Calendar, DollarSign, User, Trash2 } from 'lucide-react';

const LoanTracker = () => {
  const [loans, setLoans] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);
  
  const [newLoan, setNewLoan] = useState({
    borrowerName: '',
    principal: '',
    startDate: new Date().toISOString().split('T')[0],
    phone: ''
  });

  const [payment, setPayment] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Initialize with some sample data for demonstration
  useEffect(() => {
    if (loans.length === 0) {
      // You can remove this if you want to start with empty data
      // setLoans([]);
    }
  }, []);

  const calculateCurrentStatus = (loan) => {
    const today = new Date();
    const startDate = new Date(loan.startDate);
    const payments = loan.payments || [];
    
    let currentPrincipal = loan.principal;
    let totalPaid = 0;
    let currentWeekStart = new Date(startDate);
    let interestPaidThisWeek = 0;
    let lastInterestPaymentDate = null;
    
    // Process payments chronologically
    const sortedPayments = [...payments].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    for (const payment of sortedPayments) {
      totalPaid += payment.amount;
      const paymentDate = new Date(payment.date);
      
      // Calculate which week this payment falls in
      const weeksSinceStart = Math.floor((paymentDate - startDate) / (1000 * 60 * 60 * 24 * 7));
      const paymentWeekStart = new Date(startDate);
      paymentWeekStart.setDate(paymentWeekStart.getDate() + (weeksSinceStart * 7));
      
      // Calculate weekly interest for this period
      const weeklyInterest = currentPrincipal * 0.2;
      
      // If this is the current week, track interest payments
      const currentWeekNumber = Math.floor((today - startDate) / (1000 * 60 * 60 * 24 * 7));
      const paymentWeekNumber = Math.floor((paymentDate - startDate) / (1000 * 60 * 60 * 24 * 7));
      
      if (paymentWeekNumber === currentWeekNumber) {
        // This payment is in the current week
        if (interestPaidThisWeek < weeklyInterest) {
          // Still need to pay interest for this week
          const interestPayment = Math.min(payment.amount, weeklyInterest - interestPaidThisWeek);
          interestPaidThisWeek += interestPayment;
          const remainingAmount = payment.amount - interestPayment;
          
          if (remainingAmount > 0) {
            // Remaining amount goes to principal
            currentPrincipal = Math.max(0, currentPrincipal - remainingAmount);
          }
          
          if (interestPayment > 0) {
            lastInterestPaymentDate = paymentDate;
          }
        } else {
          // Interest already paid this week, all goes to principal
          currentPrincipal = Math.max(0, currentPrincipal - payment.amount);
        }
      } else {
        // Payment from previous weeks
        if (payment.amount >= weeklyInterest) {
          // Payment covers interest, remainder goes to principal
          const principalPayment = payment.amount - weeklyInterest;
          currentPrincipal = Math.max(0, currentPrincipal - principalPayment);
        }
      }
    }
    
    // Calculate next payment due date
    const weeksSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24 * 7));
    const currentWeekStartDate = new Date(startDate);
    currentWeekStartDate.setDate(currentWeekStartDate.getDate() + (weeksSinceStart * 7));
    
    const nextPaymentDue = new Date(currentWeekStartDate);
    nextPaymentDue.setDate(nextPaymentDue.getDate() + 7);
    
    // Calculate current interest and penalties
    const weeklyInterest = currentPrincipal * 0.2;
    const interestDue = Math.max(0, weeklyInterest - interestPaidThisWeek);
    
    const daysSinceWeekStart = Math.floor((today - currentWeekStartDate) / (1000 * 60 * 60 * 24));
    const isOverdue = today > nextPaymentDue;
    
    let penalty = 0;
    if (isOverdue) {
      const daysOverdue = Math.floor((today - nextPaymentDue) / (1000 * 60 * 60 * 24));
      penalty = currentPrincipal * 0.05 * daysOverdue;
    }
    
    return {
      currentPrincipal,
      weeklyInterest,
      interestDue,
      interestPaidThisWeek,
      penalty,
      totalDue: interestDue + penalty,
      totalPaid,
      nextPaymentDue,
      isOverdue,
      daysOverdue: isOverdue ? Math.floor((today - nextPaymentDue) / (1000 * 60 * 60 * 24)) : 0,
      lastInterestPaymentDate
    };
  };

  const addLoan = () => {
    if (!newLoan.borrowerName || !newLoan.principal) return;
    
    const loan = {
      id: Date.now(),
      borrowerName: newLoan.borrowerName,
      principal: parseFloat(newLoan.principal),
      startDate: newLoan.startDate,
      phone: newLoan.phone,
      payments: []
    };
    
    setLoans([...loans, loan]);
    setNewLoan({ borrowerName: '', principal: '', startDate: new Date().toISOString().split('T')[0], phone: '' });
    setShowAddForm(false);
  };

  const addPayment = (loanId) => {
    if (!payment.amount) return;
    
    const updatedLoans = loans.map(loan => {
      if (loan.id === loanId) {
        const newPayment = {
          id: Date.now(),
          amount: parseFloat(payment.amount),
          date: payment.date
        };
        return {
          ...loan,
          payments: [...(loan.payments || []), newPayment]
        };
      }
      return loan;
    });
    
    setLoans(updatedLoans);
    
    // Update selectedLoan to reflect the new payment
    const updatedSelectedLoan = updatedLoans.find(loan => loan.id === loanId);
    setSelectedLoan(updatedSelectedLoan);
    
    setPayment({ amount: '', date: new Date().toISOString().split('T')[0] });
  };

  const deleteLoan = (loanId) => {
    const confirmed = window.confirm('คุณแน่ใจหรือไม่ที่จะลบข้อมูลนี้?');
    if (confirmed) {
      const updatedLoans = loans.filter(loan => loan.id !== loanId);
      setLoans(updatedLoans);
      setSelectedLoan(null);
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
    return new Date(dateStr).toLocaleDateString('th-TH');
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">เบอร์โทรศัพท์</label>
                    <input
                      type="tel"
                      value={newLoan.phone}
                      onChange={(e) => setNewLoan({ ...newLoan, phone: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0xx-xxx-xxxx"
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
              
              return (
                <div
                  key={loan.id}
                  className={`bg-white border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg ${
                    status.isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => setSelectedLoan(loan)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <User className="text-blue-600" size={20} />
                      <h3 className="font-bold text-lg text-gray-800">{loan.borrowerName}</h3>
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
                      <span className="font-medium">{formatCurrency(status.currentPrincipal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ดอกเบี้ยค้างชำระ:</span>
                      <span className="font-medium text-orange-600">{formatCurrency(status.interestDue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ค่าปรับ:</span>
                      <span className="font-medium text-red-600">{formatCurrency(status.penalty)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ต้องจ่าย:</span>
                      <span className="font-bold text-blue-600">{formatCurrency(status.totalDue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ครบกำหนด:</span>
                      <span className="font-medium text-purple-600">{formatDate(status.nextPaymentDue.toISOString().split('T')[0])}</span>
                    </div>
                    {loan.phone && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">เบอร์โทร:</span>
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
                return (
                  <div className="space-y-6">
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
                          <p className="text-sm text-gray-600">รวมต้องจ่าย</p>
                          <p className="font-bold text-xl text-blue-600">{formatCurrency(status.totalDue)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">ครบกำหนดจ่าย</p>
                          <p className="font-bold text-lg text-purple-600">{formatDate(status.nextPaymentDue.toISOString().split('T')[0])}</p>
                        </div>
                      </div>
                      
                      {status.isOverdue && (
                        <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-lg">
                          <p className="text-red-800 font-medium">⚠️ เกินกำหนดชำระ {status.daysOverdue} วัน</p>
                        </div>
                      )}
                      
                      {status.interestPaidThisWeek >= status.weeklyInterest && (
                        <div className="mt-3 p-3 bg-green-100 border border-green-300 rounded-lg">
                          <p className="text-green-800 font-medium">✅ ชำระดอกเบี้ยสัปดาห์นี้เรียบร้อยแล้ว</p>
                          <p className="text-green-700 text-sm">การชำระเงินครั้งต่อไปจะหักต้นเงินโดยตรง</p>
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
                            <div key={payment.id} className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
                              <div>
                                <p className="font-medium">{formatCurrency(payment.amount)}</p>
                                <p className="text-sm text-gray-600">{formatDate(payment.date)}</p>
                              </div>
                              <Calendar className="text-gray-400" size={16} />
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
      </div>
    </div>
  );
};

export default LoanTracker; 