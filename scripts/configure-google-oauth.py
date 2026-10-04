"""Read OAuth secrets from SSH stdin; preserve unrelated production settings."""
import json
import os
from pathlib import Path
import sys
import tempfile

path = Path('/opt/assistants/.env.production')
values = json.load(sys.stdin)
expected = {'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'}
if set(values) != expected:
    raise SystemExit('Expected Google OAuth credentials')
for value in values.values():
    if not isinstance(value, str) or not value or any(c in value for c in '\r\n\x00'):
        raise SystemExit('Missing or invalid Google OAuth credential')
lines = [line for line in path.read_text().splitlines() if line.split('=', 1)[0] not in expected]
for key, value in values.items():
    # Compose dotenv single quotes preserve dollar signs and backslashes.
    if "'" in value:
        raise SystemExit('Unsupported quote in Google OAuth credential')
    lines.append(f"{key}='{value}'")
fd, temporary = tempfile.mkstemp(dir=path.parent, prefix='.oauth-env-')
try:
    with os.fdopen(fd, 'w') as stream:
        stream.write('\n'.join(lines) + '\n')
    os.replace(temporary, path)
finally:
    if os.path.exists(temporary):
        os.unlink(temporary)
print('Google OAuth configuration updated')
