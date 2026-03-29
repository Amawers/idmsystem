/**
 * Executes a Supabase query with an AbortController timeout.
 *
 * @template T
 * @param {(signal: AbortSignal) => Promise<T>} buildQuery
 * @param {{ timeoutMs?: number, timeoutMessage?: string }} [options]
 * @returns {Promise<T>}
 */
export async function runSupabaseQueryWithTimeout(
  buildQuery,
  {
    timeoutMs = 20000,
    timeoutMessage = "Request timed out. Please try again.",
  } = {},
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await buildQuery(controller.signal);
  } catch (error) {
    const message = String(error?.message || "").toLowerCase();
    const isAbortError =
      error?.name === "AbortError" ||
      message.includes("aborted") ||
      message.includes("abort");

    if (isAbortError) {
      throw new Error(timeoutMessage);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
