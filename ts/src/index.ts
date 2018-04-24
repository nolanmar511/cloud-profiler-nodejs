/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as delay from 'delay';
import * as extend from 'extend';
import * as gcpMetadata from 'gcp-metadata';
import * as path from 'path';
import {normalize} from 'path';
import * as pify from 'pify';
import * as semver from 'semver';

import {AuthenticationConfig, Common, ServiceConfig} from '../third_party/types/common-types';

import {Config, defaultConfig, ProfilerConfig} from './config';
import {Profiler} from './profiler';

const common: Common = require('@google-cloud/common');
const pjson = require('../../package.json');

/**
 * @return value of metadata field.
 * Throws error if there is a problem accessing metadata API.
 */
async function getMetadataInstanceField(field: string): Promise<string> {
  const res = await gcpMetadata.instance(field);
  return res.data;
}

function hasService(config: Config):
    config is {serviceContext: {service: string}} {
  return config.serviceContext !== undefined &&
      typeof config.serviceContext.service === 'string';
}

/**
 * Sets unset values in the configuration to the value retrieved from
 * environment variables, metadata, or specified in defaultConfig.
 * Throws error if value that must be set cannot be initialized.
 *
 * Exported for testing purposes.
 */
export async function initConfig(config: Config): Promise<ProfilerConfig> {
  config = common.util.normalizeArguments(null, config);

  const envConfig: Config = {
    projectId: process.env.GCLOUD_PROJECT,
    serviceContext: {
      service: process.env.GAE_SERVICE,
      version: process.env.GAE_VERSION,
    }
  };

  if (process.env.GCLOUD_PROFILER_LOGLEVEL !== undefined) {
    const envLogLevel = Number(process.env.GCLOUD_PROFILER_LOGLEVEL);
    if (!isNaN(envLogLevel)) {
      envConfig.logLevel = envLogLevel;
    }
  }

  let envSetConfig: Config = {};
  const val = process.env.GCLOUD_PROFILER_CONFIG;
  if (val) {
    envSetConfig = require(path.resolve(val)) as Config;
  }

  const mergedConfig =
      extend(true, {}, defaultConfig, envSetConfig, envConfig, config);

  if (!mergedConfig.zone || !mergedConfig.instance) {
    const [instance, zone] =
        await Promise
            .all([
              getMetadataInstanceField('name'), getMetadataInstanceField('zone')
            ])
            .catch(
                (err: Error) => {
                    // ignore errors, which will occur when not on GCE.
                }) ||
        [undefined, undefined];
    if (!mergedConfig.zone && zone) {
      mergedConfig.zone = zone.substring(zone.lastIndexOf('/') + 1);
    }
    if (!mergedConfig.instance && instance) {
      mergedConfig.instance = instance;
    }
  }

  if (!hasService(mergedConfig)) {
    throw new Error('Service must be specified in the configuration.');
  }

  return mergedConfig;
}

let profiler: Profiler|undefined = undefined;

/**
 * Starts the profiling agent and returns a promise.
 * If any error is encountered when configuring the profiler the promise will
 * be rejected. Resolves when profiling is started.
 *
 * config - Config describing configuration for profiling.
 *
 * @example
 * profiler.start();
 *
 * @example
 * profiler.start(config);
 *
 */
export async function start(config: Config = {}): Promise<void> {
  if (!semver.satisfies(process.version, pjson.engines.node)) {
    logError(
        `Could not start profiler: node version ${process.version}` +
            ` does not satisfies "${pjson.engines.node}"`,
        config);
    return;
  }
  let normalizedConfig: ProfilerConfig;
  try {
    normalizedConfig = await initConfig(config);
  } catch (e) {
    logError(`Could not start profiler: ${e}`, config);
    return;
  }
  profiler = new Profiler(normalizedConfig);
  profiler.start();
}

function logError(msg: string, config: Config) {
  const logger = new common.logger(
      {level: common.logger.LEVELS[config.logLevel || 2], tag: pjson.name});
  logger.error(msg);
}


/**
 * For debugging purposes. Collects profiles and discards the collected
 * profiles.
 */
export async function startLocal(config: Config = {}): Promise<void> {
  const normalizedConfig = await initConfig(config);
  profiler = new Profiler(normalizedConfig);

  while (true) {
    if (!config.disableHeap) {
      const heap = await profiler.profile(
          {name: 'HEAP-Profile' + new Date(), profileType: 'HEAP'});
    }
    if (!config.disableTime) {
      const wall = await profiler.profile({
        name: 'Time-Profile' + new Date(),
        profileType: 'WALL',
        duration: '10s'
      });
    }
    await delay(1000);
  }
}

// If the module was --require'd from the command line, start the agent.
if (module.parent && module.parent.id === 'internal/preload') {
  start();
}


/**
 * For debugging purposes. Collects profiles and discards the collected
 * profiles.
 */
export async function startHeap(config: Config = {}): Promise<void> {
  const normalizedConfig = await initConfig(config);
  const profiler = new Profiler(normalizedConfig);

  // Set up periodic logging.
  const logger = new common.logger({
    level: common.logger.LEVELS[normalizedConfig.logLevel],
    tag: pjson.name
  });
  let heapProfileCount = 0;
  let timeProfileCount = 0;
  let durs: number[][] = [];
  let prevLogTime = Date.now();
  let startTime = Date.now();

  setInterval(() => {
    const curTime = Date.now();
    const {rss, heapTotal, heapUsed} = process.memoryUsage();
    logger.debug(
      (Date.now() - startTime)/(1000 * 60 *60),
      rss/(1024 * 1024),
      heapTotal/(1024 * 1024),
      heapUsed/(1024 * 1024),
      heapProfileCount * 1000 / (curTime - prevLogTime),
      timeProfileCount * 1000 / (curTime - prevLogTime),
      meanDurMillis(durs),
    );
    durs = [];
    heapProfileCount = 0;
    timeProfileCount = 0;
    prevLogTime = curTime;
  }, 10000);

  setInterval(async () => {
    const start = process.hrtime();
    const heap = await profiler.profile(
        {name: 'HEAP-Profile' + new Date(), profileType: 'HEAP'});
    const dur = process.hrtime(start);
    durs.push(dur);
    heapProfileCount++;
  }, 20);
}

/**
 * For debugging purposes. Collects profiles and discards the collected
 * profiles.
 */
export async function startTime(config: Config = {}): Promise<void> {
  const normalizedConfig = await initConfig(config);
  const profiler = new Profiler(normalizedConfig);

  // Set up periodic logging.
  const logger = new common.logger({
    level: common.logger.LEVELS[normalizedConfig.logLevel],
    tag: pjson.name
  });
  let heapProfileCount = 0;
  let timeProfileCount = 0;
  let durs: number[][] = [];
  let prevLogTime = Date.now();
  let startTime = Date.now();

  setInterval(() => {
    const curTime = Date.now();
    const {rss, heapTotal, heapUsed} = process.memoryUsage();
    logger.debug(
      (Date.now() - startTime)/(1000 * 60 *60),
      rss/(1024 * 1024),
      heapTotal/(1024 * 1024),
      heapUsed/(1024 * 1024),
      heapProfileCount * 1000 / (curTime - prevLogTime),
      timeProfileCount * 1000 / (curTime - prevLogTime),
      meanDurMillis(durs),
    );
    durs = [];
    heapProfileCount = 0;
    timeProfileCount = 0;
    prevLogTime = curTime;
  }, 10000);

  setInterval(async () => {
    const start = process.hrtime();
    const wall = await profiler.profile({
      name: 'Time-Profile' + new Date(),
      profileType: 'WALL',
      duration: '10ms'
    });
    const dur = process.hrtime(start);
    durs.push(dur);
    timeProfileCount++;
  }, 20);
}

function meanDurMillis(durs: number[][]): number {
  let totalSec = 0;
  let totalNanos = 0;
  for (let i = 0; i < durs.length; i++) {
    totalSec += durs[i][0];
    totalNanos += durs[i][1];
  }
  return (totalSec * 1000)/durs.length + (totalNanos/1e6)/durs.length;
}