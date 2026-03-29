import { useCallback, useEffect, useMemo, useState } from "react";
import supabase from "@/../config/supabase";
import { runSupabaseQueryWithTimeout } from "@/lib/supabaseTimeout";

export function useSpCases() {
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
const [pendingCount] = useState(0);
const [syncing, setSyncing] = useState(false);
const [syncStatus, setSyncStatus] = useState(null);

const load = useCallback(async () => {
setLoading(true);
setError(null);
try {
const { data: rows, error: err } = await runSupabaseQueryWithTimeout(
(signal) =>
supabase
.from("sp_case")
.select("*")
.order("updated_at", { ascending: false })
.abortSignal(signal),
{
timeoutMessage:
"Loading Single Parent records timed out. Please try refresh again.",
},
);
if (err) throw err;
setData(
(rows ?? []).map((row) => ({
...row,
id: row?.id ?? row?.case_id ?? row?.localId,
})),
);
return { success: true };
} catch (e) {
setError(e);
return { success: false, error: e };
} finally {
setLoading(false);
}
}, []);

useEffect(() => {
load();
}, [load]);

const deleteSpCase = useCallback(
async (caseId) => {
try {
const { error: err } = await supabase
.from("sp_case")
.delete()
.eq("id", caseId);
if (err) throw err;
await load();
return { success: true, queued: false };
} catch (e) {
console.error("Error deleting SP case:", e);
return { success: false, error: e };
}
},
[load],
);

const runSync = useCallback(async () => {
setSyncing(true);
setSyncStatus("Refreshing...");
try {
const result = await load();
setSyncStatus("Up to date");
return result;
} finally {
setTimeout(() => setSyncStatus(null), 1200);
setSyncing(false);
}
}, [load]);

return useMemo(
() => ({
data,
loading,
error,
reload: load,
deleteSpCase,
pendingCount,
syncing,
syncStatus,
runSync,
}),
[
data,
loading,
error,
load,
deleteSpCase,
pendingCount,
syncing,
syncStatus,
runSync,
],
);
}
