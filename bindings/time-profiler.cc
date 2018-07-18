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


Local<Value> TranslateTimeProfileNode(const CpuProfileNode* node) {
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
  if (count > 0) {
    Local<Array>  children = Nan::New<Array>(count);
    for (int32_t i = 0; i < count; i++) {
      children->Set(i, TranslateTimeProfileNode(node->GetChild(i)));
    }
    js_node->Set(Nan::New<String>("children").ToLocalChecked(),
    children);
    return js_node;
  }

  unsigned int hitLineCount = node->GetHitLineCount();
  std::vector<CpuProfileNode::LineTick> entries(hitLineCount);

  Local<Array> children;
  unsigned int index = 0;
  if (node->GetLineTicks(&entries[0], hitLineCount)) {
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
  js_node->Set(Nan::New<String>("children").ToLocalChecked(),
    children);
  return js_node;
}

Local<Value> TranslateTimeProfile(const CpuProfile* profile) {
  Local<Object> js_profile = Nan::New<Object>();
  js_profile->Set(Nan::New<String>("title").ToLocalChecked(),
    profile->GetTitle());
  js_profile->Set(Nan::New<String>("topDownRoot").ToLocalChecked(),
    TranslateTimeProfileNode(profile->GetTopDownRoot()));
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
  cpuProfiler->StartProfiling(name, CpuProfilingMode::kCallerLineNumbers, false);
}

NAN_METHOD(StopProfiling) {
  Local<String> name = info[0].As<String>();
  CpuProfile* profile =
    cpuProfiler->StopProfiling(name);
  Local<Value> translated_profile = TranslateTimeProfile(profile);
  profile->Delete();
  info.GetReturnValue().Set(translated_profile);
}

NAN_METHOD(SetSamplingInterval) {
  int us = info[0].As<Integer>()->IntegerValue();
  cpuProfiler->SetSamplingInterval(us);
}

NAN_METHOD(SetIdle) {
  bool is_idle = info[0].As<Boolean>()->BooleanValue();
  cpuProfiler->SetIdle(is_idle);
}

NAN_MODULE_INIT(InitAll) {
  Nan::Set(target, Nan::New("startProfiling").ToLocalChecked(),
    Nan::GetFunction(Nan::New<FunctionTemplate>(StartProfiling)).ToLocalChecked());
  Nan::Set(target, Nan::New("stopProfiling").ToLocalChecked(),
    Nan::GetFunction(Nan::New<FunctionTemplate>(StopProfiling)).ToLocalChecked());
  Nan::Set(target, Nan::New("setSamplingInterval").ToLocalChecked(),
    Nan::GetFunction(Nan::New<FunctionTemplate>(SetSamplingInterval)).ToLocalChecked());
  Nan::Set(target, Nan::New("setIdle").ToLocalChecked(),
    Nan::GetFunction(Nan::New<FunctionTemplate>(SetIdle)).ToLocalChecked());
}

NODE_MODULE(time_profiler, InitAll);
