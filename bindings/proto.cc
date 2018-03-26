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

#include "proto.h"

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
