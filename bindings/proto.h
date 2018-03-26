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

#ifndef BINDINGS_PROTO_H_
#define BINDINGS_PROTO_H_

#include <cstdint>
#include <string>
#include <vector>

// A simple protocol buffer encoder.
// The format is described at
// https://developers.google.com/protocol-buffers/docs/encoding

// Abstract class describing a class which can be encoded to protocol buffer
// format.
class ProtoField {
public:
  // Writes the ProtoField in serialized protobuf format to buffer b.
  virtual void encode(std::vector<char> &b) = 0;
};

// Encodes an integer as a varint and writes this encoding to buffer b.
// The format for a varint is described at
// https://developers.google.com/protocol-buffers/docs/encoding#varints
void encodeVarint(std::vector<char> &b, uint64_t x);

// Encodes length of a field associated with particular tag number and writes
// this encoding to buffer b.
void encodeLength(std::vector<char> &b, int tag, int len);

// Encodes an unsigned integer associated with the specified tag number,
// and writes this encoding to buffer b.
void encodeUint64(std::vector<char> &b, int tag, uint64_t x);

// Encodes an array of unsigned integers associated with the specified tag
// number, and writes this encoding to buffer b.
void encodeUint64s(std::vector<char> &b, int tag, std::vector<uint64_t> x);

// Encodes an unsigned integer associated with the specified tag number,
// and writes this encoding to buffer b. If the unsign integer's value is 0,
// nothing will be written to buffer b.
void encodeUint64Opt(std::vector<char> &b, int tag, uint64_t x);

// Encodes an integer associated with the specified tag number, and writes this
// encoding to buffer b.
void encodeInt64(std::vector<char> &b, int tag, int64_t x);

// Encodes an array of integers associated with the specified tag number, and
// writes this encoding to buffer b.
void encodeInt64s(std::vector<char> &b, int tag, std::vector<int64_t> x);

// Encodes an integer associated with the specified tag number, and writes this
// encoding to buffer b. If the integer's value is 0, nothing will be written
// to buffer b.
void encodeInt64Opt(std::vector<char> &b, int tag, int64_t x);

// Encodes a string associated with the specified tag number, and writes this
// encoding to buffer b.
void encodeString(std::vector<char> &b, int tag, std::string x);

// Encodes a string array associated with the specified tag number, and writes
// this encoding to buffer b.
void encodeStrings(std::vector<char> &b, int tag, std::vector<std::string> x);

// Encodes a boolean associated with the specified tag number, and writes this
// encoding to buffer b.
void encodeBool(std::vector<char> &b, int tag, bool x);

// Encodes a boolean associated with the specified tag number, and writes this
// encoding to buffer b if the boolean is true.
void encodeBoolOpt(std::vector<char> &b, int tag, bool x);

// Encodes a ProtoField as a message, writing this encoding to buffer b.
void encodeMessage(std::vector<char> &b, int tag, ProtoField *m);

#endif
