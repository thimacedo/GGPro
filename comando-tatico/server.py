import http.server
import os
import sys

os.chdir(r'C:\Users\THIAGO\Documents\Projetos\ggpro\comando-tatico')

class UTF8Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '': 'application/octet-stream',
    }

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
with http.server.HTTPServer(('', port), UTF8Handler) as httpd:
    print(f'Serving on port {port}')
    httpd.serve_forever()
