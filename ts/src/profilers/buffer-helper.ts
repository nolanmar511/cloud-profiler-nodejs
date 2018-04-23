
/**
 * Copyright 2018 Google Inc. All Rights Reserved.
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

import * as pify from 'pify';
import * as zlib from 'zlib';
import { Buffer } from 'buffer';

const gzip = pify(zlib.gzip);
const profiler = require('bindings')('sampling_heap_profiler');

export interface ProfilingBuffer {
  dataLength: number;
  data: Buffer;
}

// Takes a ProfilingBuffer and returns a compressed, base64 encoded string
// representing the profile in the buffer.
export async function encodeProfilingBuffer(buffer: ProfilingBuffer): Promise<string> {
  const gzBuf = await gzip(buffer.data.slice(0,buffer.dataLength));
  return gzBuf.toString('base64');
}