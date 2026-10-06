import { CheckResult } from '../types';

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportWorkingLinks(results: CheckResult[]) {
  const working = results
    .filter((r) => r.status === 'ACTIVE')
    .map((r) => r.url)
    .join('\n');
  downloadFile(working || '# No working links found', 'working_links.txt', 'text/plain;charset=utf-8');
}

export function exportDeadLinks(results: CheckResult[]) {
  const dead = results
    .filter((r) => r.status === 'REVOKED' || r.status === 'ERROR')
    .map((r) => r.url)
    .join('\n');
  downloadFile(dead || '# No dead links found', 'dead_links.txt', 'text/plain;charset=utf-8');
}

export function exportCsvReport(results: CheckResult[]) {
  const headers = ['URL', 'Invite Code', 'Status', 'Group Title', 'Status Details', 'HTTP Code', 'Latency (ms)', 'Checked At'];
  const rows = results.map((r) => [
    `"${r.url.replace(/"/g, '""')}"`,
    `"${r.inviteCode.replace(/"/g, '""')}"`,
    `"${r.status}"`,
    `"${(r.title || '').replace(/"/g, '""')}"`,
    `"${(r.statusText || '').replace(/"/g, '""')}"`,
    r.statusCode,
    r.latencyMs,
    `"${r.checkedAt}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  downloadFile(csvContent, 'ou.csv', 'text/csv;charset=utf-8');
}

export function exportJsonReport(results: CheckResult[]) {
  const payload = {
    exportedAt: new Date().toISOString(),
    totalCount: results.length,
    activeCount: results.filter((r) => r.status === 'ACTIVE').length,
    deadCount: results.filter((r) => r.status === 'REVOKED').length,
    invalidCount: results.filter((r) => r.status === 'INVALID_FORMAT' || r.status === 'CHANNEL' || r.status === 'DIRECT').length,
    results,
  };
  const jsonStr = JSON.stringify(payload, null, 2);
  downloadFile(jsonStr, 'report.json', 'application/json;charset=utf-8');
}
