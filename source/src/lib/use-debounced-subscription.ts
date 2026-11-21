import { useEffect, useRef } from "react";

type Unsubscribe = () => void;

// Subscribes to a realtime feed and calls onChange once things settle.
// Debounced because a single edit fires several table events at once (e.g.
// an announcement update plus its tag inserts/deletes), and one reload is
// enough. Re-subscribes only when `key` changes (e.g. a different record id).
export function useDebouncedSubscription(
  subscribe: (onChange: () => void) => Unsubscribe,
  onChange: () => void,
  key: string = "",
  delayMs: number = 300,
): void {
  // Always call the latest callbacks without re-subscribing on every render
  const subscribeRef = useRef(subscribe);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    subscribeRef.current = subscribe;
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const scheduleReload = (): void => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => onChangeRef.current(), delayMs);
    };

    const unsubscribe = subscribeRef.current(scheduleReload);
    return () => {
      if (timeout) clearTimeout(timeout);
      unsubscribe();
    };
  }, [key, delayMs]);
}
