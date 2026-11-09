/**
 * useDebounce Hook
 * Delays the execution of a function until after a specified delay
 * @param value The value to debounce
 * @param delay The delay in milliseconds
 * @param immediate If true, invoke the function on the leading edge of the timeout
 */
import { useState, useEffect } from 'react';

export function useDebounce(value: string, delay: number, immediate = false) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const [fired, setFired] = useState(false);

  useEffect(() => {
    if (immediate && !fired) {
      setDebouncedValue(value);
      setFired(true);
    }
  }, [immediate, value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
      setFired(false);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay, immediate]);

  return debouncedValue;
}