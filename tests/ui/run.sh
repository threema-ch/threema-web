#!/bin/bash
if [ $# -lt 1 ]; then
    echo "Error: Please specify a browser target argument"
    exit 1
fi

export PATH=$PATH:"$(pwd)/node_modules/.bin/"

browser=$1
shift

concurrently \
    --kill-others \
    -s first \
    --names \"server,test\" \
    "npm run testserver" \
    "ts-node --skip-project -O '{\"target\": \"ES2015\"}' tests/ui/run.ts $browser"
