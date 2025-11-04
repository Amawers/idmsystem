import { useCallback, useEffect, useMemo, useState } from "react";
import supabase from "@/../config/supabase";

function mapCiclcarRow(row) {
    const id = row?.id ?? row?.case_id ?? row?.case_code ?? row?.uuid ?? null;

    return {
        ...row,
        id,
    };
}

export function useCiclcarCases() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const { data: rows, error: fetchError } = await supabase
                .from("ciclcar_case")
                .select("*")
                .order("updated_at", { ascending: false });

            if (fetchError) throw fetchError;

            setData((rows ?? []).map(mapCiclcarRow));
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const deleteCiclcarCase = useCallback(async (caseId) => {
        try {
            const { error: err } = await supabase
                .from("ciclcar_case")
                .delete()
                .eq("id", caseId);

            if (err) throw err;
            
            // Reload the data after successful deletion
            await load();
            return { success: true };
        } catch (e) {
            console.error("Error deleting CICL/CAR case:", e);
            return { success: false, error: e };
        }
    }, [load]);

    return useMemo(
        () => ({
            data,
            loading,
            error,
            reload: load,
            deleteCiclcarCase,
        }),
        [data, loading, error, load, deleteCiclcarCase],
    );
}