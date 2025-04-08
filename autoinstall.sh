#!/bin/bash

INSTALL_DIR="/home/ghostfiles"
REPO_URL="https://github.com/xByMilow/ghostfiles.git"

echo "Starting installation of Ghostfiles..."

if [ -d "$INSTALL_DIR" ]; then
    echo "Removing existing directory $INSTALL_DIR..."
    rm -rf "$INSTALL_DIR"
fi

echo "Creating directory $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"

cd "$INSTALL_DIR" || exit 1

echo "Cloning repository..."
git clone "$REPO_URL" .

echo "Installing dependencies..."
npm install

echo "Starting the server..."
npm start
