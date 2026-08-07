import { buildWorkbook, buildPdf } from '../../src/services/export.service';

describe('readable export generation', () => {
  const tables = {
    attendanceRecord: [
      { id: '1', studentId: 's1', attendanceDate: new Date('2026-08-01'), status: 'present', remarks: null },
      { id: '2', studentId: 's2', attendanceDate: new Date('2026-08-02'), status: 'absent', remarks: 'Sick' },
    ],
    studentGrade: [
      { id: 'g1', assessmentId: 'a1', score: 92.5, remarks: null },
    ],
  };

  it('builds an xlsx workbook with one sheet per table', async () => {
    const buf = await buildWorkbook(tables);
    expect(buf.length).toBeGreaterThan(100);
    expect(buf.subarray(0, 2).toString()).toBe('PK');
  });

  it('builds a pdf buffer per table', async () => {
    const buf = await buildPdf('attendanceRecord', tables.attendanceRecord);
    expect(buf.subarray(0, 4).toString()).toBe('%PDF');
    expect(buf.length).toBeGreaterThan(100);
  });
});