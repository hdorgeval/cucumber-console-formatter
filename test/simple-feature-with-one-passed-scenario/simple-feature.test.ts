import {
  buildAndStartCucumberRuntimeWith,
  buildFormatterOptions,
  createFormatterInstanceWithOptions,
  CustomWorld,
  DefineSupportCodeFunction,
  FeatureInfo,
  SimpleMathsCalculator,
} from '../helpers';
describe('feature with one scenario', (): void => {
  let output = '';

  const logFn = jest.fn((data: string | Uint8Array): void => {
    output += data;
  });
  beforeEach((): void => {
    jest.setTimeout(120000);
    output = '';
  });
  test('should report passed Feature/Background/Scenario', async () => {
    // Given a simple feature
    const feature = `
      Feature: Simple maths

        Background: Calculator
          Given I have a simple maths calculator

        @foo @bar
        Scenario: easy maths
          Given a variable is set to 11
          When I increment this variable by 1
          Then the variable should contain 12
    `;
    const uriFeature = 'a.feature';
    const stepDefinitions: DefineSupportCodeFunction = ({ Given, When, Then, Before }) => {
      Given('I have a simple maths calculator', async function (this: CustomWorld) {
        this.calculator = new SimpleMathsCalculator();
      });

      Given('a variable is set to {int}', async function (this: CustomWorld, value: number) {
        this.calculator.startWith(value);
      });

      When('I increment this variable by {int}', async function (this: CustomWorld, value: number) {
        this.calculator.incrementBy(value);
      });

      Then('the variable should contain {int}', async function (this: CustomWorld, value: number) {
        expect(this.calculator.result).toBe(value);
      });

      /**
       * Before each scenario hook
       */
      Before({ tags: '@foo' }, async function (this: CustomWorld) {
        this.foo = true;
      });
    };

    // Given a console formatter
    const featureInfo: FeatureInfo = { feature, stepDefinitions, uriFeature };
    const formatterOptions = await buildFormatterOptions({ ...featureInfo, logFn });
    createFormatterInstanceWithOptions(formatterOptions);

    // When Cucumber runs this feature using the previous formatter
    await buildAndStartCucumberRuntimeWith(formatterOptions, featureInfo);

    // Then the formatter should display the following
    expect(output).toContain(`
Feature: Simple maths

  Background: Calculator
    √ Given I have a simple maths calculator

  Scenario: easy maths
    √ Given a variable is set to 11
    √ When I increment this variable by 1
    √ Then the variable should contain 12
`);
  });
});
