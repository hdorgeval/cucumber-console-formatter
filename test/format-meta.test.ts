import { buildFormatterOptions, createFormatterInstanceWithOptions } from './helpers';
import { metaEnvelope } from './data/envelopes';
import { Status } from '@cucumber/cucumber';
describe('meta envelope processing', (): void => {
  test('should process meta envelope', () => {
    // Given the formatter has been instanciated by Cucumber
    const options = buildFormatterOptions();
    createFormatterInstanceWithOptions(options);

    // When Cucumber emits a meta envelope
    const envelope = metaEnvelope;
    options.eventBroadcaster.emit('envelope', envelope);

    // Then the formatter should display the cucumber-js version
    expect(options.log).toHaveBeenCalled();
    expect(options.log).toHaveBeenCalledWith('cucumber-js version: 7.0.0');
    expect(options.log).toHaveBeenCalledWith('\n');
    expect(options.colorFns.forStatus).toHaveBeenCalledWith(Status.PASSED);
  });
});
