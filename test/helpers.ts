import { IFormatterOptions } from '@cucumber/cucumber/lib/formatter';
import { EventDataCollector } from '@cucumber/cucumber/lib/formatter/helpers';
import StepDefinitionSnippetBuilder from '@cucumber/cucumber/lib/formatter/step_definition_snippet_builder';
import { SupportCodeLibraryBuilder } from '@cucumber/cucumber/lib/support_code_library_builder';
import {
  IDefineSupportCodeMethods,
  ISupportCodeLibrary,
} from '@cucumber/cucumber/lib/support_code_library_builder/types';
import { IdGenerator } from '@cucumber/messages';
import { Status } from '@cucumber/cucumber';
import { IParsedArgvFormatOptions } from '@cucumber/cucumber/lib/cli/argv_parser';
import { IColorFn, IColorFns } from '@cucumber/cucumber/lib/formatter/get_color_fns';
import { ParameterTypeRegistry } from '@cucumber/cucumber-expressions';
import { EventEmitter } from 'events';
import { PassThrough } from 'stream';

type DefineSupportCodeFunction = (methods: IDefineSupportCodeMethods) => void;
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

export function buildFormatterOptions(): IFormatterOptions {
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
    log: jest.fn(),
    parsedArgvOptions,
    supportCodeLibrary: buildSupportCodeLibrary(),
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
  const ConsoleFormatter = require('../src/index');
  new ConsoleFormatter(options);
}
