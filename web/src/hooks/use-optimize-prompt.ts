"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { imageAPI } from "@/lib/api";

export function useOptimizePrompt() {
  const [optimizing, setOptimizing] = useState(false);
  const typewriterRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (typewriterRef.current) clearTimeout(typewriterRef.current);
    };
  }, []);

  const typewriterFill = useCallback((text: string, setter: (v: string) => void) => {
    if (typewriterRef.current) clearTimeout(typewriterRef.current);
    let i = 0;
    setter("");
    const tick = () => {
      if (i < text.length) {
        setter(text.slice(0, i + 1));
        i++;
        typewriterRef.current = setTimeout(tick, 18 + Math.random() * 12);
      } else {
        setOptimizing(false);
      }
    };
    tick();
  }, []);

  const optimize = useCallback(async (text: string, setter: (v: string) => void) => {
    if (!text.trim() || optimizing) return;
    setOptimizing(true);
    try {
      const res = await imageAPI.optimizePrompt(text.trim());
      const optimized = res.data?.optimized_prompt;
      if (optimized) {
        typewriterFill(optimized, setter);
      } else {
        setOptimizing(false);
      }
    } catch (e: any) {
      console.error("优化提示词失败", e);
      setOptimizing(false);
    }
  }, [optimizing, typewriterFill]);

  return { optimizing, optimize };
}
