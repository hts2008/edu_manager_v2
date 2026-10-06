import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { progressReportScoreNote } from '../src/utils/studentProgressDashboard.js';

test('same daily/monthly score shows its source once without repeated value', () => {
  assert.equal(progressReportScoreNote({daily_average_score:0,progress_score:0,score_source:'daily_raw'}),'Điểm thô hằng ngày');
  assert.equal(progressReportScoreNote({daily_average_score:85,progress_score:85,score_source:'daily_raw'}),'Điểm thô hằng ngày');
});
test('distinct monthly/manual/proxy scores keep their meaning and real zero', () => {
  assert.match(progressReportScoreNote({daily_average_score:70,progress_score:0,score_source:'manual_monthly'}),/Điểm tháng: 0\/100/);
  assert.match(progressReportScoreNote({daily_average_score:null,progress_score:100,score_source:'operational_proxy'}),/100\/100.*Chỉ số vận hành/);
  assert.equal(progressReportScoreNote({daily_average_score:null,progress_score:null,score_source:'missing'}),'Chưa có dữ liệu');
});
test('keyboard focus follows tab change only when navigation guard accepts', () => {
  const page = readFileSync(new URL('../src/pages/StudentProgressReportPage.jsx', import.meta.url), 'utf8');
  assert.match(page, /if \(switchTab\(target\)\) document\.getElementById/);
  assert.match(page, /if \(!allowScopeChange\(\)\) return false;/);
  assert.match(page, /if \(saving\) return false;/);
  assert.match(page, /if \(dirty && !window\.confirm\(discard/);
  assert.match(page, /setActiveTab\(key\);\s*return true;/);
});
