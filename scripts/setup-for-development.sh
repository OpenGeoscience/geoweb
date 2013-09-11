#!/usr/bin/env bash

cd "${BASH_SOURCE%/*}/.." &&
scripts/gitsetup/setup-user && echo &&
scripts/gitsetup/setup-hooks && echo &&
(scripts/gitsetup/setup-ssh ||
 echo 'Failed to setup SSH.  Run this again to retry.') && echo &&
scripts/gitsetup/tips

# Rebase master by default
git config rebase.stat true
git config branch.master.rebase true

echo 'Configuring push url...' &&
git config remote.origin.pushurl git@public.kitware.com:OpenGeoscience/geojs
