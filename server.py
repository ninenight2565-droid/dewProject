import http.server
import json
import os
import sqlite3
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5500
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

class HospitalRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def do_POST(self):
        if self.path == '/api/save':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length)
                payload = json.loads(post_data.decode('utf-8'))

                # 1. Update data.json without BOM
                data_path = os.path.join(BASE_DIR, 'data.json')
                with open(data_path, 'w', encoding='utf-8') as f:
                    json.dump(payload, f, ensure_ascii=False, indent=2)

                # 2. Sync to hospital.db
                db_path = os.path.join(BASE_DIR, 'hospital.db')
                conn = sqlite3.connect(db_path)
                cur = conn.cursor()
                cur.execute('DELETE FROM instructions')
                for k, v in payload.items():
                    cur.execute(
                        'INSERT INTO instructions (id, title, type, text, audio_base64) VALUES (?, ?, ?, ?, ?)',
                        (k, v.get('title', ''), v.get('type', 'tts'), v.get('text', ''), v.get('audioBase64', ''))
                    )
                conn.commit()
                conn.close()

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'ok'}).encode('utf-8'))
                print(f"[SUCCESS] Saved {len(payload)} records to data.json & hospital.db")
                return
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
                print(f"[ERROR] Save failed: {e}")
                return
        self.send_error(404, "Not Found")

if __name__ == '__main__':
    server = http.server.ThreadingHTTPServer(('0.0.0.0', PORT), HospitalRequestHandler)
    print("=" * 60)
    print(f" Hospital System Server Running on Port {PORT}")
    print(f" Local Admin:   http://localhost:{PORT}/admin.html")
    print(f" Local Patient: http://localhost:{PORT}/index.html")
    print(f" Auto-sync:     /api/save enabled (saves directly to data.json & hospital.db)")
    print("=" * 60)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
