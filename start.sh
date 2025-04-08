#!/bin/bash

cd /home/ghostfiles || exit 1
screen -dmS ghostfiles npm start
echo "Server started."