#!/bin/bash
# Copyright 2018 Google Inc. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Fail on any error.
set -e pipefail

# Display commands
set -x

case $KOKORO_JOB_TYPE in
  CONTINUOUS_GITHUB)
    BUILD_TYPE=continuous
    ;;
  PRESUBMIT_GITHUB)
    BUILD_TYPE=presubmit
    ;;
  RELEASE)
    BUILD_TYPE=release
    ;;
  *)
    echo "Unknown build type: ${KOKORO_JOB_TYPE}"
    exit 1
    ;;
esac

cd $(dirname $0)/..
base_dir=$(pwd)

chmod 755 "${base_dir}/prebuild_binaries/build_scripts/build.sh"

docker build -t kokoro-image prebuild_binaries/native
docker run -v /var/run/docker.sock:/var/run/docker.sock -v $base_dir:$base_dir kokoro-image $base_dir/prebuild_binaries/build_scripts/build.sh

# Upload the agent binaries to GCS
SERVICE_KEY="${KOKORO_KEYSTORE_DIR}/72935_cloud-profiler-e2e-service-account-key"

if [ "${BUILD_TYPE}" = "release" ]; then 
  GCS_LOCATION="cprof-e2e-artifacts/nodejs/kokoro/${BUILD_TYPE}"
else
  GCS_LOCATION="cprof-e2e-artifacts/nodejs/kokoro/${BUILD_TYPE}/${KOKORO_BUILD_NUMBER}"
fi

gcloud auth activate-service-account --key-file="${SERVICE_KEY}"
gsutil cp -r "${base_dir}/artifacts/." "gs://${GCS_LOCATION}/"

# Test the agent
export BINARY_HOST="https://storage.googleapis.com/cloud-profiler-e2e/${GCS_LOCATION}"


chmod 755 "${base_dir}/testing/integration_test.sh"
sh $base_dir/testing/integration_test.sh

echo $BUILD_TYPE
echo $AGENT_VERSION
echo $GCS_LOCATION
echo $BINARY_HOST