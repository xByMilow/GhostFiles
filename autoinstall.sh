#!/bin/bash

echo "Starting installation of Ghostfiles..."

if [ -d "/home/ghostfiles" ]; then
    echo "Removing existing directory /home/ghostfiles..."
    rm -rf "/home/ghostfiles"
fi

echo "Creating directory /home/ghostfiles..."
mkdir -p "/home/ghostfiles"

cd "/home/ghostfiles" || exit 1

echo "Checking for screen..."
if ! command -v screen &> /dev/null; then
    echo "Installing screen..."
    sudo apt update
    sudo apt install -y screen
else
    echo "screen is already installed."
fi

echo "Cloning repository..."
git clone "https://github.com/xByMilow/ghostfiles.git" .

echo "Installing dependencies..."
npm install

echo "Starting screen session..."
screen -dmS ghostfiles bash -c 'cd /home/ghostfiles && ./start.sh'

echo "Installation complete. Use 'screen -r ghostfiles' to attach."