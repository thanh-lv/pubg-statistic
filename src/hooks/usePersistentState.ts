import { useCallback, useState } from "react";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

/** useState được lưu vào localStorage (an toàn khi localStorage bị chặn). */
export function usePersistentState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => read(key, fallback));
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          localStorage.setItem(key, JSON.stringify(v));
        } catch {
          /* ignore */
        }
        return v;
      });
    },
    [key],
  );
  return [value, set] as const;
}
