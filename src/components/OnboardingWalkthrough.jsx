import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  coachForPath,
  completeOnboarding,
  hideOnboardingStep,
  persistOnboarding,
  readOnboarding,
  resetOnboarding,
  shouldAutoStart,
  skipOnboarding,
  startOnboarding,
} from "../lib/onboarding.js";

const OnboardingContext = createContext(null);

export function useOnboarding() {
  return useContext(OnboardingContext);
}

export function OnboardingProvider({ children }) {
  const [state, setState] = useState(() => {
    const stored = readOnboarding();
    return shouldAutoStart(stored) ? startOnboarding() : stored;
  });

  useEffect(() => {
    persistOnboarding(state);
  }, [state]);

  const start = useCallback(() => setState(startOnboarding()), []);
  const skip = useCallback(() => setState(skipOnboarding()), []);
  const complete = useCallback(() => setState(completeOnboarding()), []);
  const reset = useCallback(() => setState(resetOnboarding()), []);
  const hide = useCallback((stepId) => setState((cur) => hideOnboardingStep(cur, stepId)), []);

  const value = useMemo(
    () => ({ state, start, skip, complete, reset, hide, active: state.status === "active" }),
    [complete, hide, reset, skip, start, state],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function OnboardingCoach() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tour = useOnboarding();
  const step = coachForPath(pathname, tour?.state);

  if (!tour || !step) return null;

  function onPrimary() {
    if (step.primary.action === "complete") {
      tour.complete();
      return;
    }
    if (step.primary.action === "stay") {
      tour.hide(step.id);
      return;
    }
    if (step.primary.to) navigate(step.primary.to);
  }

  return (
    <aside className="tour-coach" role="status" aria-label="Desk walkthrough">
      <div className="kicker">{step.kicker}</div>
      <h3 className="tour-title">{step.title}</h3>
      <p className="lede slim">{step.body}</p>
      <div className="cta-row">
        {step.primary.to ? (
          <Link className="btn btn-lime" to={step.primary.to}>
            {step.primary.label}
          </Link>
        ) : (
          <button className="btn btn-lime" type="button" onClick={onPrimary}>
            {step.primary.label}
          </button>
        )}
        {step.secondary ? (
          <button className="btn btn-ghost" type="button" onClick={tour.skip}>
            {step.secondary.label}
          </button>
        ) : null}
      </div>
    </aside>
  );
}
