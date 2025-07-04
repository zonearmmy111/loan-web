import React, { useState, useEffect } from 'react';
import { PlusCircle, Users, DollarSign, Calendar, Search, Edit2, Trash2, Eye, CheckCircle } from 'lucide-react';

const LoanManagementApp = () => {
  const [loans, setLoans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    const sampleCustomers = [
      { id: 1, name: 'สมชาย ใจดี', phone: '081-234-5678', address: 'กรุงเทพฯ', idCard: '1234567890123' },
      { id: 2, name: 'สมหญิง รักงาน', phone: '082-345-6789', address: 'นครราชสีมา', idCard: '2345678901234' }
    ];
    const sampleLoans = [
      {
        id: 1,
        customerId: 1,
        customerName: 'สมชาย ใจดี',
        amount: 50000,
        interestRate: 3,
        startDate: '2024-01-15',
        dueDate: '2024-07-15',
        status: 'active',
        payments: [
          { id: 1, date: '2024-02-15', amount: 5000, type: 'interest' },
          { id: 2, date: '2024-03-15', amount: 5000, type: 'interest' }
        ]
      },
      {
        id: 2,
        customerId: 2,
        customerName: 'สมหญิง รักงาน',
        amount: 30000,
        interestRate: 2.5,
        startDate: '2024-02-01',
        dueDate: '2024-08-01',
        status: 'active',
        payments: [
          { id: 3, date: '2024-03-01', amount: 3000, type: 'interest' }
        ]
      }
    ];
    setCustomers(sampleCustomers);
    setLoans(sampleLoans);
  }, []);

  const calculateInterest = (amount, rate, months) => {
    return (amount * rate * months) / 100;
  };

  const getTotalDebt = (loan) => {
    const startDate = new Date(loan.startDate);
    const dueDate = new Date(loan.dueDate);
    const timeDiff = dueDate - startDate;
    const monthsDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24 * 30));
    const totalInterest = calculateInterest(loan.amount, loan.interestRate, monthsDiff);
    return loan.amount + totalInterest;
  };

  const getTotalPaid = (loan) => {
    return loan.payments.reduce((sum, payment) => sum + payment.amount, 0);
  };

  const getOutstandingAmount = (loan) => {
    return getTotalDebt(loan) - getTotalPaid(loan);
  };

  const addCustomer = (customerData) => {
    const newCustomer = {
      id: Date.now(),
      ...customerData
    };
    setCustomers([...customers, newCustomer]);
    setShowAddCustomer(false);
  };

  const addLoan = (loanData) => {
    const customer = customers.find(c => c.id === parseInt(loanData.customerId));
    const newLoan = {
      id: Date.now(),
      ...loanData,
      customerId: parseInt(loanData.customerId),
      customerName: customer.name,
      amount: parseFloat(loanData.amount),
      interestRate: parseFloat(loanData.interestRate),
      status: 'active',
      payments: []
    };
    setLoans([...loans, newLoan]);
    setShowAddLoan(false);
  };

  const addPayment = (loanId, paymentData) => {
    const updatedLoans = loans.map(loan => {
      if (loan.id === loanId) {
        return {
          ...loan,
          payments: [...loan.payments, {
            id: Date.now(),
            date: paymentData.date,
            amount: parseFloat(paymentData.amount),
            type: paymentData.type,
            note: paymentData.note
          }]
        };
      }
      return loan;
    });
    setLoans(updatedLoans);
    setShowPaymentModal(false);
    setSelectedLoan(null);
  };

  const deleteLoan = (loanId) => {
    setLoans(loans.filter(loan => loan.id !== loanId));
  };

  const deleteCustomer = (customerId) => {
    setCustomers(customers.filter(c => c.id !== customerId));
    setLoans(loans.filter(loan => loan.customerId !== customerId)); // ลบสัญญาที่เกี่ยวข้องด้วย
  };

  const filteredLoans = loans.filter(loan => 
    loan.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loan.id.toString().includes(searchTerm)
  );

  const totalLoaned = loans.reduce((sum, loan) => sum + loan.amount, 0);
  const totalOutstanding = loans.reduce((sum, loan) => sum + getOutstandingAmount(loan), 0);
  const totalPaid = loans.reduce((sum, loan) => sum + getTotalPaid(loan), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* ... (header, nav, dashboard, forms, etc. เหมือนเดิม) ... */}
      {/* ... (โค้ดเดิมของคุณที่ให้มา) ... */}

      {/* Modal บันทึกการชำระเงิน */}
      {showPaymentModal && selectedLoan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">บันทึกการชำระเงิน</h3>
            <p className="text-sm text-gray-600 mb-4">
              ลูกค้า: {selectedLoan.customerName} | ยอดคงเหลือ: {getOutstandingAmount(selectedLoan).toLocaleString()} ฿
            </p>
            <form onSubmit={e => {
              e.preventDefault();
              const formData = new FormData(e.target);
              addPayment(selectedLoan.id, {
                date: formData.get('date'),
                amount: formData.get('amount'),
                type: formData.get('type'),
                note: formData.get('note')
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ชำระ</label>
                  <input type="date" name="date" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนเงิน (บาท)</label>
                  <input type="number" name="amount" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ประเภท</label>
                  <select name="type" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="interest">ดอกเบี้ย</option>
                    <option value="principal">เงินต้น</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                  <input type="text" name="note" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button type="button" onClick={() => { setShowPaymentModal(false); setSelectedLoan(null); }} className="px-4 py-2 text-gray-600 hover:text-gray-800">ยกเลิก</button>
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanManagementApp; 