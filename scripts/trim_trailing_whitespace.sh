#!/bin/bash

find . -type f \( -name "*.py" -o -name "*.js" \) -exec sed -i '' -E "s/[[:space:]]*$//" {} +
