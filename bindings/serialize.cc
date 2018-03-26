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

#include "serialize.h"
#include "nan.h"

using namespace v8;

void encodeVarint(std::vector<char> &b, uint64_t x) {
  while (x >= 128) {
    uint64_t a = (x & 0xFF);
    uint64_t y = a | 0x80;
    b.push_back((char)y);
    x >>= 7;
  }
  b.push_back((char)x);
}

void encodeLength(std::vector<char> &b, int tag, int len) {
  encodeVarint(b, ((uint64_t)tag) << 3 | 2);
  encodeVarint(b, (uint64_t)len);
}

void encodeUint64(std::vector<char> &b, int tag, uint64_t x) {
  encodeVarint(b, ((uint64_t)tag) << 3);
  encodeVarint(b, x);
}

void encodeUint64s(std::vector<char> &b, int tag, std::vector<uint64_t> x) {
  if (x.size() > 2) {
    // Use packed encoding
    std::vector<char> b1 = std::vector<char>();
    for (std::vector<uint64_t>::iterator u = x.begin(); u != x.end(); ++u) {
      encodeVarint(b1, *u);
    }
    int len = b1.size();
    encodeLength(b, tag, len);
    b.insert(b.end(), b1.begin(), b1.end());
    return;
  }
  for (std::vector<uint64_t>::iterator u = x.begin(); u != x.end(); ++u) {
    encodeUint64(b, tag, *u);
  }
}

void encodeUint64Opt(std::vector<char> &b, int tag, uint64_t x) {
  if (x == 0) {
    return;
  }
  encodeUint64(b, tag, x);
}

void encodeInt64(std::vector<char> &b, int tag, int64_t x) {
  encodeUint64(b, tag, (uint64_t)x);
}

void encodeInt64s(std::vector<char> &b, int tag, std::vector<int64_t> x) {
  if (x.size() > 2) {
    // Use packed encoding
    std::vector<char> b1 = std::vector<char>();
    for (std::vector<int64_t>::iterator u = x.begin(); u != x.end(); ++u) {
      encodeVarint(b1, *u);
    }
    int len = b1.size();
    encodeLength(b, tag, len);
    b.insert(b.end(), b1.begin(), b1.end());
    return;
  }
  for (std::vector<int64_t>::iterator u = x.begin(); u != x.end(); ++u) {
    encodeInt64(b, tag, *u);
  }
}

void encodeInt64Opt(std::vector<char> &b, int tag, int64_t x) {
  if (x == 0) {
    return;
  }
  encodeInt64(b, tag, x);
}

void encodeString(std::vector<char> &b, int tag, std::string x) {
  encodeLength(b, tag, x.length());
  b.insert(b.end(), x.begin(), x.end());
}

void encodeStrings(std::vector<char> &b, int tag, std::vector<std::string> x) {
  for (std::vector<std::string>::iterator s = x.begin(); s != x.end(); ++s) {
    encodeString(b, tag, *s);
  }
}

void encodeBool(std::vector<char> &b, int tag, bool x) {
  encodeUint64(b, tag, x ? 1 : 0);
}

void encodeBoolOpt(std::vector<char> &b, int tag, bool x) {
  if (x) {
    encodeUint64(b, tag, 1);
  }
}

void encodeMessage(std::vector<char> &b, int tag, ProtoField *m) {
  std::vector<char> b1 = std::vector<char>();
  m->encode(b1);
  int len = b1.size();
  encodeLength(b, tag, len);
  b.insert(b.end(), b1.begin(), b1.end());
}

ValueType::ValueType(int64_t typeX, int64_t unitX) {
  this->typeX = typeX;
  this->unitX = unitX;
}
void ValueType::encode(std::vector<char> &b) {
  encodeInt64Opt(b, 1, typeX);
  encodeInt64Opt(b, 2, unitX);
}

Label::Label(int64_t keyX, int64_t strX, int64_t num, int64_t unitX) {
  this->keyX = keyX;
  this->strX = strX;
  this->num = num;
  this->unitX = unitX;
}
void Label::encode(std::vector<char> &b) {
  encodeInt64Opt(b, 1, keyX);
  encodeInt64Opt(b, 2, strX);
  encodeInt64Opt(b, 3, num);
  encodeInt64Opt(b, 4, unitX);
}

Mapping::Mapping(uint64_t id, uint64_t start, uint64_t limit, uint64_t offset,
                 uint64_t fileX, uint64_t buildIDX, bool hasFunctions,
                 bool hasFilenames, bool hasLineNumbers, bool hasInlineFrames) {
  this->id = id;
  this->start = start;
  this->limit = limit;
  this->offset = offset;
  this->fileX = fileX;
  this->buildIDX = buildIDX;
  this->hasFunctions = hasFunctions;
  this->hasFilenames = hasFilenames;
  this->hasLineNumbers = hasLineNumbers;
  this->hasInlineFrames = hasInlineFrames;
}
void Mapping::encode(std::vector<char> &b) {
  encodeUint64Opt(b, 1, id);
  encodeUint64Opt(b, 2, start);
  encodeUint64Opt(b, 3, limit);
  encodeUint64Opt(b, 4, offset);
  encodeInt64Opt(b, 5, fileX);
  encodeInt64Opt(b, 6, buildIDX);
  encodeBoolOpt(b, 7, hasFunctions);
  encodeBoolOpt(b, 8, hasFilenames);
  encodeBoolOpt(b, 9, hasLineNumbers);
  encodeBoolOpt(b, 10, hasInlineFrames);
}

Line::Line(uint64_t functionID, int64_t line) {
  this->functionID = functionID;
  this->line = line;
}
void Line::encode(std::vector<char> &b) {
  encodeUint64Opt(b, 1, functionID);
  encodeInt64Opt(b, 2, line);
}

ProfileFunction::ProfileFunction(uint64_t id, int64_t nameX,
                                 int64_t systemNameX, int64_t filenameX,
                                 int64_t startLine) {
  this->id = id;
  this->nameX = nameX;
  this->systemNameX = systemNameX;
  this->filenameX = filenameX;
  this->startLine = startLine;
}
void ProfileFunction::encode(std::vector<char> &b) {
  encodeUint64Opt(b, 1, id);
  encodeInt64Opt(b, 2, nameX);
  encodeInt64Opt(b, 3, systemNameX);
  encodeInt64Opt(b, 4, filenameX);
  encodeInt64Opt(b, 5, startLine);
}

ProfileLocation::ProfileLocation(uint64_t id, uint64_t mappingID,
                                 uint64_t address, std::vector<Line> line,
                                 bool isFolded) {
  this->id = id;
  this->mappingID = mappingID;
  this->address = address;
  this->line = line;
  this->isFolded = isFolded;
}
void ProfileLocation::encode(std::vector<char> &b) {
  encodeUint64Opt(b, 1, id);
  encodeInt64Opt(b, 2, mappingID);
  encodeInt64Opt(b, 3, address);
  for (std::vector<Line>::iterator l = line.begin(); l != line.end(); ++l) {
    encodeMessage(b, 4, &*l);
  }
  encodeBoolOpt(b, 5, isFolded);
}

Sample::Sample(std::vector<uint64_t> locationID, std::vector<int64_t> value,
               std::vector<Label> label) {
  this->locationID = locationID;
  this->value = value;
  this->label = label;
}
void Sample::encode(std::vector<char> &b) {
  encodeUint64s(b, 1, locationID);
  encodeInt64s(b, 2, value);
  for (std::vector<Label>::iterator l = label.begin(); l != label.end(); ++l) {
    encodeMessage(b, 3, &*l);
  }
}

Profile::Profile(std::string periodType, std::string periodUnit, int64_t period,
                 int64_t timeNanos, int64_t durationNanos,
                 std::string dropFrames, std::string keepFramesX) {
  // first index of strings must be ""
  getStringId("");

  this->periodType =
      ValueType(getStringId(periodType), getStringId(periodUnit));
  this->period = period;
  this->timeNanos = timeNanos;
  this->durationNanos = durationNanos;
  this->dropFramesX = getStringId(dropFrames);
  this->keepFramesX = getStringId(keepFramesX);
  this->defaultSampleTypeX = 0;
}

void Profile::addSampleType(std::string type, std::string unit) {
  int64_t typeX = getStringId(type);
  int64_t unitX = getStringId(unit);
  sampleType.push_back(ValueType(typeX, unitX));
}

uint64_t Profile::addSample(std::unique_ptr<Node> &node,
                            std::deque<uint64_t> stack) {
  uint64_t loc = getLocationId(node);
  stack.push_front(loc);
  std::vector<Sample> nodeSamples = node->getSamples(*this, stack);
  sample.insert(sample.end(), nodeSamples.begin(), nodeSamples.end());
  return loc;
}

uint64_t Profile::getLocationId(std::unique_ptr<Node> &node) {
  std::string key = std::to_string(node->getFileID()) + ":" +
                    std::to_string(node->getLineNumber()) + ":" +
                    std::to_string(node->getColumnNumber()) + ":" +
                    node->getName();
  auto ids = functionIdMap.find(key);
  if (ids != functionIdMap.end()) {
    return ids->second;
  }
  uint64_t id = location.size() + 1;
  std::vector<Line> lines;
  lines.push_back(getLine(node));
  ProfileLocation l = ProfileLocation(id, 0, 0, lines, false);
  location.push_back(l);
  return id;
}

Line Profile::getLine(std::unique_ptr<Node> &node) {
  return Line(getFunctionId(node), node->getLineNumber());
}

int64_t Profile::getFunctionId(std::unique_ptr<Node> &node) {
  std::string name = node->getName();
  std::string key = std::to_string(node->getFileID()) + ":" + name;
  auto ids = functionIdMap.find(key);
  if (ids != functionIdMap.end()) {
    return ids->second;
  }
  int64_t nameX = getStringId(name);
  int64_t filenameX = getStringId(node->getFilename());
  int64_t id = function.size() + 1;
  ProfileFunction f =
      ProfileFunction(id, nameX, nameX, filenameX, node->getLineNumber());
  function.push_back(f);
  return id;
}

int64_t Profile::getStringId(std::string s) {
  auto pair = stringIdMap.find(s);
  if (pair != stringIdMap.end()) {
    return pair->second;
  }
  int64_t id = strings.size();
  stringIdMap.insert(stringIdMap.begin(),
                     std::pair<std::string, int64_t>(s, id));
  strings.push_back(s);
  return id;
}

void Profile::encode(std::vector<char> &b) {
  for (std::vector<ValueType>::iterator x = sampleType.begin();
       x != sampleType.end(); ++x) {
    encodeMessage(b, 1, &*x);
  }

  for (std::vector<Sample>::iterator x = sample.begin(); x != sample.end();
       ++x) {
    encodeMessage(b, 2, &*x);
  }

  for (std::vector<Mapping>::iterator x = mapping.begin(); x != mapping.end();
       ++x) {
    encodeMessage(b, 3, &*x);
  }
  for (std::vector<ProfileLocation>::iterator x = location.begin();
       x != location.end(); ++x) {
    encodeMessage(b, 4, &*x);
  }
  for (std::vector<ProfileFunction>::iterator x = function.begin();
       x != function.end(); ++x) {
    encodeMessage(b, 5, &*x);
  }
  encodeStrings(b, 6, strings);
  encodeInt64Opt(b, 7, dropFramesX);
  encodeInt64Opt(b, 8, keepFramesX);
  encodeInt64Opt(b, 9, timeNanos);
  encodeInt64Opt(b, 10, durationNanos);
  if (periodType.typeX != 0 || periodType.unitX != 0) {
    encodeMessage(b, 11, &periodType);
  }
  encodeInt64Opt(b, 12, period);
  encodeInt64s(b, 13, commentX);
  encodeInt64(b, 14, defaultSampleTypeX);
}

class HeapNode : public Node {
private:
  AllocationProfile::Node *node;

public:
  HeapNode(AllocationProfile::Node *node) { this->node = node; }
  virtual std::string getName() { return *String::Utf8Value(node->name); }
  virtual std::string getFilename() {
    return *String::Utf8Value(node->script_name);
  }
  virtual int64_t getFileID() { return node->script_id; }
  virtual int64_t getLineNumber() { return node->line_number; }
  virtual int64_t getColumnNumber() { return node->column_number; }
  virtual std::vector<Sample> getSamples(Profile &p,
                                         std::deque<uint64_t> stack) {
    std::vector<Sample> samples;
    for (std::vector<AllocationProfile::Allocation>::iterator allocation =
             node->allocations.begin();
         allocation != node->allocations.end(); ++allocation) {
      std::vector<Label> labels = {Label(p.getStringId("allocation"), 0,
                                         allocation->size,
                                         p.getStringId("bytes"))};
      std::vector<int64_t> vals = {allocation->count,
                                   allocation->size * allocation->count};
      Sample s = Sample({stack.begin(), stack.end()}, vals, labels);
      samples.push_back(s);
    }
    return samples;
  }
};

class TimeNode : public Node {
private:
  const CpuProfileNode *node;
  int samplingIntervalMicros;

public:
  TimeNode(const CpuProfileNode *node, int samplingIntervalMicros) {
    this->node = node;
    this->samplingIntervalMicros = samplingIntervalMicros;
  }
  virtual std::string getName() {
    return *String::Utf8Value(node->GetFunctionName());
  }
  virtual std::string getFilename() {
    return *String::Utf8Value(node->GetScriptResourceName());
  }
  virtual int64_t getFileID() { return node->GetScriptId(); }
  virtual int64_t getLineNumber() { return node->GetLineNumber(); }
  virtual int64_t getColumnNumber() { return node->GetColumnNumber(); }
  virtual std::vector<Sample> getSamples(Profile &p,
                                         std::deque<uint64_t> stack) {
    std::vector<Sample> samples;
    int64_t hitCount = node->GetHitCount();
    std::vector<int64_t> vals = {hitCount, hitCount * samplingIntervalMicros};
    Sample s = Sample({stack.begin(), stack.end()}, vals, std::vector<Label>());
    samples.push_back(s);
    return samples;
  }
};

struct TimeEntry {
  const CpuProfileNode *node;
  std::deque<uint64_t> stack;
};

std::vector<char> serializeTimeProfile(std::unique_ptr<CpuProfile> profile,
                                       int64_t samplingIntervalMicros,
                                       int64_t startTimeNanos) {
  int64_t durationNanos =
      (profile->GetEndTime() - profile->GetStartTime()) * 1000;

  Profile p = Profile("wall", "microseconds", samplingIntervalMicros,
                      startTimeNanos, durationNanos);
  p.addSampleType("sample", "count");
  p.addSampleType("wall", "microseconds");

  // Add root to entries
  const CpuProfileNode *root = profile->GetTopDownRoot();
  std::vector<TimeEntry> entries;
  int32_t count = root->GetChildrenCount();
  for (int32_t i = 0; i < count; i++) {
    TimeEntry child;
    child.node = root->GetChild(i);
    entries.push_back(child);
  }

  // Iterate over profile tree and serialize
  while (entries.size() > 0) {
    TimeEntry entry = entries.back();
    entries.pop_back();

    std::unique_ptr<Node> node(
        new TimeNode(entry.node, samplingIntervalMicros));
    uint64_t loc = p.addSample(node, entry.stack);
    std::deque<uint64_t> stack = entry.stack;
    stack.push_front(loc);
    int32_t count = entry.node->GetChildrenCount();
    for (int32_t i = 0; i < count; i++) {
      TimeEntry child;
      child.node = entry.node->GetChild(i);
      child.stack = stack;
      entries.push_back(child);
    }
  }

  // serialize profile
  std::vector<char> b;
  p.encode(b);
  return b;
}

struct HeapEntry {
  AllocationProfile::Node *node;
  std::deque<uint64_t> stack;
};

std::vector<char>
serializeHeapProfile(std::unique_ptr<AllocationProfile> profile,
                     int64_t intervalBytes, int64_t startTimeNanos) {
  Profile p = Profile("space", "bytes", intervalBytes, startTimeNanos);
  p.addSampleType("objects", "count");
  p.addSampleType("space", "bytes");

  // Add root to entries
  AllocationProfile::Node *root = profile->GetRootNode();
  std::vector<HeapEntry> entries;
  for (std::vector<AllocationProfile::Node *>::iterator node =
           root->children.begin();
       node != root->children.end(); ++node) {
    HeapEntry entry;
    entry.node = *node;
    entries.push_back(entry);
  }

  // Iterate over profile tree and serialize
  while (entries.size() > 0) {
    HeapEntry entry = entries.back();
    entries.pop_back();

    std::unique_ptr<Node> node(new HeapNode(entry.node));
    uint64_t loc = p.addSample(node, entry.stack);
    std::deque<uint64_t> stack = entry.stack;
    stack.push_front(loc);
    for (std::vector<AllocationProfile::Node *>::iterator node =
             entry.node->children.begin();
         node != entry.node->children.end(); ++node) {
      HeapEntry entry;
      entry.node = *node;
      entry.stack = stack;
      entries.push_back(entry);
    }
  }

  // serialize profile
  std::vector<char> b;
  p.encode(b);
  return b;
}
