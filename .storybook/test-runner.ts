import type { TestRunnerConfig } from '@storybook/test-runner';

/*
 * See https://storybook.js.org/docs/writing-tests/test-runner#test-hook-api
 * to learn more about the test-runner hooks API.
 */
const config: TestRunnerConfig = {
  async preVisit(page) { },
  async postVisit(page) { },
};

export default config;