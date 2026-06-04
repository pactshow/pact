import { useState, useEffect, useCallback } from 'react';

const KEY_PREFIX = 'pact:draft:';
const DEBOUNCE_MS = 500;

function readDraft(key) {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeDraft(key, value) {
  try {
    localStorage.setItem(KEY_PREFIX + key, JSON.stringify(value));
  } catch {
    // localStorage may be full or disabled (Safari private mode);
    // silent failure is better than crashing the form
  }
}

function removeDraft(key) {
  try {
    localStorage.removeItem(KEY_PREFIX + key);
  } catch {
    // see writeDraft
  }
}

export default function useFormDraft(key, initialState) {
  const [restoredFromDraft, setRestoredFromDraft] = useState(() => readDraft(key) != null);

  const [state, setState] = useState(() => {
    const saved = readDraft(key);
    if (saved != null) return saved;
    return typeof initialState === 'function' ? initialState() : initialState;
  });

  useEffect(() => {
    const handle = setTimeout(() => writeDraft(key, state), DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [key, state]);

  const clearDraft = useCallback(() => {
    removeDraft(key);
    setRestoredFromDraft(false);
  }, [key]);

  const discardDraft = useCallback((freshState) => {
    removeDraft(key);
    setRestoredFromDraft(false);
    setState(typeof freshState === 'function' ? freshState() : freshState);
  }, [key]);

  return [state, setState, { restoredFromDraft, clearDraft, discardDraft }];
}
