#!/usr/bin/env bash
# Render build command: install dependencies and collect static files.
# Migrations run in the pre-deploy step (see render.yaml) so a failed
# migration never takes the live service down.
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt
python manage.py collectstatic --no-input
