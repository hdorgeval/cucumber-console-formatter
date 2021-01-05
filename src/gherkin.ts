import { messages } from '@cucumber/messages';

export interface GherkinStepRunInfo {
  keyword: string;
  status: messages.TestStepFinished.TestStepResult.Status;
  errorMessage?: string | null;
  text: string;
  isFirstStep: boolean;
  isLastStep: boolean;
  feature: GherkinFeature;
  background?: GherkinBackground;
  scenario?: ScenarioBackground;
}

export interface GherkinFeature {
  keyword: string;
  name: string;
  description?: string;
}

interface GherkinBackground {
  keyword: string | null | undefined;
  name: string | null | undefined;
}

export interface ScenarioBackground {
  keyword: string | null | undefined;
  name: string | null | undefined;
}

export interface GherkingStep extends messages.GherkinDocument.Feature.IStep {
  index: number;
  isLastIndex: boolean;
  background?: GherkinBackground;
  scenario?: ScenarioBackground;
}
