import { useEffect, useState } from "react";

// The Network Information API (navigator.connection) isn't in TS's DOM lib yet.
interface NetworkInformation extends EventTarget {
  readonly saveData?: boolean;
  readonly effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
}

function getConnection(): NetworkInformation | undefined {
  return (navigator as Navigator & { connection?: NetworkInformation }).connection;
}

function computeSaveData(): boolean {
  const connection = getConnection();
  if (!connection) return false;
  return (
    connection.saveData === true ||
    connection.effectiveType === "2g" ||
    connection.effectiveType === "slow-2g"
  );
}

/** True when the user has Save-Data on, or is on a 2g/slow-2g connection — per docs/PERFORMANCE.md §3. */
export function useSaveData(): boolean {
  const [saveData, setSaveData] = useState(computeSaveData);

  useEffect(() => {
    const connection = getConnection();
    if (!connection) return;

    function handleChange() {
      setSaveData(computeSaveData());
    }

    connection.addEventListener("change", handleChange);
    return () => connection.removeEventListener("change", handleChange);
  }, []);

  return saveData;
}
