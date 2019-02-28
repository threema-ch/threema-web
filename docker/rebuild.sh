#!/bin/bash
#
# Rebuild and publish all docker images.
# Use the --dry-run argument to prevent the actual build process from running.
#
# Note: This script should not be triggered manually. Only run it in CI.
#
# Required env variables:
#
# - `DOCKER_USER`
# - `DOCKER_API_KEY`

set -euo pipefail

SUPPORTED_BRANCH_NAMES=("master")
SUPPORTED_TAG_PATTERNS=("^v2.1.\([89]\|1[0-9]\)$")
IMAGE_NAME=threema/threema-web

if [ "${1:-}" = "--dry-run" ]; then
    echo -e "Dry run\n"
    DOCKER='echo > docker'
else
    DOCKER="docker"
fi

echo "Logging in..."
$DOCKER login -u $DOCKER_USER -p $DOCKER_API_KEY

echo "Create temporary directory..."
mkdir -p builds

echo -e "\nBuilding branches:"
for branch in $SUPPORTED_BRANCH_NAMES; do
    echo -e "\n- $branch"
    git clone -b $branch . "builds/$branch"
    cd "builds/$branch"
    $DOCKER build . --no-cache -t $IMAGE_NAME:$branch
    $DOCKER push $IMAGE_NAME:$branch
    cd ../..
    rm -rf "builds/$branch"
done

echo -e "\nBuilding tags:"
for pattern in $SUPPORTED_TAG_PATTERNS; do
    for tag in $(git tag | grep $pattern); do
        echo -e "\n- $tag"
        git clone -b $tag . "builds/$tag"
        cd "builds/$tag"
        maintag=$tag
        minortag=$(echo $tag | sed 's/^\(v[0-9]*\.[0-9]*\)\..*$/\1/')
        majortag=$(echo $tag | sed 's/^\(v[0-9]*\)\..*$/\1/')
        $DOCKER build . --no-cache -t $IMAGE_NAME:$tag -t $IMAGE_NAME:$minortag -t $IMAGE_NAME:$majortag
        $DOCKER push $IMAGE_NAME:$tag
        $DOCKER push $IMAGE_NAME:$minortag
        $DOCKER push $IMAGE_NAME:$majortag
        cd ../..
        rm -rf "builds/$tag"
    done
done
