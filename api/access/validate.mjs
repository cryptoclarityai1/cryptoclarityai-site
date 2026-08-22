import { hashAccessCode, json, normalizeAccessCode, supabaseRequest } from '../_lib.mjs';

export async function POST(request) {
  try {
    const input = await request.json();
    const code = normalizeAccessCode(input?.code);
    if (!/^CCAI-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
      return json({ valid: false });
    }

    const hash = hashAccessCode(code);
    const rows = await supabaseRequest(
      `/rest/v1/ccai_entitlements?access_code_hash=eq.${encodeURIComponent(hash)}&status=eq.active&select=id&limit=1`,
    );
    return json({ valid: Array.isArray(rows) && rows.length === 1 });
  } catch (error) {
    console.error('access_validation_failed', error?.message || error);
    return json({ error: 'Access validation is not configured on this deployment yet.' }, 503);
  }
}

export function GET() {
  return json({ error: 'Method not allowed' }, 405, { allow: 'POST' });
}
