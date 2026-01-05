#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: ./goin.sh <container_name>"
  exit 1
fi

docker exec -it "$1" bash
