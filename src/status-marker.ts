import { Status } from '@cucumber/cucumber';
import { messages } from '@cucumber/messages';

const PASSED_MARKER = '\u221A';
const SKIPPED_MARKER = '[skipped]';
const PENDING_MARKER = '[pending]';
const FAILED_MARKER = '\u00D7';

export function toStatusMarker(status: messages.TestStepFinished.TestStepResult.Status): string {
  switch (status) {
    case Status.PASSED:
      return PASSED_MARKER;
    case Status.SKIPPED:
      return SKIPPED_MARKER;
    case Status.FAILED:
      return FAILED_MARKER;
    case Status.PENDING:
      return PENDING_MARKER;
    default:
      return '';
  }
}
