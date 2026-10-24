"use client";

import { Plus, Trash2 } from "lucide-react";
import { ACTION_LABELS, initialStep, isAssertion, type Action, type Plan, type Step } from "./types";

type Props = {
  plan: Plan;
  onChange: (plan: Plan) => void;
  changed?: Set<number>;
  unmapped?: number[];
};

/** Ordered steps. Actions drive the browser; checks decide pass or fail. */
export function StepEditor({ plan, onChange, changed, unmapped = [] }: Props) {
  const assertions = plan.steps.filter(isAssertion).length;

  const setStep = (index: number, next: Step) =>
    onChange({ ...plan, steps: plan.steps.map((step, i) => (i === index ? next : step)) });
  const patchStep = (index: number, patch: Partial<Step>) => setStep(index, { ...plan.steps[index], ...patch });
  const removeStep = (index: number) => onChange({ ...plan, steps: plan.steps.filter((_, i) => i !== index) });
  const addStep = () => onChange({ ...plan, steps: [...plan.steps, initialStep("click")] });

  return (
    <section className="qs-panel" aria-labelledby="steps-heading">
      <header className="qs-panel-head">
        <h2 id="steps-heading">Steps</h2>
        <span className={`qs-count ${assertions ? "" : "is-missing"}`}>
          {plan.steps.length} {plan.steps.length === 1 ? "step" : "steps"}, {assertions} {assertions === 1 ? "assertion" : "assertions"}
        </span>
      </header>

      {plan.steps.length === 0 ? (
        <p className="qs-empty-line">No steps yet. Say what should happen above, or add a step by hand.</p>
      ) : (
        <ol className="qs-steps">
          {plan.steps.map((step, index) => (
            <li
              key={`${index}-${step.action}`}
              className={[isAssertion(step) && "is-check", changed?.has(index) && "is-changed"].filter(Boolean).join(" ") || undefined}
            >
              <span className="qs-step-index">{index + 1}</span>
              <div className="qs-step-fields">
                <select
                  aria-label={`Step ${index + 1} action`}
                  value={step.action}
                  onChange={event => setStep(index, initialStep(event.target.value as Action))}
                >
                  {Object.entries(ACTION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                {step.path !== undefined && (
                  <input
                    aria-label={`Step ${index + 1} path`}
                    className="is-code"
                    value={step.path}
                    placeholder="/checkout"
                    onChange={event => patchStep(index, { path: event.target.value })}
                  />
                )}
                {step.selector !== undefined && (
                  <input
                    aria-label={`Step ${index + 1} selector`}
                    className="is-code"
                    value={step.selector}
                    placeholder="#submit-order"
                    onChange={event => patchStep(index, { selector: event.target.value })}
                  />
                )}
                {step.value !== undefined && (
                  <input
                    aria-label={`Step ${index + 1} value`}
                    value={step.value}
                    placeholder="Text to type"
                    onChange={event => patchStep(index, { value: event.target.value })}
                  />
                )}
                {step.expected !== undefined && (
                  <input
                    aria-label={`Step ${index + 1} expected text`}
                    className="qs-expected"
                    value={step.expected}
                    placeholder="Exact text the page should show"
                    onChange={event => patchStep(index, { expected: event.target.value })}
                  />
                )}
                {unmapped.includes(index) && (
                  <span className="qs-unmapped">This selector was not on the page when it was read. It may appear after an earlier step.</span>
                )}
              </div>
              <button
                type="button"
                className="qs-icon-button"
                aria-label={`Remove step ${index + 1}`}
                onClick={() => removeStep(index)}
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ol>
      )}

      <footer className="qs-panel-foot">
        <button type="button" className="qs-link-button" disabled={plan.steps.length >= 50} onClick={addStep}>
          <Plus size={15} /> Add step
        </button>
        {!assertions && <span className="qs-warning">Add a Check text or Check URL step before running.</span>}
      </footer>
    </section>
  );
}
