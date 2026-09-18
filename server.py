from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import json, sqlite3, time, uuid, os

ROOT = Path(__file__).parent
DB = Path(os.environ.get('PIPA_DB', str(ROOT / 'data' / 'invitados.sqlite3')))
DB.parent.mkdir(parents=True, exist_ok=True)
with sqlite3.connect(DB) as db:
    db.execute('CREATE TABLE IF NOT EXISTS invitados (id TEXT PRIMARY KEY, nombre TEXT, inicio INTEGER, puntaje INTEGER, tiempo INTEGER, asistencia TEXT)')
CORRECTAS = ['B','B','B','A','B','B','B','B','A']

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / 'public'), **kwargs)
    def end_headers(self):
        if not self.path.startswith('/api/'):
            self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def send_head(self):
        # No reutilizar HTML o estilos anteriores al revisar cambios locales.
        if 'If-Modified-Since' in self.headers:
            del self.headers['If-Modified-Since']
        return super().send_head()
    def json(self, value, status=200):
        data = json.dumps(value, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(data)
    def do_GET(self):
        if self.path == '/api/ranking':
            with sqlite3.connect(DB) as db:
                db.row_factory = sqlite3.Row
                rows = db.execute('SELECT id,nombre,puntaje,tiempo FROM invitados WHERE puntaje IS NOT NULL ORDER BY puntaje DESC, tiempo ASC, inicio ASC').fetchall()
            return self.json([dict(row) for row in rows])
        if self.path.startswith('/api/'):
            return self.json({'error':'No encontrado'},404)
        return super().do_GET()
    def do_POST(self):
        try:
            size = int(self.headers.get('Content-Length',0))
            if size < 1 or size > 8192: return self.json({'error':'Solicitud inválida'},400)
            data = json.loads(self.rfile.read(size))
            with sqlite3.connect(DB) as db:
                if self.path == '/api/iniciar':
                    nombre = data.get('nombre','').strip()
                    if not nombre or len(nombre)>60: return self.json({'error':'Nombre inválido'},400)
                    ident = str(uuid.uuid4())
                    db.execute('INSERT INTO invitados (id,nombre,inicio) VALUES (?,?,?)',(ident,nombre,int(time.time()*1000)))
                    return self.json({'id':ident})
                row = db.execute('SELECT inicio,puntaje FROM invitados WHERE id=?',(data.get('id'),)).fetchone()
                if not row: return self.json({'error':'Sesión no encontrada'},404)
                if self.path == '/api/resultado':
                    answers = data.get('respuestas')
                    if not isinstance(answers,list) or len(answers)!=10 or any(not isinstance(a,list) or not a or len(set(a))!=len(a) or any(v not in ['A','B'] for v in a) for a in answers) or any(len(a)!=1 for a in answers[:9]):
                        return self.json({'error':'Respuestas inválidas'},400)
                    score = sum(10 for a,c in zip(answers[:9],CORRECTAS) if a==[c]) + len(answers[9])*5
                    if row[1] is None:
                        db.execute('UPDATE invitados SET puntaje=?,tiempo=? WHERE id=?',(score,max(0,int(time.time()*1000)-row[0]),data['id']))
                    return self.json({'ok':True})
                if self.path == '/api/asistencia':
                    respuesta = data.get('asistencia')
                    if respuesta not in ['Sí','No','Tal vez'] or row[1] is None: return self.json({'error':'Completa el cuestionario primero'},400)
                    db.execute('UPDATE invitados SET asistencia=? WHERE id=?',(respuesta,data['id']))
                    return self.json({'ok':True})
                return self.json({'error':'No encontrado'},404)
        except (ValueError,TypeError,AttributeError):
            return self.json({'error':'Solicitud inválida'},400)

if __name__ == '__main__':
    port = int(os.environ.get('PORT','3000'))
    print(f'Cumple de Pipa: http://localhost:{port}', flush=True)
    ThreadingHTTPServer(('127.0.0.1',port),Handler).serve_forever()
