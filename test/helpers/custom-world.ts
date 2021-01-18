import { SimpleMathsCalculator } from './simple-maths-calculator';
import { World } from '@cucumber/cucumber';

export interface CustomWorld extends World {
  calculator: SimpleMathsCalculator;
  foo: boolean;
}
