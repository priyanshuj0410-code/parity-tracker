"""Add a comment to a Plane issue in the Parity Tracker project. The token comes from $PLANE_API_TOKEN and is never printed.

    python3 plane_note.py <issue uuid> "<text>"
"""
import html, json, os, sys, urllib.request

issue, text = sys.argv[1], sys.argv[2]
url = f'https://api.plane.so/api/v1/workspaces/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/{issue}/comments/'
req = urllib.request.Request(url, method='POST', data=json.dumps({'comment_html': f'<p>{html.escape(text)}</p>'}).encode(),
                             headers={'X-API-Key': os.environ['PLANE_API_TOKEN'], 'Content-Type': 'application/json', 'User-Agent': 'curl/8.7.1'})
with urllib.request.urlopen(req) as r:
    print('comment', json.loads(r.read() or b'{}').get('id'))
