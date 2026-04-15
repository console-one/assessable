import { Colors } from '../vendor/color';
import { DescriptiveResult } from './isdescriptive';

const Color = Colors.all;

export const BooleanResultReporter = {
  result: (testName: string, testResult: boolean, dataSink: (data: string) => void) => {
    if (testResult) {
      dataSink(Color.FgGreen(`${testName} succeeded! `));
    } else {
      dataSink(Color.FgRed(`${testName} failed! `));
    }
  },
  error: (testName: string, error: Error, dataSink: (data: string) => void) => {
     dataSink(Color.FgRed(`${testName} failed with error: ${error}`))
  }
}

export const DescriptiveResultReporter = {
  result: (testName: string, testResult: DescriptiveResult, dataSink: (data: string) => void) => {
    if (testResult.status) {
      dataSink(Color.FgGreen(`${testName}: ${testResult.summary} `));
    } else {
      dataSink(Color.FgRed(`${testName}: ${testResult.summary} `));
    }
  },
  error: (testName: string, error: Error, dataSink: (data: string) => void) => {
     dataSink(Color.FgRed(`${testName} failed with error: ${error}`))
  }
}