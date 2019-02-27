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

import * as sinon from 'sinon';
import * as heapProfiler from '../src/profilers/heap-profiler';
import * as v8HeapProfiler from '../src/profilers/heap-profiler-bindings';
import {heapProfileExcludePath, heapProfileIncludePath, heapProfileWithExternal, v8HeapProfile, v8HeapWithPathProfile} from './profiles-for-tests';

const copy = require('deep-copy');
const assert = require('assert');

describe('HeapProfiler', () => {
  let startStub: sinon.SinonStub;
  let stopStub: sinon.SinonStub;
  let profileStub: sinon.SinonStub;
  let dateStub: sinon.SinonStub;
  let memoryUsageStub: sinon.SinonStub;
  beforeEach(() => {
    startStub = sinon.stub(v8HeapProfiler, 'startSamplingHeapProfiler');
    stopStub = sinon.stub(v8HeapProfiler, 'stopSamplingHeapProfiler');
    dateStub = sinon.stub(Date, 'now').returns(0);
  });

  afterEach(() => {
    heapProfiler.stop();
    startStub.restore();
    stopStub.restore();
    profileStub.restore();
    dateStub.restore();
    memoryUsageStub.restore();
  });
  describe('profile', async () => {
    it('should return a profile equal to the expected profile when external memory is allocated',
       async () => {
         profileStub = sinon.stub(v8HeapProfiler, 'getAllocationProfile')
                           .returns(copy(v8HeapProfile));
         memoryUsageStub = sinon.stub(process, 'memoryUsage').returns({
           external: 1024,
           rss: 2048,
           heapTotal: 4096,
           heapUsed: 2048,
         });
         const intervalBytes = 1024 * 512;
         const stackDepth = 32;
         heapProfiler.start(intervalBytes, stackDepth);
         const profile = await heapProfiler.profile();
         assert.deepEqual(heapProfileWithExternal, profile);
       });

    it('should return a profile equal to the expected profile when including all samples',
       async () => {
         profileStub = sinon.stub(v8HeapProfiler, 'getAllocationProfile')
                           .returns(copy(v8HeapWithPathProfile));
         memoryUsageStub = sinon.stub(process, 'memoryUsage').returns({
           external: 0,
           rss: 2048,
           heapTotal: 4096,
           heapUsed: 2048,
         });
         const intervalBytes = 1024 * 512;
         const stackDepth = 32;
         heapProfiler.start(intervalBytes, stackDepth);
         const profile = await heapProfiler.profile();
         assert.deepEqual(heapProfileIncludePath, profile);
       });

    it('should return a profile equal to the expected profile when excluding profiler samples',
       async () => {
         profileStub = sinon.stub(v8HeapProfiler, 'getAllocationProfile')
                           .returns(copy(v8HeapWithPathProfile));
         memoryUsageStub = sinon.stub(process, 'memoryUsage').returns({
           external: 0,
           rss: 2048,
           heapTotal: 4096,
           heapUsed: 2048,
         });
         const intervalBytes = 1024 * 512;
         const stackDepth = 32;
         heapProfiler.start(intervalBytes, stackDepth);
         const profile = await heapProfiler.profile('@google-cloud/profiler');
         assert.deepEqual(heapProfileExcludePath, profile);
       });

    it('should throw error when not started', async () => {
      try {
        await heapProfiler.profile();
        assert.fail('Expected an error to be thrown,');
      } catch (err) {
        assert.strictEqual(err.message, 'Heap profiler is not enabled.');
      }
    });

    it('should throw error when started then stopped', async () => {
      const intervalBytes = 1024 * 512;
      const stackDepth = 32;
      heapProfiler.start(intervalBytes, stackDepth);
      await heapProfiler.stop();
      try {
        await heapProfiler.profile();
        assert.fail('Expected an error to be thrown,');
      } catch (err) {
        assert.strictEqual(err.message, 'Heap profiler is not enabled.');
      }
    });
  });

  describe('start', () => {
    it('should call startSamplingHeapProfiler', () => {
      const intervalBytes1 = 1024 * 512;
      const stackDepth1 = 32;
      heapProfiler.start(intervalBytes1, stackDepth1);
      assert.ok(
          startStub.calledWith(intervalBytes1, stackDepth1),
          'expected startSamplingHeapProfiler to be called');
    });
    it('should throw error when enabled and started with different parameters',
       () => {
         const intervalBytes1 = 1024 * 512;
         const stackDepth1 = 32;
         heapProfiler.start(intervalBytes1, stackDepth1);
         assert.ok(
             startStub.calledWith(intervalBytes1, stackDepth1),
             'expected startSamplingHeapProfiler to be called');
         startStub.resetHistory();
         const intervalBytes2 = 1024 * 128;
         const stackDepth2 = 64;
         try {
           heapProfiler.start(intervalBytes2, stackDepth2);
         } catch (e) {
           assert.strictEqual(
               e.message,
               'Heap profiler is already started  with intervalBytes 524288 and' +
                   ' stackDepth 64');
         }
         assert.ok(
             !startStub.called,
             'expected startSamplingHeapProfiler not to be called second time');
       });
  });

  describe('stop', () => {
    it('should not call stopSamplingHeapProfiler if profiler not started',
       () => {
         heapProfiler.stop();
         assert.ok(!stopStub.called, 'stop() should have been no-op.');
       });
    it('should call stopSamplingHeapProfiler if profiler started', () => {
      heapProfiler.start(1024 * 512, 32);
      heapProfiler.stop();
      assert.ok(
          stopStub.called, 'expected stopSamplingHeapProfiler to be called');
    });
  });
});
