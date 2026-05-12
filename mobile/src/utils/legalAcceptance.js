import { supabase } from './supabase';

export const LEGAL_POLICIES_VERSION = '2025-04-22';

export function isLegalAcceptanceComplete(row) {
  if (!row) return false;
  return (
    row.privacy_accepted === true &&
    row.terms_accepted === true &&
    row.legal_notice_accepted === true &&
    !!row.accepted_at &&
    row.policies_version === LEGAL_POLICIES_VERSION
  );
}

export async function fetchLegalAcceptance(userId) {
  const { data, error } = await supabase
    .from('legal_acceptances')
    .select('privacy_accepted, terms_accepted, legal_notice_accepted, accepted_at, policies_version')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveLegalAcceptance(userId) {
  const acceptedAt = new Date().toISOString();
  const payload = {
    user_id: userId,
    privacy_accepted: true,
    terms_accepted: true,
    legal_notice_accepted: true,
    policies_version: LEGAL_POLICIES_VERSION,
    accepted_at: acceptedAt,
  };

  const { error } = await supabase
    .from('legal_acceptances')
    .upsert(payload, { onConflict: 'user_id' });

  if (error) throw error;
}
