export interface CheckResult {
  id: string;
  url: string;
  inviteCode: string;
  status: 'ACTIVE' | 'REVOKED' | 'INVALID_FORMAT' | 'CHANNEL' | 'DIRECT' | 'RATE_LIMITED' | 'ERROR';
  statusText: string;
  title: string | null;
  description: string | null;
  image: string | null;
  statusCode: number;
  latencyMs: number;
  checkedAt: string;
}

export interface BatchStats {
  total: number;
  active: number;
  revoked: number;
  invalid: number;
  errors: number;
}

export interface SampleGroupItem {
  url: string;
  expected: string;
  category: 'active' | 'revoked' | 'invalid' | 'channel';
}
