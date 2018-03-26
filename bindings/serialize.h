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

#ifndef BINDINGS_SERIALIZE_H_
#define BINDINGS_SERIALIZE_H_

#include "proto.h"
#include "v8-profiler.h"
#include <deque>
#include <map>
#include <memory>

// Returns a buffer with the input v8::AllocationProfile profile in 
// the profile.proto format.
std::vector<char>
serializeHeapProfile(std::unique_ptr<v8::AllocationProfile> profile,
                     int64_t intervalBytes, int64_t startTimeNanos);


// Returns a buffer with the input v8::CpuProfile profile in the profile.proto
// format.
std::vector<char> serializeTimeProfile(std::unique_ptr<v8::CpuProfile> profile,
                                       int64_t samplingIntervalMicros,
                                       int64_t startTimeNanos);

// Corresponds to ValueType defined in third_party/proto/profile.proto.
class ValueType : public ProtoField {
public:
  int64_t typeX; // Index into string table.
  int64_t unitX; // Index into string table.
  ValueType(int64_t typeX = 0, int64_t unitX = 0);
  virtual void encode(std::vector<char> &b);
};

// Corresponds to Label defined in third_party/proto/profile.proto.
class Label : public ProtoField {
private:
  int64_t keyX; // Index into string table.
  int64_t strX; // Index into string table.
  int64_t num;
  int64_t unitX; // Index into string table.

public:
  Label(int64_t keyX = 0, int64_t strX = 0, int64_t num = 0, int64_t unitX = 0);
  virtual void encode(std::vector<char> &b);
};


// Corresponds to Mapping defined in third_party/proto/profile.proto.
class Mapping : public ProtoField {
private:
  uint64_t id;
  uint64_t start;
  uint64_t limit;
  uint64_t offset;
  uint64_t fileX; // Index into string table.  
  uint64_t buildIDX; // Index into string table.  
  bool hasFunctions;
  bool hasFilenames;
  bool hasLineNumbers;
  bool hasInlineFrames;

public:
  Mapping(uint64_t id, uint64_t start, uint64_t limit, uint64_t offset,
          uint64_t fileX, uint64_t buildIDX, bool hasFunctions,
          bool hasFilenames, bool hasLineNumbers, bool hasInlineFrames);
  virtual void encode(std::vector<char> &b);
};

// Corresponds to Line defined in third_party/proto/profile.proto.
class Line : public ProtoField {
private:
  uint64_t functionID;
  int64_t line;

public:
  Line(uint64_t functionID, int64_t line);
  virtual void encode(std::vector<char> &b);
};

// Corresponds to Function defined in third_party/proto/profile.proto.
class ProfileFunction : public ProtoField {
private:
  uint64_t id;
  int64_t nameX; // Index into string table. 
  int64_t systemNameX; // Index into string table. 
  int64_t filenameX; // Index into string table. 
  int64_t startLine;

public:
  ProfileFunction(uint64_t id, int64_t nameX, int64_t systemNameX,
                  int64_t filenameX, int64_t startLine);
  virtual void encode(std::vector<char> &b);
};

// Corresponds to Location defined in third_party/proto/profile.proto.
class ProfileLocation : public ProtoField {
private:
  uint64_t id;
  uint64_t mappingID;
  uint64_t address;
  std::vector<Line> line;
  bool isFolded;

public:
  ProfileLocation(uint64_t id, uint64_t mappingID, uint64_t address,
                  std::vector<Line> line, bool isFolded);
  virtual void encode(std::vector<char> &b);
};

// Corresponds to Sample defined in third_party/proto/profile.proto.
class Sample : public ProtoField {
private:
  std::vector<uint64_t> locationID;
  std::vector<int64_t> value;
  std::vector<Label> label;

public:
  Sample(std::vector<uint64_t> locationID, std::vector<int64_t> value,
         std::vector<Label> label);
  virtual void encode(std::vector<char> &b);
};

class Node;

// Corresponds to Profile defined in third_party/proto/profile.proto.
class Profile : public ProtoField {
private:
  std::vector<ValueType> sampleType;
  std::vector<ProfileLocation> location;
  std::vector<Sample> sample;
  std::vector<Mapping> mapping;
  std::vector<ProfileFunction> function;
  std::vector<std::string> strings;
  int64_t dropFramesX; // Index into string table. 
  int64_t keepFramesX; // Index into string table. 
  int64_t timeNanos;
  int64_t durationNanos;
  ValueType periodType;
  int64_t period;
  std::vector<int64_t> commentX; // Indices into string table. 
  int64_t defaultSampleTypeX;
  std::map<std::string, int64_t> functionIdMap;
  std::map<std::string, int64_t> locationIdMap;
  std::map<std::string, int64_t> stringIdMap;

public:
  Profile(std::string periodType, std::string periodUnit, int64_t period,
          int64_t timeNanos = 0, int64_t durationNanos = 0,
          std::string dropFrames = "", std::string keepFramesX = "");
  void addSampleType(std::string type, std::string unit);
  uint64_t addSample(std::unique_ptr<Node> &node, std::deque<uint64_t> stack);
  uint64_t getLocationId(std::unique_ptr<Node> &node);
  Line getLine(std::unique_ptr<Node> &node);
  int64_t getFunctionId(std::unique_ptr<Node> &node);
  int64_t getStringId(std::string s);
  virtual void encode(std::vector<char> &b);
};

// 
class Node {
public:
  virtual std::string getName() = 0;
  virtual std::string getFilename() = 0;
  virtual int64_t getFileID() = 0;
  virtual int64_t getLineNumber() = 0;
  virtual int64_t getColumnNumber() = 0;
  virtual std::vector<Sample> getSamples(Profile &p,
                                         std::deque<uint64_t> stack) = 0;
};

#endif
