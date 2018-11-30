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

import {perftools} from '../../proto/profile';
import {TimeProfile} from '../src/v8-types';

const timeLeaf1 = {
  name: 'function1',
  scriptName: 'script1',
  scriptId: 1,
  lineNumber: 10,
  columnNumber: 5,
  hitCount: 1,
  children: []
};

const timeLeaf2 = {
  name: 'function1',
  scriptName: 'script2',
  scriptId: 2,
  lineNumber: 15,
  columnNumber: 3,
  hitCount: 2,
  children: []
};

const timeLeaf3 = {
  name: 'function1',
  scriptName: 'script1',
  scriptId: 1,
  lineNumber: 5,
  columnNumber: 3,
  hitCount: 1,
  children: []
};

const timeNode1 = {
  name: 'function1',
  scriptName: 'script1',
  scriptId: 1,
  lineNumber: 5,
  columnNumber: 3,
  hitCount: 3,
  children: [timeLeaf1, timeLeaf2]
};

const timeNode2 = {
  name: 'function2',
  scriptName: 'script2',
  scriptId: 2,
  lineNumber: 1,
  columnNumber: 5,
  hitCount: 0,
  children: [timeLeaf3]
};

const timeRoot = {
  name: '(root)',
  scriptName: 'root',
  scriptId: 0,
  lineNumber: 0,
  columnNumber: 0,
  hitCount: 0,
  children: [timeNode1, timeNode2]
};

export const v8TimeProfile: TimeProfile = Object.freeze({
  startTime: 0,
  endTime: 10 * 1000 * 1000,
  topDownRoot: timeRoot,
});

const timeLines = [
  {functionId: 1, line: 1},
  {functionId: 2, line: 5},
  {functionId: 3, line: 15},
  {functionId: 2, line: 10},
];

const timeFunctions = [
  new perftools.profiles.Function({id: 1, name: 5, systemName: 5, filename: 6}),
  new perftools.profiles.Function({id: 2, name: 7, systemName: 7, filename: 8}),
  new perftools.profiles.Function({id: 3, name: 7, systemName: 7, filename: 6}),
];

const timeLocations = [
  new perftools.profiles.Location({
    line: [timeLines[0]],
    id: 1,
  }),
  new perftools.profiles.Location({
    line: [timeLines[1]],
    id: 2,
  }),
  new perftools.profiles.Location({
    line: [timeLines[2]],
    id: 3,
  }),
  new perftools.profiles.Location({
    line: [timeLines[3]],
    id: 4,
  }),
];

export const timeProfile: perftools.profiles.IProfile = Object.freeze({
  sampleType: [
    new perftools.profiles.ValueType({type: 1, unit: 2}),
    new perftools.profiles.ValueType({type: 3, unit: 4}),
  ],
  sample: [
    new perftools.profiles.Sample(
        {locationId: [2, 1], value: [1, 1000], label: []}),
    new perftools.profiles.Sample(
        {locationId: [2], value: [3, 3000], label: []}),
    new perftools.profiles.Sample(
        {locationId: [3, 2], value: [2, 2000], label: []}),
    new perftools.profiles.Sample(
        {locationId: [4, 2], value: [1, 1000], label: []}),

  ],
  location: timeLocations,
  function: timeFunctions,
  stringTable: [
    '',
    'sample',
    'count',
    'wall',
    'microseconds',
    'function2',
    'script2',
    'function1',
    'script1',
  ],
  timeNanos: 0,
  durationNanos: 10 * 1000 * 1000 * 1000,
  periodType: new perftools.profiles.ValueType({type: 3, unit: 4}),
  period: 1000,
});

// timeProfile is encoded then decoded to convert numbers to longs, in
// decodedTimeProfile
const encodedTimeProfile =
    perftools.profiles.Profile.encode(timeProfile).finish();
export const decodedTimeProfile =
    Object.freeze(perftools.profiles.Profile.decode(encodedTimeProfile));

const lineNumberTimeLeafLine1A = {
  name: '',
  scriptName: 'funcs',
  scriptId: 1,
  lineNumber: 6,
  columnNumber: 0,
  hitCount: 2,
  children: []
};

const lineNumberTimeLeafLine1B = {
  name: '',
  scriptName: 'funcs',
  scriptId: 1,
  lineNumber: 7,
  columnNumber: 0,
  hitCount: 3,
  children: []
};

const lineNumberTimeLeafFunc1 = {
  name: 'baz',
  scriptName: 'funcs',
  scriptId: 1,
  lineNumber: 2,
  columnNumber: 0,
  hitCount: 0,
  children: [lineNumberTimeLeafLine1A, lineNumberTimeLeafLine1B]
};

const lineNumberTimeLeafLine2A = {
  name: '',
  scriptName: 'funcs',
  scriptId: 1,
  lineNumber: 6,
  columnNumber: 0,
  hitCount: 4,
  children: []
};

const lineNumberTimeLeafLine2B = {
  name: '',
  scriptName: 'funcs',
  scriptId: 1,
  lineNumber: 7,
  columnNumber: 0,
  hitCount: 5,
  children: []
};

const lineNumberTimeLeafFunc2 = {
  name: 'baz',
  scriptName: 'funcs',
  scriptId: 1,
  lineNumber: 2,
  columnNumber: 0,
  hitCount: 0,
  children: [lineNumberTimeLeafLine2A, lineNumberTimeLeafLine2B]
};
const lineNumberTimeNode3 = {
  name: 'foo',
  scriptName: 'main',
  scriptId: 0,
  lineNumber: 7,
  columnNumber: 0,
  hitCount: 0,
  children: [lineNumberTimeLeafFunc2]
};

const lineNumberTimeNode2 = {
  name: 'foo',
  scriptName: 'main',
  scriptId: 0,
  lineNumber: 6,
  columnNumber: 0,
  hitCount: 0,
  children: [lineNumberTimeLeafFunc1]
};

const lineNumberTimeNode1 = {
  name: 'bar',
  scriptName: 'main',
  scriptId: 0,
  lineNumber: 2,
  columnNumber: 0,
  hitCount: 0,
  children: [lineNumberTimeNode2, lineNumberTimeNode3]
};

const lineNumberTimeMain = {
  name: 'main',
  scriptName: 'main',
  scriptId: 0,
  lineNumber: 1,
  columnNumber: 0,
  hitCount: 0,
  children: [lineNumberTimeNode1]
};

const lineNumberTimeRoot = {
  name: '(root)',
  scriptName: 'root',
  scriptId: 0,
  lineNumber: 0,
  columnNumber: 0,
  hitCount: 0,
  children: [lineNumberTimeMain]
};


export const v8LineNumberTimeProfile: TimeProfile = Object.freeze({
  startTime: 0,
  endTime: 10 * 1000 * 1000,
  topDownRoot: lineNumberTimeRoot,
});

const lineNumberTimeLines = [
  {functionId: 1, line: 2},
  {functionId: 2, line: 7},
  {functionId: 3, line: 2},
  {functionId: 4, line: 7},
  {functionId: 4, line: 6},
  {functionId: 2, line: 6},
];

const lineNumberTimeFunctions = [
  new perftools.profiles.Function({id: 1, name: 5, systemName: 5, filename: 5}),
  new perftools.profiles.Function({id: 2, name: 6, systemName: 6, filename: 5}),
  new perftools.profiles.Function({id: 3, name: 7, systemName: 7, filename: 8}),
  new perftools.profiles.Function({id: 4, name: 9, systemName: 9, filename: 8}),
];

const lineNumberTimeLocations = [
  new perftools.profiles.Location({
    line: [lineNumberTimeLines[0]],
    id: 1,
  }),
  new perftools.profiles.Location({
    line: [lineNumberTimeLines[1]],
    id: 2,
  }),
  new perftools.profiles.Location({
    line: [lineNumberTimeLines[2]],
    id: 3,
  }),
  new perftools.profiles.Location({
    line: [lineNumberTimeLines[3]],
    id: 4,
  }),
  new perftools.profiles.Location({
    line: [lineNumberTimeLines[4]],
    id: 5,
  }),
  new perftools.profiles.Location({
    line: [lineNumberTimeLines[5]],
    id: 6,
  }),
];

export const lineNumberTimeProfile: perftools.profiles.IProfile =
    Object.freeze({
      sampleType: [
        new perftools.profiles.ValueType({type: 1, unit: 2}),
        new perftools.profiles.ValueType({type: 3, unit: 4}),
      ],
      sample: [
        new perftools.profiles.Sample(
            {locationId: [4, 3, 2, 1], value: [5, 5000], label: []}),
        new perftools.profiles.Sample(
            {locationId: [5, 3, 2, 1], value: [4, 4000], label: []}),
        new perftools.profiles.Sample(
            {locationId: [4, 3, 6, 1], value: [3, 3000], label: []}),
        new perftools.profiles.Sample(
            {locationId: [5, 3, 6, 1], value: [2, 2000], label: []}),
      ],
      location: lineNumberTimeLocations,
      function: lineNumberTimeFunctions,
      stringTable: [
        '',
        'sample',
        'count',
        'wall',
        'microseconds',
        'main',
        'bar',
        'foo',
        'funcs',
        'baz',
      ],
      timeNanos: 0,
      durationNanos: 10 * 1000 * 1000 * 1000,
      periodType: new perftools.profiles.ValueType({type: 3, unit: 4}),
      period: 1000,
    });

// profile is encoded then decoded to convert numbers to longs, in
// decodedTimeProfile
const encodedLineNumberTimeProfile =
    perftools.profiles.Profile.encode(timeProfile).finish();
export const decodedLineNumberTimeProfile =
    Object.freeze(perftools.profiles.Profile.decode(encodedTimeProfile));


const heapLeaf1 = {
  name: 'function2',
  scriptName: 'script1',
  scriptId: 1,
  lineNumber: 8,
  columnNumber: 5,
  allocations: [{count: 5, sizeBytes: 1024}],
  children: []
};

const heapLeaf2 = {
  name: 'function3',
  scriptName: 'script1',
  scriptId: 1,
  lineNumber: 10,
  columnNumber: 5,
  allocations: [{count: 8, sizeBytes: 10}, {count: 15, sizeBytes: 72}],
  children: []
};

const heapNode2 = {
  name: 'function1',
  scriptName: 'script1',
  scriptId: 1,
  lineNumber: 5,
  columnNumber: 5,
  allocations: [],
  children: [heapLeaf1, heapLeaf2]
};

const heapNode1 = {
  name: 'main',
  scriptName: 'main',
  scriptId: 0,
  lineNumber: 1,
  columnNumber: 5,
  allocations: [{count: 1, sizeBytes: 5}, {count: 3, sizeBytes: 7}],
  children: [heapNode2]
};

export const v8HeapProfile = Object.freeze({
  name: '(root)',
  scriptName: '(root)',
  scriptId: 10000,
  lineNumber: 0,
  columnNumber: 5,
  allocations: [],
  children: [heapNode1]
});

const heapLines = [
  {functionId: 1, line: 1}, {functionId: 2, line: 5}, {functionId: 3, line: 10},
  {functionId: 4, line: 8}
];

const heapFunctions = [
  new perftools.profiles.Function({id: 1, name: 5, systemName: 5, filename: 5}),
  new perftools.profiles.Function({id: 2, name: 6, systemName: 6, filename: 7}),
  new perftools.profiles.Function({id: 3, name: 8, systemName: 8, filename: 7}),
  new perftools.profiles.Function(
      {id: 4, name: 9, systemName: 9, filename: 7})
];

const heapLocations = [
  new perftools.profiles.Location({line: [heapLines[0]], id: 1}),
  new perftools.profiles.Location({line: [heapLines[1]], id: 2}),
  new perftools.profiles.Location({line: [heapLines[2]], id: 3}),
  new perftools.profiles.Location({line: [heapLines[3]], id: 4}),
];

export const heapProfile: perftools.profiles.IProfile = Object.freeze({
  sampleType: [
    new perftools.profiles.ValueType({type: 1, unit: 2}),
    new perftools.profiles.ValueType({type: 3, unit: 4}),
  ],
  sample: [
    new perftools.profiles.Sample({locationId: [1], value: [1, 5], label: []}),
    new perftools.profiles.Sample({locationId: [1], value: [3, 21], label: []}),
    new perftools.profiles.Sample(
        {locationId: [3, 2, 1], value: [8, 80], label: []}),
    new perftools.profiles.Sample(
        {locationId: [3, 2, 1], value: [15, 15 * 72], label: []}),
    new perftools.profiles.Sample(
        {locationId: [4, 2, 1], value: [5, 5 * 1024], label: []}),
  ],
  location: heapLocations,
  function: heapFunctions,
  stringTable: [
    '',
    'objects',
    'count',
    'space',
    'bytes',
    'main',
    'function1',
    'script1',
    'function3',
    'function2',
  ],
  timeNanos: 0,
  periodType: new perftools.profiles.ValueType({type: 3, unit: 4}),
  period: 524288
});

// heapProfile is encoded then decoded to convert numbers to longs, in
// decodedHeapProfile
const encodedHeapProfile =
    perftools.profiles.Profile.encode(heapProfile).finish();
export const decodedHeapProfile =
    Object.freeze(perftools.profiles.Profile.decode(encodedHeapProfile));

const heapLinesWithExternal = [
  {functionId: 1}, {functionId: 2, line: 1}, {functionId: 3, line: 5},
  {functionId: 4, line: 10}, {functionId: 5, line: 8}
];

const heapFunctionsWithExternal = [
  new perftools.profiles.Function({id: 1, name: 5, systemName: 5, filename: 0}),
  new perftools.profiles.Function({id: 2, name: 6, systemName: 6, filename: 6}),
  new perftools.profiles.Function({id: 3, name: 7, systemName: 7, filename: 8}),
  new perftools.profiles.Function({id: 4, name: 9, systemName: 9, filename: 8}),
  new perftools.profiles.Function(
      {id: 5, name: 10, systemName: 10, filename: 8}),
];

const heapLocationsWithExternal = [
  new perftools.profiles.Location({line: [heapLinesWithExternal[0]], id: 1}),
  new perftools.profiles.Location({line: [heapLinesWithExternal[1]], id: 2}),
  new perftools.profiles.Location({line: [heapLinesWithExternal[2]], id: 3}),
  new perftools.profiles.Location({line: [heapLinesWithExternal[3]], id: 4}),
  new perftools.profiles.Location({line: [heapLinesWithExternal[4]], id: 5}),
];

export const heapProfileWithExternal:
    perftools.profiles.IProfile = Object.freeze({
  sampleType: [
    new perftools.profiles.ValueType({type: 1, unit: 2}),
    new perftools.profiles.ValueType({type: 3, unit: 4}),
  ],
  sample: [
    new perftools.profiles.Sample(
        {locationId: [1], value: [1, 1024], label: []}),
    new perftools.profiles.Sample({locationId: [2], value: [1, 5], label: []}),
    new perftools.profiles.Sample({locationId: [2], value: [3, 21], label: []}),
    new perftools.profiles.Sample(
        {locationId: [4, 3, 2], value: [8, 80], label: []}),
    new perftools.profiles.Sample(
        {locationId: [4, 3, 2], value: [15, 15 * 72], label: []}),
    new perftools.profiles.Sample(
        {locationId: [5, 3, 2], value: [5, 5 * 1024], label: []}),
  ],
  location: heapLocationsWithExternal,
  function: heapFunctionsWithExternal,
  stringTable: [
    '', 'objects', 'count', 'space', 'bytes', '(external)', 'main', 'function1',
    'script1', 'function3', 'function2'
  ],
  timeNanos: 0,
  periodType: new perftools.profiles.ValueType({type: 3, unit: 4}),
  period: 524288
});

// heapProfile is encoded then decoded to convert numbers to longs, in
// decodedHeapProfile
const encodedHeapProfileWithExternal =
    perftools.profiles.Profile.encode(heapProfile).finish();
export const decodedHeapProfileWithExternal =
    Object.freeze(perftools.profiles.Profile.decode(encodedHeapProfile));

const anonymousHeapNode = {
  scriptName: 'main',
  scriptId: 0,
  lineNumber: 1,
  columnNumber: 5,
  allocations: [{count: 1, sizeBytes: 5}],
  children: []
};

export const v8AnonymousFunctionHeapProfile = Object.freeze({
  name: '(root)',
  scriptName: '(root)',
  scriptId: 10000,
  lineNumber: 0,
  columnNumber: 5,
  allocations: [],
  children: [anonymousHeapNode]
});

const anonymousFunctionHeapLines = [
  {functionId: 1, line: 1},
];

const anonymousFunctionHeapFunctions = [
  new perftools.profiles.Function({id: 1, name: 5, systemName: 5, filename: 6}),
];

const anonymousFunctionHeapLocations = [
  new perftools.profiles.Location({line: [heapLines[0]], id: 1}),
];

export const anonymousFunctionHeapProfile:
    perftools.profiles.IProfile = Object.freeze({
  sampleType: [
    new perftools.profiles.ValueType({type: 1, unit: 2}),
    new perftools.profiles.ValueType({type: 3, unit: 4}),
  ],
  sample: [
    new perftools.profiles.Sample({locationId: [1], value: [1, 5], label: []}),
  ],
  location: anonymousFunctionHeapLocations,
  function: anonymousFunctionHeapFunctions,
  stringTable: [
    '',
    'objects',
    'count',
    'space',
    'bytes',
    '(anonymous)',
    'main',
  ],
  timeNanos: 0,
  periodType: new perftools.profiles.ValueType({type: 3, unit: 4}),
  period: 524288
});

const anonymousFunctionTimeNode = {
  scriptName: 'main',
  scriptId: 2,
  lineNumber: 1,
  columnNumber: 5,
  hitCount: 1,
  children: []
};

const anonymousFunctionTimeRoot = {
  name: '(root)',
  scriptName: 'root',
  scriptId: 0,
  lineNumber: 0,
  columnNumber: 0,
  hitCount: 0,
  children: [anonymousFunctionTimeNode]
};

export const v8AnonymousFunctionTimeProfile: TimeProfile = Object.freeze({
  startTime: 0,
  endTime: 10 * 1000 * 1000,
  topDownRoot: anonymousFunctionTimeRoot,
});

const anonymousFunctionTimeLines = [
  {functionId: 1, line: 1},
];

const anonymousFunctionTimeFunctions = [
  new perftools.profiles.Function({id: 1, name: 5, systemName: 5, filename: 6}),
];

const anonymousFunctionTimeLocations = [
  new perftools.profiles.Location({
    line: [timeLines[0]],
    id: 1,
  }),
];

export const anonymousFunctionTimeProfile: perftools.profiles.IProfile =
    Object.freeze({
      sampleType: [
        new perftools.profiles.ValueType({type: 1, unit: 2}),
        new perftools.profiles.ValueType({type: 3, unit: 4}),
      ],
      sample: [
        new perftools.profiles.Sample(
            {locationId: [1], value: [1, 1000], label: []}),
      ],
      location: anonymousFunctionTimeLocations,
      function: anonymousFunctionTimeFunctions,
      stringTable: [
        '',
        'sample',
        'count',
        'wall',
        'microseconds',
        '(anonymous)',
        'main',
      ],
      timeNanos: 0,
      durationNanos: 10 * 1000 * 1000 * 1000,
      periodType: new perftools.profiles.ValueType({type: 3, unit: 4}),
      period: 1000,
    });

const heapWithPathLeaf1 = {
  name: 'foo2',
  scriptName: 'foo.ts',
  scriptId: 0,
  lineNumber: 3,
  columnNumber: 3,
  allocations: [{count: 1, sizeBytes: 2}],
  children: []
};


const heapWithPathLeaf2 = {
  name: 'bar',
  scriptName: '@google-cloud/profiler/profiler.ts',
  scriptId: 1,
  lineNumber: 10,
  columnNumber: 5,
  allocations: [{count: 2, sizeBytes: 2}],
  children: []
};

const heapWithPathLeaf3 = {
  name: 'bar',
  scriptName: 'bar.ts',
  scriptId: 2,
  lineNumber: 3,
  columnNumber: 3,
  allocations: [{count: 3, sizeBytes: 2}],
  children: []
};

const heapWithPathNode2 = {
  name: 'baz',
  scriptName: 'foo.ts',
  scriptId: 0,
  lineNumber: 1,
  columnNumber: 5,
  allocations: [],
  children: [heapWithPathLeaf1, heapWithPathLeaf2]
};

const heapWithPathNode1 = {
  name: 'foo1',
  scriptName: 'node_modules/@google-cloud/profiler/profiler.ts',
  scriptId: 3,
  lineNumber: 2,
  columnNumber: 5,
  allocations: [],
  children: [heapWithPathLeaf3]
};

export const v8HeapWithPathProfile = Object.freeze({
  name: '(root)',
  scriptName: '(root)',
  scriptId: 10000,
  lineNumber: 0,
  columnNumber: 5,
  allocations: [],
  children: [heapWithPathNode1, heapWithPathNode2]
});

const heapIncludePathFunctions = [
  new perftools.profiles.Function({id: 1, name: 5, systemName: 5, filename: 6}),
  new perftools.profiles.Function({id: 2, name: 7, systemName: 7, filename: 8}),
  new perftools.profiles.Function({id: 3, name: 9, systemName: 9, filename: 6}),
  new perftools.profiles.Function(
      {id: 4, name: 10, systemName: 10, filename: 11}),
  new perftools.profiles.Function(
      {id: 5, name: 7, systemName: 7, filename: 12})
];

const heapIncludePathLocations = [
  new perftools.profiles.Location({line: [{functionId: 1, line: 1}], id: 1}),
  new perftools.profiles.Location({line: [{functionId: 2, line: 10}], id: 2}),
  new perftools.profiles.Location({line: [{functionId: 3, line: 3}], id: 3}),
  new perftools.profiles.Location({line: [{functionId: 4, line: 2}], id: 4}),
  new perftools.profiles.Location({line: [{functionId: 5, line: 3}], id: 5}),
];

export const heapProfileIncludePath: perftools.profiles.IProfile =
    Object.freeze({
      sampleType: [
        new perftools.profiles.ValueType({type: 1, unit: 2}),
        new perftools.profiles.ValueType({type: 3, unit: 4}),
      ],
      sample: [
        new perftools.profiles.Sample(
            {locationId: [2, 1], value: [2, 4], label: []}),
        new perftools.profiles.Sample(
            {locationId: [3, 1], value: [1, 2], label: []}),
        new perftools.profiles.Sample(
            {locationId: [5, 4], value: [3, 6], label: []}),
      ],
      location: heapIncludePathLocations,
      function: heapIncludePathFunctions,
      stringTable: [
        '',
        'objects',
        'count',
        'space',
        'bytes',
        'baz',
        'foo.ts',
        'bar',
        '@google-cloud/profiler/profiler.ts',
        'foo2',
        'foo1',
        'node_modules/@google-cloud/profiler/profiler.ts',
        'bar.ts',
      ],
      timeNanos: 0,
      periodType: new perftools.profiles.ValueType({type: 3, unit: 4}),
      period: 524288
    });

// heapProfile is encoded then decoded to convert numbers to longs, in
// decodedHeapProfile
const encodedHeapProfileIncludePath =
    perftools.profiles.Profile.encode(heapProfileIncludePath).finish();
export const decodedHeapProfileIncludePath = Object.freeze(
    perftools.profiles.Profile.decode(encodedHeapProfileIncludePath));

const heapExcludePathFunctions = [
  new perftools.profiles.Function({id: 1, name: 5, systemName: 5, filename: 6}),
  new perftools.profiles.Function({id: 2, name: 7, systemName: 7, filename: 6}),
];

const heapExcludePathLocations = [
  new perftools.profiles.Location({line: [{functionId: 1, line: 1}], id: 1}),
  new perftools.profiles.Location({line: [{functionId: 2, line: 3}], id: 2}),
];

export const heapProfileExcludePath: perftools.profiles.IProfile =
    Object.freeze({
      sampleType: [
        new perftools.profiles.ValueType({type: 1, unit: 2}),
        new perftools.profiles.ValueType({type: 3, unit: 4}),
      ],
      sample: [
        new perftools.profiles.Sample(
            {locationId: [2, 1], value: [1, 2], label: []}),
      ],
      location: heapExcludePathLocations,
      function: heapExcludePathFunctions,
      stringTable: [
        '',
        'objects',
        'count',
        'space',
        'bytes',
        'baz',
        'foo.ts',
        'foo2',
      ],
      timeNanos: 0,
      periodType: new perftools.profiles.ValueType({type: 3, unit: 4}),
      period: 524288
    });

// heapProfile is encoded then decoded to convert numbers to longs, in
// decodedHeapProfile
const encodedHeapProfileExcludePath =
    perftools.profiles.Profile.encode(heapProfileExcludePath).finish();
export const decodedHeapProfileExcludePath = Object.freeze(
    perftools.profiles.Profile.decode(encodedHeapProfileExcludePath));
