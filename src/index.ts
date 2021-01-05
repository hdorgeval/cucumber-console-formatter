import { ensureDirectoryExists } from './fs';
import { dateToFilename } from './time';
import { Formatter } from '@cucumber/cucumber';
import { IFormatterOptions } from '@cucumber/cucumber/lib/formatter';
import { messages } from '@cucumber/messages';
import { writeFileSync } from 'fs';
import { join } from 'path';

class SimpleConsoleFormatter extends Formatter {
  private eventIndex = 0;
  private instanceCreationDate = new Date();
  private printEnvelopes = process.env['SimpleConsoleFormatter.printEnvelopes'] === 'true';
  private targetSubFolderForPrintedEnvelopes =
    process.env['SimpleConsoleFormatter.targetFolderForPrintedEnvelopes'] ||
    'debug-console-formatter';

  constructor(options: IFormatterOptions) {
    super(options);
    options.eventBroadcaster.on('envelope', (envelope: messages.IEnvelope) => {
      this.printEnvelope(envelope);
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
}

module.exports = SimpleConsoleFormatter;
