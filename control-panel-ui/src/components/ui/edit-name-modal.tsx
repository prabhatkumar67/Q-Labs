"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { Button } from "./button";
import { Input } from "./input";

// ── Types ──

interface EditNameOptions {
  title: string;
  currentName: string;
}

interface EditScenarioOptions {
  title: string;
  currentName: string;
  currentDescription: string;
}

interface EditResult {
  name: string;
  description?: string;
}

type ModalState =
  | { mode: "closed" }
  | {
      mode: "name";
      closing: boolean;
      options: EditNameOptions;
    }
  | {
      mode: "scenario";
      closing: boolean;
      options: EditScenarioOptions;
    };

interface EditContextType {
  editName: (options: EditNameOptions) => Promise<string | null>;
  editScenario: (
    options: EditScenarioOptions
  ) => Promise<{ name: string; description: string } | null>;
}

// ── Context ──

const EditContext = createContext<EditContextType | null>(null);

export function useEditName() {
  const ctx = useContext(EditContext);
  if (!ctx) throw new Error("useEditName must be used within EditProvider");
  return ctx.editName;
}

export function useEditScenario() {
  const ctx = useContext(EditContext);
  if (!ctx)
    throw new Error("useEditScenario must be used within EditProvider");
  return ctx.editScenario;
}

// ── Provider ──

export function EditProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ModalState>({ mode: "closed" });
  const resolveRef = useRef<((value: EditResult | null) => void) | null>(null);

  const editName = useCallback(
    (options: EditNameOptions): Promise<string | null> => {
      return new Promise((resolve) => {
        resolveRef.current = (r) => resolve(r?.name ?? null);
        setState({ mode: "name", closing: false, options });
      });
    },
    []
  );

  const editScenario = useCallback(
    (
      options: EditScenarioOptions
    ): Promise<{ name: string; description: string } | null> => {
      return new Promise((resolve) => {
        resolveRef.current = (r) =>
          resolve(
            r ? { name: r.name, description: r.description ?? "" } : null
          );
        setState({ mode: "scenario", closing: false, options });
      });
    },
    []
  );

  const handleClose = useCallback((result: EditResult | null) => {
    setState((prev) =>
      prev.mode === "closed" ? prev : { ...prev, closing: true }
    );
    setTimeout(() => {
      resolveRef.current?.(result);
      setState({ mode: "closed" });
    }, 150);
  }, []);

  return (
    <EditContext.Provider value={{ editName, editScenario }}>
      {children}
      {state.mode === "name" && (
        <EditModal
          title={state.options.title}
          closing={state.closing}
          onSave={(r) => handleClose(r)}
          onCancel={() => handleClose(null)}
          initialName={state.options.currentName}
        />
      )}
      {state.mode === "scenario" && (
        <EditModal
          title={state.options.title}
          closing={state.closing}
          onSave={(r) => handleClose(r)}
          onCancel={() => handleClose(null)}
          initialName={state.options.currentName}
          initialDescription={state.options.currentDescription}
          showDescription
        />
      )}
    </EditContext.Provider>
  );
}

// ── Modal ──

function EditModal({
  title,
  closing,
  onSave,
  onCancel,
  initialName,
  initialDescription = "",
  showDescription = false,
}: {
  title: string;
  closing: boolean;
  onSave: (result: EditResult) => void;
  onCancel: () => void;
  initialName: string;
  initialDescription?: string;
  showDescription?: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ name: name.trim(), description: description.trim() });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-150"
        style={{ opacity: closing ? 0 : 1 }}
        onClick={onCancel}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md mx-4 bg-card rounded-none border border-border shadow-xl"
        style={{
          animation: closing
            ? "none"
            : "fade-in-scale 0.15s cubic-bezier(0.16, 1, 0.3, 1) both",
          opacity: closing ? 0 : 1,
          transform: closing ? "scale(0.97)" : undefined,
          transition: closing
            ? "opacity 0.15s ease-out, transform 0.15s ease-out"
            : undefined,
        }}
      >
        <form onSubmit={handleSubmit} className="p-6">
          <h3 className="text-base font-semibold mb-4">
            {title}
          </h3>

          {/* Name field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Name
            </label>
            <Input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name"
            />
          </div>

          {/* Description field (scenario mode) */}
          {showDescription && (
            <div className="space-y-1.5 mt-4">
              <label className="block text-xs font-medium text-muted-foreground">
                Description
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
