#!/bin/bash

CONTAINER_NAME="nodeapp"

if [ -z "$1" ]; then
  echo "Usage: ./bin/yarn.sh <yarn_command>"
  echo "Example: ./bin/yarn.sh install OR ./bin/yarn.sh build"
  exit 1
fi

docker exec -it "$CONTAINER_NAME" yarn "$@"
