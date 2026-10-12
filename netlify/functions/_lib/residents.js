// The approved villages a student lives in: the ones they started, the ones they
// joined with a group code, and the ones they wrote a villager for. approvedIds is
// the set of approved village ids.
async function residentVillageIds(supabase, user, approvedIds) {
  const [made, joined, wrote] = await Promise.all([
    supabase.from('tribes').select('id').eq('submitted_by', user),
    supabase.from('village_members').select('tribe_id').eq('user_id', user),
    supabase.from('characters').select('tribe_id').eq('submitted_by', user),
  ]);
  const err = made.error || joined.error || wrote.error;
  if (err) throw new Error(err.message);
  const ids = new Set();
  for (const row of made.data) ids.add(row.id);
  for (const row of joined.data) ids.add(row.tribe_id);
  for (const row of wrote.data) ids.add(row.tribe_id);
  return [...ids].filter((id) => approvedIds.has(id));
}

module.exports = { residentVillageIds };
