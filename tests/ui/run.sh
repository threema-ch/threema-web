#!/bin/bash
if [ $# -lt 1 ]; then
    echo "Error: Please specify a browser target argument"
    exit 1
fi

bin_path=node_modules/.bin
browser=$1
shift

$bin_path/concurrently \
    --kill-others \
    -s first \
    --names \"server,test\" \
    "npm run testserver" \
    "$bin_path/testcafe $browser tests/ui/run.ts $*"
