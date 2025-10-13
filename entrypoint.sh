#!/bin/sh

if [ "$NODE_ENV" = "production" ]; then
  node dist/index.js
else
  yarn serve
fi
