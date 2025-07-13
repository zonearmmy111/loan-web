import React, { useState, useEffect } from 'react';
import LoanTracker from './LoanTracker';
import Summary from './Summary';
import { supabase } from './supabaseClient';

function App() {
  const [page, setPage] = useState('loans');
  const [loans, setLoans] = useState([]);
  const fetchLoans = async () => {
    const { data, error } = await supabase.from('loans').select('*');
    if (!error) setLoans(data);
  };
  useEffect(() => { fetchLoans(); }, []);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-48 bg-white shadow-lg flex flex-col py-8 px-4 gap-4">
        <h2 className="text-xl font-bold text-blue-700 mb-6">เมนู</h2>
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