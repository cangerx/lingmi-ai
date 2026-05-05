"use client";

import { createContext, useContext } from "react";

export interface CanvasCallbacks {
  onReGenerate: (prompt: string) => void;
  onEdit: (prompt: string) => void;
  onDelete: (id: string) => void;
}

const CanvasContext = createContext<CanvasCallbacks>({
  onReGenerate: () => {},
  onEdit: () => {},
  onDelete: () => {},
});

export const CanvasProvider = CanvasContext.Provider;
export const useCanvasCallbacks = () => useContext(CanvasContext);
