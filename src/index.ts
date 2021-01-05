import { ensureDirectoryExists } from './fs';
import { dateToFilename, toFormattedDate } from './time';
import { GherkinStepRunInfo, GherkingStep } from './gherkin';
import { toStatusMarker } from './status-marker';
import { Formatter, Status } from '@cucumber/cucumber';
import { IFormatterOptions } from '@cucumber/cucumber/lib/formatter';
import { messages } from '@cucumber/messages';
import { writeFileSync } from 'fs';
import { join } from 'path';
const indent = '  ';

class SimpleConsoleFormatter extends Formatter {
  private eventIndex = 0;
  private instanceCreationDate = new Date();
  private printEnvelopes = process.env['SimpleConsoleFormatter.printEnvelopes'] === 'true';
  private targetSubFolderForPrintedEnvelopes =
    process.env['SimpleConsoleFormatter.targetFolderForPrintedEnvelopes'] ||
    'debug-console-formatter';

  private hasDisplayedFeatureNameAndDescription = false;

  constructor(options: IFormatterOptions) {
    super(options);
    options.eventBroadcaster.on('envelope', (envelope: messages.IEnvelope) => {
      this.printEnvelope(envelope);
      this.formatEnvelope(envelope);
    });
  }

  private printEnvelope(envelope: messages.IEnvelope) {
    if (!this.printEnvelopes) {
      return;
    }

    const targetFolder = join(
      process.cwd(),
      this.targetSubFolderForPrintedEnvelopes,
      dateToFilename(this.instanceCreationDate),
    );

    if (this.eventIndex === 0) {
      ensureDirectoryExists(join(process.cwd(), this.targetSubFolderForPrintedEnvelopes));
      ensureDirectoryExists(targetFolder);
    }

    this.eventIndex += 1;
    const targetFilename = `${this.eventIndex}-envelope.json`;
    const filepath = join(targetFolder, targetFilename);

    writeFileSync(filepath, JSON.stringify(envelope, null, 2));
  }

  private formatEnvelope(envelope: messages.IEnvelope) {
    if (envelope.meta) {
      return this.formatMeta(envelope.meta);
    }

    if (envelope.testRunStarted) {
      return this.formatTestRunStarted(envelope.testRunStarted);
    }

    if (envelope.testRunFinished) {
      return this.formatTestRunFinished(envelope.testRunFinished);
    }

    if (envelope.testCaseStarted) {
      return this.formatTestCaseStarted(envelope.testCaseStarted);
    }

    if (envelope.testStepFinished) {
      return this.formatTestStepFinished(envelope.testStepFinished);
    }
  }
  private getGherkinStepFrom(testRunInfo: messages.ITestStepFinished): GherkinStepRunInfo | null {
    const status = testRunInfo.testStepResult?.status ?? Status.UNKNOWN;
    const errorMessage = testRunInfo.testStepResult?.message;

    const { testCaseStartedId, testStepId } = testRunInfo;
    if (!testCaseStartedId || !testStepId) {
      return null;
    }

    if (!testRunInfo.testStepId) {
      return null;
    }
    const { testCase } = this.eventDataCollector.getTestCaseAttempt(testCaseStartedId);
    const testStep = testCase.testSteps?.find((step) => step.id === testStepId);
    if (!testStep?.pickleStepId) {
      return null;
    }

    if (!testCase.pickleId) {
      return null;
    }

    const pickle = this.eventDataCollector.getPickle(testCase.pickleId);
    if (!pickle?.uri) {
      return null;
    }

    const pickleStep = pickle.steps?.find((step) => step.id === testStep.pickleStepId);
    if (!pickleStep) {
      return null;
    }

    const { astNodeIds, text } = pickleStep;
    if (!text || !astNodeIds) {
      return null;
    }

    const astNodeId = astNodeIds[0];
    const gherkinDocument = this.eventDataCollector.getGherkinDocument(pickle.uri);
    if (!gherkinDocument?.feature?.children) {
      return null;
    }

    const gherkinStep = gherkinDocument.feature.children
      .flatMap<GherkingStep | undefined>((child) => {
        if (child.background) {
          const lastIndex = (child.background.steps?.length || 0) - 1;
          return child.background?.steps?.map((step, index) => ({
            ...step,
            index,
            isLastIndex: index === lastIndex,
            background: {
              keyword: child.background?.keyword,
              name: child.background?.name,
            },
          }));
        }
        if (child.scenario) {
          const lastIndex = (child.scenario.steps?.length || 0) - 1;
          return child.scenario.steps?.map((step, index) => ({
            ...step,
            index,
            isLastIndex: index === lastIndex,
            scenario: {
              keyword: child.scenario?.keyword,
              name: child.scenario?.name,
            },
          }));
        }

        return [];
      })
      .find((step) => step?.id === astNodeId);

    const keyword = (gherkinStep?.keyword ?? '').trim();

    return {
      isFirstStep: gherkinStep?.index === 0,
      isLastStep: gherkinStep?.isLastIndex || false,
      keyword,
      status,
      errorMessage,
      text,
      feature: {
        keyword: gherkinDocument.feature?.keyword ?? 'Feature',
        name: gherkinDocument.feature?.name ?? '',
        description: gherkinDocument.feature?.description ?? undefined,
      },
      background: gherkinStep?.background,
      scenario: gherkinStep?.scenario,
    };
  }

  private ReportBackgroundOrScenarioIfNeeded(gherkinStepInfo: GherkinStepRunInfo) {
    if (!gherkinStepInfo.isFirstStep) {
      return;
    }

    const keyword = (
      gherkinStepInfo.background?.keyword ||
      gherkinStepInfo.scenario?.keyword ||
      'Scenario'
    ).trim();

    const name = gherkinStepInfo.background?.name || gherkinStepInfo.scenario?.name || '';

    const backgroundOrScenario = `${indent}${keyword}: ${name}`;
    this.log(this.colorFns.forStatus(Status.PASSED)(backgroundOrScenario));
    this.log('\n');
  }
  private ReportFeatureInfoIfNeeded(gherkinStepInfo: GherkinStepRunInfo) {
    if (this.hasDisplayedFeatureNameAndDescription) {
      return;
    }
    const { name, keyword, description } = gherkinStepInfo.feature;

    const feature = `${keyword}: ${name}`;
    this.log(this.colorFns.forStatus(Status.PASSED)(feature));
    this.log('\n');
    this.log('\n');

    if (description) {
      const lines = description
        .split('\n')
        .map((line) => line.replace(/\\r/g, ''))
        .map((line) => `${indent}${line}`);
      this.log(this.colorFns.location(lines.join('\n')));
      this.log('\n');
      this.log('\n');
    }

    this.hasDisplayedFeatureNameAndDescription = true;
  }
  private formatTestStepFinished(testRunInfo: messages.ITestStepFinished) {
    const stepInfo = this.getGherkinStepFrom(testRunInfo);

    if (!stepInfo) {
      return;
    }

    this.ReportFeatureInfoIfNeeded(stepInfo);
    this.ReportBackgroundOrScenarioIfNeeded(stepInfo);

    const { status, text, keyword, errorMessage } = stepInfo;
    const statusMarker = toStatusMarker(status);
    const message = `${indent}${indent}${statusMarker} ${keyword} ${text}`;

    this.log(this.colorFns.forStatus(status)(message));
    this.log('\n');

    if (errorMessage) {
      this.log('\n');
      this.log(this.colorFns.forStatus(Status.FAILED)(errorMessage));
      this.log('\n');
      this.log('\n');
    }

    if (stepInfo.isLastStep) {
      this.log('\n');
    }

    if (stepInfo.isLastStep && stepInfo.scenario) {
      this.hasDisplayedFeatureNameAndDescription = false;
    }
  }

  private formatMeta(meta: messages.IMeta) {
    const message = `${meta.implementation?.name} version: ${meta.implementation?.version}`;
    this.log(this.colorFns.forStatus(Status.PASSED)(message));
    this.log('\n');
  }

  private formatTestRunStarted(testRunInfo: messages.ITestRunStarted) {
    const startDate = toFormattedDate(testRunInfo.timestamp);

    const message = `Run started at ${startDate}`;
    this.log(this.colorFns.forStatus(Status.PASSED)(message));
    this.log('\n');
    this.log('\n');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private formatTestCaseStarted(_testRunInfo: messages.ITestCaseStarted) {
    const message = `=====================================================`;
    this.log(this.colorFns.location(message));
    this.log('\n');
    this.log('\n');
  }

  private formatTestRunFinished(testRunInfo: messages.ITestRunFinished) {
    const startDate = toFormattedDate(testRunInfo.timestamp);

    const message = `Run finished at ${startDate}`;
    this.log(this.colorFns.forStatus(Status.PASSED)(message));
    this.log('\n');
    this.log('\n');
  }
}

module.exports = SimpleConsoleFormatter;
