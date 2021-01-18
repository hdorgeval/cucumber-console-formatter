import { IFormatterLogFn, IFormatterOptions } from '@cucumber/cucumber/lib/formatter';
import { EventDataCollector } from '@cucumber/cucumber/lib/formatter/helpers';
import StepDefinitionSnippetBuilder from '@cucumber/cucumber/lib/formatter/step_definition_snippet_builder';
import { SupportCodeLibraryBuilder } from '@cucumber/cucumber/lib/support_code_library_builder';
import {
  IDefineSupportCodeMethods,
  ISupportCodeLibrary,
} from '@cucumber/cucumber/lib/support_code_library_builder/types';
import { IdGenerator, messages } from '@cucumber/messages';
import { Status } from '@cucumber/cucumber';
import { IParsedArgvFormatOptions } from '@cucumber/cucumber/lib/cli/argv_parser';
import { IColorFn, IColorFns } from '@cucumber/cucumber/lib/formatter/get_color_fns';
import { ParameterTypeRegistry } from '@cucumber/cucumber-expressions';
import { GherkinStreams, IGherkinOptions } from '@cucumber/gherkin';
import Runtime, { IRuntimeOptions } from '@cucumber/cucumber/lib/runtime';
import { emitMetaMessage, emitSupportCodeMessages } from '@cucumber/cucumber/lib/cli/helpers';
import { EventEmitter } from 'events';
import { PassThrough } from 'stream';
const { uuid } = IdGenerator;

// inspired by the cucumber-js library: formatter_helpers.ts
export type DefineSupportCodeFunction = (methods: IDefineSupportCodeMethods) => void;
export function buildSupportCodeLibrary(
  cwd: string | DefineSupportCodeFunction = __dirname,
  fn: DefineSupportCodeFunction | null = null,
): ISupportCodeLibrary {
  if (typeof cwd === 'function') {
    fn = cwd;
    cwd = __dirname;
  }
  const supportCodeLibraryBuilder = new SupportCodeLibraryBuilder();
  supportCodeLibraryBuilder.reset(cwd, IdGenerator.incrementing());
  if (fn) {
    fn(supportCodeLibraryBuilder.methods);
  }
  return supportCodeLibraryBuilder.finalize();
}

export interface FeatureInfo {
  stepDefinitions: DefineSupportCodeFunction;
  feature: string;
  uriFeature: string;
}

export interface BuildOptions extends FeatureInfo {
  logFn?: IFormatterLogFn;
}
export function buildRuntimeOptions(overrides: Partial<IRuntimeOptions>): IRuntimeOptions {
  return {
    dryRun: false,
    predictableIds: false,
    failFast: false,
    filterStacktraces: false,
    retry: 0,
    retryTagFilter: '',
    strict: true,
    worldParameters: {},
    ...overrides,
  };
}

export async function buildFormatterOptions(options?: BuildOptions): Promise<IFormatterOptions> {
  const colorFn: IColorFn = jest.fn<string, string[]>().mockImplementation((text) => text);
  const colorFns: IColorFns = {
    forStatus: jest.fn((status) => {
      switch (status) {
        case Status.PASSED:
          return colorFn;

        default:
          return colorFn;
      }
    }),
    location: colorFn,
    tag: colorFn,
  };

  const parsedArgvOptions: IParsedArgvFormatOptions = {
    colorsEnabled: true,
  };
  const enveloppeEmitter = new EventEmitter();
  const passThrough = new PassThrough();
  const formatterOption: IFormatterOptions = {
    cwd: `${__dirname}`,
    eventBroadcaster: enveloppeEmitter,
    colorFns,
    cleanup: jest.fn(),
    log: options?.logFn || jest.fn(),
    parsedArgvOptions,
    supportCodeLibrary: buildSupportCodeLibrary(`${__dirname}`, options?.stepDefinitions),
    eventDataCollector: new EventDataCollector(enveloppeEmitter),
    snippetBuilder: new StepDefinitionSnippetBuilder({
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      snippetSyntax: { build: (_snippetSyntaxBuildOptions) => '' },
      parameterTypeRegistry: new ParameterTypeRegistry(),
    }),
    stream: passThrough,
  };

  return formatterOption;
}

export function createFormatterInstanceWithOptions(options: IFormatterOptions): void {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ConsoleFormatter = require('../../src/index');
  new ConsoleFormatter(options);
}

export interface IParseRequest {
  data: string;
  uri: string;
  options?: IGherkinOptions;
}
export interface IParsedSource {
  pickles: messages.IPickle[];
  source: messages.ISource;
  gherkinDocument: messages.IGherkinDocument;
}
export interface IParsedSourceWithEnvelopes extends IParsedSource {
  envelopes: messages.IEnvelope[];
}
export async function parseFeature({
  data,
  uri,
  options,
}: IParseRequest): Promise<IParsedSourceWithEnvelopes> {
  const sources = [
    {
      source: {
        uri,
        data: data,
        mediaType: 'text/x.cucumber.gherkin+plain',
      },
    },
  ];
  return await new Promise<IParsedSourceWithEnvelopes>((resolve, reject) => {
    let source: messages.ISource;
    let gherkinDocument: messages.IGherkinDocument;
    const pickles: messages.IPickle[] = [];
    const envelopes: messages.IEnvelope[] = [];
    const messageStream = GherkinStreams.fromSources(sources, { ...options });
    messageStream.on('data', (envelope: messages.IEnvelope) => {
      envelopes.push(envelope);
      if (envelope.source) {
        source = envelope.source;
      }
      if (envelope.gherkinDocument) {
        gherkinDocument = envelope.gherkinDocument;
      }
      if (envelope.pickle) {
        pickles.push(envelope.pickle);
      }
      if (envelope.attachment) {
        reject(new Error(`Parse error in '${uri}': ${envelope.attachment.body}`));
      }
    });
    messageStream.on('end', () => {
      resolve({
        envelopes,
        source,
        gherkinDocument,
        pickles,
      });
    });
    messageStream.on('error', reject);
  });
}

export async function buildAndStartCucumberRuntimeWith(
  formatterOptions: IFormatterOptions,
  featureInfo: FeatureInfo,
): Promise<void> {
  await emitMetaMessage(formatterOptions.eventBroadcaster);
  emitSupportCodeMessages({
    supportCodeLibrary: formatterOptions.supportCodeLibrary,
    eventBroadcaster: formatterOptions.eventBroadcaster,
    newId: uuid(),
  });
  const { pickles, envelopes } = await parseFeature({
    data: featureInfo.feature,
    uri: featureInfo.uriFeature,
  });
  envelopes.forEach((envelope) => formatterOptions.eventBroadcaster.emit('envelope', envelope));
  const pickleIds = pickles.map((p) => p.id || 'unknown');
  const runtime = new Runtime({
    eventBroadcaster: formatterOptions.eventBroadcaster,
    eventDataCollector: formatterOptions.eventDataCollector,
    newId: uuid(),
    options: buildRuntimeOptions({}),
    pickleIds,
    supportCodeLibrary: formatterOptions.supportCodeLibrary,
  });

  //envelopes.forEach((envelope) => options.eventBroadcaster.emit('envelope', envelope));
  await runtime.start();
}
