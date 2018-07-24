/**
 * Copyright 2015 Google Inc. All Rights Reserved.
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

#include "v8-profiler.h"
#include "nan.h"

using namespace v8;

#if NODE_MODULE_VERSION > NODE_8_0_MODULE_VERSION
// This profiler exists for the lifetime of the program. Not calling 
// CpuProfiler::Dispose() is intentional.
CpuProfiler* cpuProfiler = CpuProfiler::New(v8::Isolate::GetCurrent());
#else
CpuProfiler* cpuProfiler = v8::Isolate::GetCurrent()->GetCpuProfiler();
#endif


Local<Value> TranslateTimeProfileNode(const CpuProfileNode* node, bool hasLines) {
  Local<Object> js_node = Nan::New<Object>();
  js_node->Set(Nan::New<String>("name").ToLocalChecked(),
    node->GetFunctionName());
  js_node->Set(Nan::New<String>("scriptName").ToLocalChecked(),
    node->GetScriptResourceName());
  js_node->Set(Nan::New<String>("scriptId").ToLocalChecked(),
    Nan::New<Integer>(node->GetScriptId()));
  js_node->Set(Nan::New<String>("lineNumber").ToLocalChecked(),
    Nan::New<Integer>(node->GetLineNumber()));
  js_node->Set(Nan::New<String>("columnNumber").ToLocalChecked(),
    Nan::New<Integer>(node->GetColumnNumber()));
  js_node->Set(Nan::New<String>("hitCount").ToLocalChecked(),
    Nan::New<Integer>(node->GetHitCount()));
  int32_t count = node->GetChildrenCount();

  unsigned int index = 0;
  Local<Array>  children;

  // Add nodes corresponding to lines within the node's function.
  unsigned int hitLineCount = node->GetHitLineCount();
  std::vector<CpuProfileNode::LineTick> entries(hitLineCount);
  if (hasLines && node->GetLineTicks(&entries[0], hitLineCount)) {
    children = Nan::New<Array>(count + entries.size());
    js_node->Set(Nan::New<String>("hitCount").ToLocalChecked(),
      Nan::New<Integer>(0));
    for (const CpuProfileNode::LineTick entry: entries) {
      Local<Object> js_node_hit = Nan::New<Object>();
      js_node_hit->Set(Nan::New<String>("name").ToLocalChecked(),
        Nan::New<String>("").ToLocalChecked());
      js_node_hit->Set(Nan::New<String>("scriptName").ToLocalChecked(),
        node->GetScriptResourceName());
      js_node_hit->Set(Nan::New<String>("scriptId").ToLocalChecked(),
        Nan::New<Integer>(node->GetScriptId()));
      js_node_hit->Set(Nan::New<String>("lineNumber").ToLocalChecked(),
        Nan::New<Integer>(entry.line));
      js_node_hit->Set(Nan::New<String>("columnNumber").ToLocalChecked(),
        Nan::New<Integer>(0));
      js_node_hit->Set(Nan::New<String>("hitCount").ToLocalChecked(),
        Nan::New<Integer>(entry.hit_count));
      js_node_hit->Set(Nan::New<String>("children").ToLocalChecked(),
        Nan::New<Array>(0));
      children->Set(index++, js_node_hit);
    }
  } else {
    children = Nan::New<Array>(count);
  }

  // Add nodes corresponding to functions called by the node's function.
  for (int32_t i = 0; i < count; i++) {
    children->Set(index++, TranslateTimeProfileNode(node->GetChild(i), hasLines));
  }

  js_node->Set(Nan::New<String>("children").ToLocalChecked(),
    children);
  return js_node;
}

Local<Value> TranslateTimeProfile(const CpuProfile* profile, bool hasLines) {
  Local<Object> js_profile = Nan::New<Object>();
  js_profile->Set(Nan::New<String>("title").ToLocalChecked(),
    profile->GetTitle());
  js_profile->Set(Nan::New<String>("topDownRoot").ToLocalChecked(),
    TranslateTimeProfileNode(profile->GetTopDownRoot(), hasLines));
  js_profile->Set(Nan::New<String>("startTime").ToLocalChecked(),
    Nan::New<Number>(profile->GetStartTime()));
  js_profile->Set(Nan::New<String>("endTime").ToLocalChecked(),
    Nan::New<Number>(profile->GetEndTime()));
  return js_profile;
}

NAN_METHOD(StartProfiling) {
  Local<String> name = info[0].As<String>();

  // Sample counts and timestamps are not used, so we do not need to record
  // samples.
  // TODO: Switch to using NODE_10_0_MODULE_VERSION instead of 64 when that
  // constant is defined in nan.
   #if NODE_MODULE_VERSION > 64
  bool includeLineInfo = info[1].As<Boolean>()->BooleanValue();
  if (includeLineInfo) {
    cpuProfiler->StartProfiling(name, CpuProfilingMode::kCallerLineNumbers, false);
  } else {
    cpuProfiler->StartProfiling(name, false);
  }
  #else
  cpuProfiler->StartProfiling(name, false);
  #endif
}

NAN_METHOD(StopProfiling) {
  Local<String> name = info[0].As<String>();
  bool includedLineInfo = info[1].As<Boolean>()->BooleanValue();
  CpuProfile* profile =
    cpuProfiler->StopProfiling(name);
  Local<Value> translated_profile = TranslateTimeProfile(profile, includedLineInfo);
  profile->Delete();
  info.GetReturnValue().Set(translated_profile);
}

NAN_METHOD(SetSamplingInterval) {
#if NODE_MODULE_VERSION > NODE_8_0_MODULE_VERSION
  int us = info[0].As<Integer>()->Value();
#else
  int us = info[0].As<Integer>()->IntegerValue();
#endif
  cpuProfiler->SetSamplingInterval(us);
}

NAN_MODULE_INIT(InitAll) {
  Nan::Set(target, Nan::New("startProfiling").ToLocalChecked(),
    Nan::GetFunction(Nan::New<FunctionTemplate>(StartProfiling)).ToLocalChecked());
  Nan::Set(target, Nan::New("stopProfiling").ToLocalChecked(),
    Nan::GetFunction(Nan::New<FunctionTemplate>(StopProfiling)).ToLocalChecked());
  Nan::Set(target, Nan::New("setSamplingInterval").ToLocalChecked(),
    Nan::GetFunction(Nan::New<FunctionTemplate>(SetSamplingInterval)).ToLocalChecked());
}

NODE_MODULE(time_profiler, InitAll);
