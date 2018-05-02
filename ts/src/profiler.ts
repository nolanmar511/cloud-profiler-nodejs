
import * as common from '@google-cloud/common';
import * as http from 'http';
import * as path from 'path';
import * as pify from 'pify';
import * as msToStr from 'pretty-ms';
import * as request from 'request';
import {Request} from 'request';
import * as zlib from 'zlib';

import {perftools} from '../../proto/profile';

import {ProfilerConfig} from './config';
import {isBackoffResponseError} from './profiler-error-helper';
import {HeapProfiler} from './profilers/heap-profiler';
import {TimeProfiler} from './profilers/time-profiler';

const pjson = require('../../package.json');
const SCOPE = 'https://www.googleapis.com/auth/monitoring.write';
const gzip = pify(zlib.gzip);

enum ProfileTypes {
  Wall = 'WALL',
  Heap = 'HEAP'
}

/**
 * @return true iff http status code indicates an error.
 */
function isErrorResponseStatusCode(code: number) {
  return code < 200 || code >= 300;
}

/**
 * Interface for deployment field of RequestProfile. Profiles with matching
 * deployments will be grouped together.
 * Used as body of request when creating profile using the profiler API.
 *
 * Public for testing.
 */
export interface Deployment {
  projectId?: string;
  target?: string;
  labels?: {zone?: string, version?: string};
}

/**
 * Interface for body of response from profiler API when creating
 * profile and used as body of request to profiler API when
 * uploading a profile.
 *
 * Public for testing.
 */
export interface RequestProfile {
  name: string;
  profileType?: string;
  duration?: string;
  profileBytes?: string;
  deployment?: Deployment;
  labels?: {instance?: string};
}

/**
 * @return true if an deployment is a Deployment and false otherwise.
 */
// tslint:disable-next-line: no-any
function isDeployment(deployment: any): deployment is Deployment {
  return (deployment.projectId === undefined ||
          typeof deployment.projectId === 'string') &&
      (deployment.target === undefined ||
       typeof deployment.target === 'string');
}

/**
 * @return true if an prof is a RequestProfile and false otherwise.
 */
// tslint:disable-next-line: no-any
function isRequestProfile(prof: any): prof is RequestProfile {
  return prof && typeof prof.name === 'string' &&
      typeof prof.profileType === 'string' &&
      (prof.duration === undefined || typeof prof.duration === 'string') &&
      (prof.labels === undefined || prof.labels.instance === undefined ||
       typeof prof.labels.instance === 'string') &&
      (prof.deployment === undefined || isDeployment(prof.deployment));
}

/**
 * Converts a profile to a compressed, base64 encoded string.
 *
 * Work for converting profile is done on the event loop. In particular,
 * profile encoding is done on the event loop. So, this does  block execution
 * of the program, but for a short period of time, since profiles are small.
 *
 * @param p - profile to be converted to string.
 */
async function profileBytes(p: perftools.profiles.IProfile): Promise<string> {
  const buffer = perftools.profiles.Profile.encode(p).finish();
  const gzBuf = await gzip(buffer);
  return gzBuf.toString('base64');
}

/**
 * Class which tracks how long to wait before the next retry and can be
 * used to get this backoff.
 */
export class Retryer {
  private nextBackoffMillis: number;

  // For testing. Allows Math.random() to be replaced with non-random function.
  private random: () => number;

  constructor(
      readonly initialBackoffMillis: number, readonly backoffCapMillis: number,
      readonly backoffMultiplier: number, random = Math.random) {
    this.nextBackoffMillis = this.initialBackoffMillis;
    this.random = random;
  }
  getBackoff(): number {
    const curBackoff = this.random() * this.nextBackoffMillis;
    this.nextBackoffMillis = Math.min(
        this.backoffMultiplier * this.nextBackoffMillis, this.backoffCapMillis);
    return curBackoff;
  }
  reset() {
    this.nextBackoffMillis = this.initialBackoffMillis;
  }
}

/**
 * Polls profiler server for instructions on behalf of a task and
 * collects and uploads profiles as requested
 */
export class Profiler extends common.ServiceObject {
  private config: ProfilerConfig;
  private logger: common.Logger;
  private profileLabels: {instance?: string};
  private deployment: Deployment;
  private profileTypes: string[];
  private retryer: Retryer;

  // Public for testing.
  timeProfiler: TimeProfiler|undefined;
  heapProfiler: HeapProfiler|undefined;

  constructor(config: ProfilerConfig) {
    config =
        common.util.normalizeArguments({config_: {}}, config) as ProfilerConfig;
    const serviceConfig = {
      baseUrl: config.baseApiUrl,
      scopes: [SCOPE],
      packageJson: pjson,
    };
    super({parent: new common.Service(serviceConfig, config), baseUrl: '/'});
    this.config = config;

    this.logger = new common.Logger({
      level: common.logger.LEVELS[config.logLevel as number],
      tag: pjson.name
    });

    const labels: {zone?: string, version?: string} = {};
    if (this.config.zone) {
      labels.zone = this.config.zone;
    }
    if (this.config.serviceContext.version) {
      labels.version = this.config.serviceContext.version;
    }
    this.deployment = {
      projectId: this.config.projectId,
      target: this.config.serviceContext.service,
      labels
    };

    this.profileLabels = {};
    if (this.config.instance) {
      this.profileLabels.instance = this.config.instance;
    }

    this.profileTypes = [];
    if (!this.config.disableTime) {
      this.profileTypes.push(ProfileTypes.Wall);
      this.timeProfiler = new TimeProfiler(this.config.timeIntervalMicros);
    }
    if (!this.config.disableHeap) {
      this.profileTypes.push(ProfileTypes.Heap);
      this.heapProfiler = new HeapProfiler(
          this.config.heapIntervalBytes, this.config.heapMaxStackDepth);
    }

    this.retryer = new Retryer(
        this.config.initialBackoffMillis, this.config.backoffCapMillis,
        this.config.backoffMultiplier);
  }

  /**
   * Starts an endless loop to poll profiler server for instructions, and
   * collects and uploads profiles as requested.
   * If there is a problem when collecting a profile or uploading a profile to
   * profiler server, this problem will be logged at the error level and
   * otherwise ignored.
   * If there is a problem polling profiler server for instructions
   * on the type of profile to be collected, this problem will be logged at the
   * error level and getting profile type will be retried.
   */
  start() {
    this.runLoop();
  }

  /**
   * Endlessly polls the profiler server for instructions, and collects and
   * uploads profiles as requested.
   */
  async runLoop() {
    const delayMillis = await this.collectProfile();
    setTimeout(this.runLoop.bind(this), delayMillis).unref();
  }

  /**
   * Waits for profiler server to tell it to collect a profile, then collects
   * a profile and uploads it.
   *
   * @return time, in ms, to wait before asking profiler server again about
   * collecting another profile.
   */
  async collectProfile(): Promise<number> {
    let prof: RequestProfile;
    try {
      prof = await this.createProfile();
    } catch (err) {
      if (isBackoffResponseError(err)) {
        this.logger.debug(`Must wait ${
            msToStr(err.backoffMillis)} to create profile: ${err}`);
        return Math.min(err.backoffMillis, this.config.serverBackoffCapMillis);
      }
      const backoff = this.retryer.getBackoff();
      this.logger.warn(`Failed to create profile, waiting ${
          msToStr(backoff)} to try again: ${err}`);
      return backoff;
    }
    this.retryer.reset();
    await this.profileAndUpload(prof);
    return 0;
  }

  /**
   * Talks to profiler server, which hangs until server indicates
   * job should be profiled and then indicates what type of profile should
   * be collected.
   *
   * If any problem is encountered, an error will be thrown.
   *
   * @return a RequestProfile specifying which type of profile should be
   * collected and other information needed to collect and upload a profile of
   * the specified type.
   *
   * TODO (issue #28): right now, this call could hang for up to an hour when
   * this method is the only thing on the event loop, keeping the program open
   * even when all work is done. Should expose the ability to cancel the http
   * request made here, and then determine when to cancel this request.
   *
   * Public to allow for testing.
   */
  async createProfile(): Promise<RequestProfile> {
    const reqBody = {
      deployment: this.deployment,
      profileType: this.profileTypes,
    };
    const options = {
      method: 'POST',
      uri: '/profiles',
      body: reqBody,
      json: true,

      // Default timeout for for a request is 1 minute, but request to create
      // profile is designed to hang until it is time to collect a profile
      // (up to one hour).
      timeout: parseDuration('1h'),
    };

    this.logger.debug(`Attempting to create profile.`);
    const prof = await this.request(options);
    if (!isRequestProfile(prof)) {
      throw new Error(`Profile not valid: ${JSON.stringify(prof)}.`);
    }
    this.logger.debug(`Successfully created profile ${prof.profileType}.`);
    return prof;
  }

  /**
   * Collects a profile of the type specified by the profileType field of prof.
   * If any problem is encountered, like a problem collecting or uploading the
   * profile, a message will be logged, and the error will otherwise be ignored.
   *
   * Public to allow for testing.
   */
  async profileAndUpload(prof: RequestProfile): Promise<void> {
    try {
      prof = await this.profile(prof);
      this.logger.debug(`Successfully collected profile ${prof.profileType}.`);
      prof.labels = this.profileLabels;
    } catch (err) {
      this.logger.debug(`Failed to collect profile: ${err}`);
      return;
    }
    const options = {
      method: 'PATCH',
      uri: this.config.baseApiUrl + '/' + prof.name,
      body: prof,
      json: true,
    };

    try {
      const response = await this.request(options);
      if (isErrorResponseStatusCode(response.statusCode)) {
        let message: number|string = response.statusCode;
        if (response.statusMessage) {
          message = response.statusMessage;
        }
        this.logger.debug(`Could not upload profile: ${message}.`);
        return;
      }
      this.logger.debug(`Successfully uploaded profile ${prof.profileType}.`);
    } catch (err) {
      this.logger.debug(`Failed to upload profile: ${err}`);
    }
  }

  /**
   * Collects a profile of the type specified by profileType field of prof.
   * If any problem is encountered, for example the profileType is not
   * recognized or profiling is disabled for the specified profileType, an
   * error will be thrown.
   *
   * Public to allow for testing.
   */
  async profile(prof: RequestProfile): Promise<RequestProfile> {
    switch (prof.profileType) {
      case ProfileTypes.Wall:
        return await this.writeTimeProfile(prof);
      case ProfileTypes.Heap:
        return this.writeHeapProfile(prof);
      default:
        throw new Error(`Unexpected profile type ${prof.profileType}.`);
    }
  }

  /**
   * Collects a time profile, converts profile to compressed, base64 encoded
   * string, and puts this string in profileBytes field of prof.
   *
   * Public to allow for testing.
   */
  async writeTimeProfile(prof: RequestProfile): Promise<RequestProfile> {
    if (!this.timeProfiler) {
      throw Error('Cannot collect time profile, time profiler not enabled.');
    }
    if (prof.duration === undefined) {
      throw Error('Cannot collect time profile, duration is undefined.');
    }
    const durationMillis = parseDuration(prof.duration);
    if (!durationMillis) {
      throw Error(
          `Cannot collect time profile, duration "${prof.duration}" cannot` +
          ` be parsed.`);
    }
    const p = await this.timeProfiler.profile(durationMillis);
    prof.profileBytes = await profileBytes(p);
    return prof;
  }

  /**
   * Collects a heap profile, converts profile to compressed, base64 encoded
   * string, and adds profileBytes field to prof with this string.
   *
   * Public to allow for testing.
   */
  async writeHeapProfile(prof: RequestProfile): Promise<RequestProfile> {
    if (!this.heapProfiler) {
      throw Error('Cannot collect heap profile, heap profiler not enabled.');
    }
    const p = this.heapProfiler.profile();
    prof.profileBytes = await profileBytes(p);
    return prof;
  }
}
