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

#ifndef SERIALIZE
#define SERIALIZE

#include <memory>
#include <map>
#include "v8-profiler.h"

std::vector<char> serializeHeapProfile(std::unique_ptr<v8::AllocationProfile>
  profile, int64_t intervalBytes, int64_t startTimeNanos);

std::vector<char> serializeTimeProfile(std::unique_ptr<v8::CpuProfile> profile,
  int64_t samplingIntervalMicros, int64_t startTimeNanos);

class ProtoMessage {
public:
  virtual void encode(std::vector<char> &b) = 0;
};

class ValueType : public ProtoMessage {
public:
  int64_t typeX;
  int64_t unitX;
  ValueType(int64_t typeX=0, int64_t unitX=0);
  virtual void encode(std::vector<char> &b);
};

class Label : public ProtoMessage {
private:
  int64_t keyX;
  int64_t strX;
  int64_t num;
  int64_t unitX;
public:
  Label(int64_t keyX=0, int64_t strX=0, int64_t num=0, int64_t unitX=0);
  virtual void encode(std::vector<char> &b);
};

class Mapping : public ProtoMessage {
private:
  uint64_t id;
  uint64_t start;
  uint64_t limit;
  uint64_t offset;
  uint64_t fileX;
  uint64_t buildIDX;
  bool hasFunctions;
  bool hasFilenames;
  bool hasLineNumbers;
  bool hasInlineFrames;
public:
  Mapping(uint64_t id, uint64_t start, uint64_t limit, uint64_t offset,
      uint64_t fileX, uint64_t buildIDX, bool hasFunctions, bool hasFilenames,
      bool hasLineNumbers, bool hasInlineFrames);
  virtual void encode(std::vector<char> &b);
};

class Line : public ProtoMessage {
private:
  uint64_t functionIDX;
  int64_t line;
public:
  Line(uint64_t functionIDX, int64_t line);
  virtual void encode(std::vector<char> &b);
};

class ProfFunction : public ProtoMessage {
private:
  uint64_t id;
  int64_t nameX;
  int64_t systemNameX;
  int64_t filenameX;
  int64_t startLine;
public:
  ProfFunction(uint64_t id, int64_t nameX, int64_t systemNameX,
    int64_t filenameX, int64_t startLine);
  virtual void encode(std::vector<char> &b);
};

class ProfLocation : public ProtoMessage {
private:
  uint64_t id;
  uint64_t mappingIDX;
  uint64_t address;
  std::vector<Line> line;
  bool isFolded;
public:
  ProfLocation(uint64_t id, uint64_t mappingIDX, uint64_t address,
    std::vector<Line> line, bool isFolded);
  virtual void encode(std::vector<char> &b);
};

class Sample : public ProtoMessage {
private:
  std::vector<uint64_t> locationIDX;
  std::vector<int64_t> value;
  std::vector<Label> label;
public:
  Sample(std::vector<uint64_t> locationIDX, std::vector<int64_t> value, 
    std::vector<Label> label);
  virtual void encode(std::vector<char> &b);
};


class Node;
class Profile : public ProtoMessage {
private:
  std::vector<ValueType> sampleType;
  std::vector<ProfLocation> location;
  std::vector<Sample> sample;
  std::vector<Mapping> mapping;
  std::vector<ProfFunction> function;
  std::vector<std::string> strings;
  int64_t dropFramesX;
  int64_t keepFramesX;
  int64_t timeNanos;
  int64_t durationNanos;
  ValueType periodType;
  int64_t period;
  std::vector<int64_t> commentX;
  int64_t defaultSampleTypeX;
  std::map<std::string, int64_t> functionIdMap;
  std::map<std::string, int64_t> locationIdMap;
  std::map<std::string, int64_t> stringIdMap;

public:
  Profile(std::string periodType, std::string periodUnit, int64_t period,
    int64_t timeNanos=0, int64_t durationNanos=0,
    std::string dropFrames="", std::string keepFramesX="");
  void addSampleType(std::string type, std::string unit);
  uint64_t addSample(std::unique_ptr<Node>& node, std::deque<uint64_t> stack);
  uint64_t getLocationId(std::unique_ptr<Node>& node);
  Line getLine(std::unique_ptr<Node>& node);
  int64_t getFunctionId(std::unique_ptr<Node>& node) ;
  int64_t getStringId(std::string s);
  virtual void encode(std::vector<char> &b);
};

class Node {
public:
  virtual std::string getName() = 0;
  virtual std::string getFilename() = 0;
  virtual int64_t getFileID() = 0;
  virtual int64_t getLineNumber() = 0;
  virtual int64_t getColumnNumber() = 0;
  virtual std::vector<Sample> getSamples(Profile& p, std::deque<uint64_t> stack) = 0;
};

#endif
