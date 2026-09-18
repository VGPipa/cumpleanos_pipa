# Cumple de Pipa

Iniciar con `python3 server.py` y abrir http://localhost:3000.

El HTML original está integrado en `public/index.html`, con estilos en `public/styles.css` y lógica en `public/app.js`. Se conservan las preguntas, respuestas y la invitación del archivo recibido.

Las 16 fotos originales están en `Fotos/`. La aplicación usa copias optimizadas en WebP en `public/imagenes/`, siguiendo el número de pregunta y la opción (por ejemplo, `1A.webp`, `1B.webp` y `3.webp`). Las fotos se muestran completas, sin recortes. La invitación está en `public/invitacion-cumpleanos-pipa.png`.

El servidor guarda puntajes, tiempos y asistencia en SQLite (`data/invitados.sqlite3`). El ranking ordena por puntos descendentes y tiempo ascendente. El cronómetro corre desde **Comenzar** hasta pulsar **Continuar** después de la última respuesta.

**Resetear** vuelve al inicio desde cualquier pantalla. **Rehacer el reto** conserva el nombre, crea una partida nueva y mantiene el intento anterior en el ranking. Las partidas abandonadas a mitad no aparecen en el ranking.

Los detalles, la descarga de la invitación, Maps y el ranking se revelan después de responder **Sí** o **Tal vez** a la asistencia. Si se responde **No**, se muestra un agradecimiento y la opción de rehacer.

Localhost sirve para revisar en esta computadora. Para invitados en otros dispositivos se necesita publicar la aplicación con almacenamiento persistente. Esta versión es una dinámica informal, sin autenticación de invitados.
