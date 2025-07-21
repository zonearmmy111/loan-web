import { calculateCurrentStatus } from './loanUtils';

describe('calculateCurrentStatus', () => {
  it('จ่ายดอกเบี้ยตรงเวลา', () => {
    const loan = {
      principal: 2000,
      interestRate: 0.2,
      penaltyRate: 0.05,
      startDate: '2025-07-06',
      payments: [
        { id: 1, amount: 400, date: '2025-07-13' }, // จ่ายดอกเบี้ยครบตรงวันครบกำหนด
      ]
    };
    const result = calculateCurrentStatus(loan);
    expect(result.currentPrincipal).toBe(2000);
    expect(result.interestDue).toBe(0);
    expect(result.penalty).toBe(0);
  });

  it('จ่ายดอกเบี้ยช้า 1 วัน', () => {
    const loan = {
      principal: 2000,
      interestRate: 0.2,
      penaltyRate: 0.05,
      startDate: '2025-07-06',
      payments: [
        { id: 1, amount: 500, date: '2025-07-14' }, // จ่ายช้า 1 วัน
      ]
    };
    const result = calculateCurrentStatus(loan);
    expect(result.currentPrincipal).toBe(2000);
    expect(result.interestDue).toBe(0);
    expect(result.penalty).toBe(0);
  });

  it('จ่ายดอกเบี้ยล่วงหน้า', () => {
    const loan = {
      principal: 2000,
      interestRate: 0.2,
      penaltyRate: 0.05,
      startDate: '2025-07-06',
      payments: [
        { id: 1, amount: 400, date: '2025-07-10' }, // จ่ายล่วงหน้า
      ]
    };
    const result = calculateCurrentStatus(loan);
    expect(result.currentPrincipal).toBe(2000);
    expect(result.interestDue).toBe(0);
    expect(result.penalty).toBe(0);
  });

  it('จ่ายเงินต้นหลังจ่ายดอกเบี้ยครบ', () => {
    const loan = {
      principal: 2000,
      interestRate: 0.2,
      penaltyRate: 0.05,
      startDate: '2025-07-06',
      payments: [
        { id: 1, amount: 400, date: '2025-07-13' }, // ดอกเบี้ย
        { id: 2, amount: 1000, date: '2025-07-14' }, // เงินต้น
      ]
    };
    const result = calculateCurrentStatus(loan);
    expect(result.currentPrincipal).toBe(1000);
    expect(result.interestDue).toBe(0);
    expect(result.penalty).toBe(0);
  });

  it('ไม่จ่ายอะไรเลย', () => {
    const loan = {
      principal: 2000,
      interestRate: 0.2,
      penaltyRate: 0.05,
      startDate: '2025-07-06',
      payments: []
    };
    const result = calculateCurrentStatus(loan);
    expect(result.currentPrincipal).toBe(2000);
    expect(result.interestDue).toBeGreaterThan(0);
    expect(result.penalty).toBeGreaterThanOrEqual(0);
  });

  it('จ่ายช้า 8 วัน', () => {
    const loan = {
      principal: 2000,
      interestRate: 0.2,
      penaltyRate: 0.05,
      startDate: '2025-07-06',
      payments: [
        { id: 1, amount: 2000, date: '2025-07-21' }, // จ่ายช้า 8 วัน
      ]
    };
    const result = calculateCurrentStatus(loan);
    expect(result.penalty).toBe(2000 * 0.05 * 8);
  });

  it('จ่ายเกิน', () => {
    const loan = {
      principal: 2000,
      interestRate: 0.2,
      penaltyRate: 0.05,
      startDate: '2025-07-06',
      payments: [
        { id: 1, amount: 5000, date: '2025-07-13' }, // จ่ายเกิน
      ]
    };
    const result = calculateCurrentStatus(loan);
    expect(result.currentPrincipal).toBe(0);
    expect(result.interestDue).toBe(0);
    expect(result.penalty).toBe(0);
  });
}); 