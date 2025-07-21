import React, { useState, useEffect } from 'react';
import LoanTracker from './LoanTracker';
import Summary from './Summary';
import { supabase } from './supabaseClient';

function App() {
  const [page, setPage] = useState('loans');
  const [loans, setLoans] = useState([]);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const fetchLoans = async () => {
    const { data, error } = await supabase.from('loans').select('*');
    if (!error) setLoans(data);
  };
  useEffect(() => { fetchLoans(); }, []);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-48 bg-white shadow-lg flex flex-col py-8 px-4 gap-4">
        <h2 className="text-xl font-bold text-blue-700 mb-6">

เมนู</h2>
        <button
          className={`w-full text-left px-4 py-2 rounded-lg font-bold border-2 transition-colors mb-2 ${page === 'loans' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'}`}
          onClick={() => setPage('loans')}
        >
          รายการเงินกู้
        </button>
        <button
          className={`w-full text-left px-4 py-2 rounded-lg font-bold border-2 transition-colors ${page === 'summary' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-green-600 border-green-300 hover:bg-green-50'}`}
          onClick={() => setPage('summary')}
        >
          สรุปผล
        </button>
      </div>
      {/* Main Content */}
      <div className="flex-1 p-0">
        <div className="flex items-center justify-between px-8 pt-8 pb-2">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <span className="text-blue-600">$</span> ระบบจัดการเงินกู้
          </h1>
          <div className="text-base font-bold text-blue-700 bg-blue-50 rounded px-4 py-2 ml-4" style={{minWidth: '220px', textAlign: 'center'}}>
            {now.toLocaleString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <button
            className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
            onClick={() => setPage('loans')}
            style={{ visibility: 'hidden' }}
          >
            {/* ปุ่มซ่อนเพื่อจัด layout */}
          </button>
        </div>
        {page === 'loans' ? (
          <LoanTracker loans={loans} refreshLoans={fetchLoans} />
        ) : (
          <Summary loans={loans} />
        )}
      </div>
    </div>
  );
}

export default App; 