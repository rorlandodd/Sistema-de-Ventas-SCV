# Control de ventas 3.02 — Instalación en servidor propio

Esta es una copia independiente. No conecta con el sistema alojado en ChatGPT ni modifica sus datos. Se incluye `database/ventas-vacia.sqlite`, sin cuentas, ventas, productos, tiendas ni fotos. Si se completa la exportación de origen, también se incluye `database/ventas-actual.sqlite`; consulta `ESTADO_DE_LA_COPIA.txt` para saber exactamente qué contiene esta descarga. Se conservan los tres logos de marca como recursos del diseño.

## 1. Lo que necesitas

Elige **una** de estas dos formas:

- **A. Docker**: servidor Linux/VPS con SSH, Docker Engine y Docker Compose. Es la forma más directa; incluye Node.js y el proxy HTTPS.
- **B. Node.js**: servidor con Node.js **24.x**, ejecución permanente de procesos, disco persistente y un proxy web HTTPS.

No funciona cargándolo solamente por FTP en un hosting que solo soporte PHP/MySQL. Si tienes cPanel, pregunta si permite Node.js 24, procesos persistentes y proxy HTTPS. No necesitas contratar MySQL: esta copia usa SQLite.

Instala en la raíz de un dominio o subdominio, por ejemplo `https://ventas.tudominio.cl`. No está configurado para una subcarpeta como `/ventas`.

La aplicación ya viene compilada en `dist/`: **para ejecutarla no necesitas descargar paquetes npm ni recompilar**. Docker sí necesita descargar sus imágenes iniciales.

## 2. Archivos y carpetas

| Archivo/carpeta | Para qué sirve |
|---|---|
| `LEAME.md` / `LEAME.html` | Esta guía; abre el HTML con doble clic para leerla cómodamente. |
| `dist/` | Pantallas y recursos compilados para el navegador. |
| `server/` | Servidor Node, acceso con contraseña y API del sistema. |
| `app/` | Código fuente editable de las pantallas y operaciones. |
| `database/ventas-vacia.sqlite` | Base de datos vacía lista para copiar. |
| `database/schema.sql` | Estructura SQL de la misma base SQLite. |
| `scripts/` | Inicio de base, compilación y respaldo. |
| `.env.example` | Plantilla de conexión/configuración. |
| `Dockerfile`, `compose.yaml`, `Caddyfile` | Instalación con Docker y dominio HTTPS. |
| `docs/` | Ejemplos para servicio Linux y proxy Nginx. |
| `public/brands/` | Logos predeterminados. |
| `tests/` | Pruebas con una base temporal desechable. |
| `PROMPT_RECONSTRUIR.txt` | Especificación para recrear o continuar el sistema. |
| `VALIDACION.txt` | Qué se probó y qué depende de tu servidor. |

`data/` se crea al arrancar; los archivos distribuidos para importación están en `database/`. Contendrá `ventas.sqlite`, archivos temporales SQLite y `uploads/` (fotos, boletas y logos cargados).

## 3. Cómo se conecta la base de datos

La conexión ya está programada. No hay que escribir usuario, contraseña, host ni puerto de base de datos.

1. El servidor lee `DATA_DIR`.
2. Abre el archivo `ventas.sqlite` dentro de esa carpeta.
3. Si no existe, crea las tablas automáticamente desde `database/schema.sql`.
4. Las fotos y boletas se guardan en `DATA_DIR/uploads/`.

**No importes este SQL en phpMyAdmin/MySQL:** es SQLite. Si quieres cargar literalmente el archivo vacío, en la instalación Node ejecuta, antes del primer inicio:

```bash
node --env-file-if-exists=.env scripts/init-db.mjs --vacia
```

El comando copia `database/ventas-vacia.sqlite` a `DATA_DIR/ventas.sqlite`. Se niega a sobrescribir una base existente. También puedes omitirlo: el primer inicio crea una base equivalente.

Con Docker la base se crea dentro del volumen persistente `ventas_data`. No es necesario importar nada manualmente. Los cambios se guardan aunque reinicies el contenedor.

## 4. Instalación A: Docker y dominio propio

### Paso 1: preparar el servidor

Entra por SSH con los datos de tu proveedor. Los comandos siguientes se ejecutan **en el servidor**, salvo donde se indique “en tu computador”.

Comprueba Docker:

```bash
docker --version
docker compose version
```

Si faltan, usa las instrucciones oficiales de tu distribución:
- Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Debian: https://docs.docker.com/engine/install/debian/

Necesitas permiso para ejecutar Docker. Si tu cuenta lo requiere, antepone `sudo` a los comandos `docker` de esta guía.

### Paso 2: subir y descomprimir

Sube el ZIP por SFTP (por ejemplo, con FileZilla) a una carpeta privada de tu servidor. No lo pongas en `public_html`: incluye código y una base de datos.

Descomprímelo. Dentro encontrarás `control-ventas-servidor-actualizado`. Entra a esa carpeta:

```bash
cd /ruta/donde/descomprimiste/control-ventas-servidor-actualizado
ls
cp .env.example .env
```

Debes ver `compose.yaml`, `server`, `database` y `dist`.

### Paso 3: configurar tu dominio

En el panel DNS del dominio, crea un registro **A** para `ventas` que apunte a la IP pública de tu servidor. Si usas un registro AAAA, debe apuntar a un IPv6 que realmente funcione en ese servidor.

Edita `.env`:

```text
APP_URL=https://ventas.tudominio.cl
```

Reemplaza el dominio de la primera línea de `Caddyfile` por el mismo, sin `https://`:

```text
ventas.tudominio.cl {
    encode gzip zstd
    reverse_proxy app:3000
}
```

Abre los puertos TCP **80 y 443** en el firewall del proveedor y del servidor. Caddy usará el dominio para obtener y renovar HTTPS. No hace falta abrir el puerto 3000 al público: está ligado a 127.0.0.1.

Si ya hay Apache, Nginx u otro sitio ocupando los puertos 80/443, no lo detengas sin revisar sus sitios. En ese caso inicia solo `app` y configura tu proxy existente para enviar el dominio a `127.0.0.1:3000` (ejemplo en `docs/nginx.conf`).

### Paso 4: arrancar

Con los puertos libres y Caddy incluido:

```bash
docker compose --profile dominio up -d --build
docker compose ps
docker compose logs --tail=50 app caddy
```

Si ya tienes proxy HTTPS propio:

```bash
docker compose up -d --build app
```

La primera descarga de imágenes requiere internet. Las siguientes ejecuciones usan la copia local.

### Paso 5: obtener el código de instalación

```bash
docker compose exec app cat /app/data/codigo-instalacion.txt
```

Copia ese código. Solo se usa para crear el primer administrador, evitando que otra persona lo cree antes que tú. No es tu contraseña de acceso.

### Paso 6: crear el administrador

Abre en tu navegador `https://ventas.tudominio.cl`. Verás **Crear administrador**.

Completa:
1. Código de instalación del paso anterior.
2. Usuario: 3–40 caracteres; letras, números, guion, punto o guion bajo.
3. Correo electrónico.
4. Contraseña de al menos 12 caracteres.
5. Repetir la misma contraseña.

Pulsa **Crear administrador**. Si las contraseñas no coinciden, no se crea la cuenta. Después aparecerá **Iniciar sesión**: ingresa el usuario y la contraseña elegidos.

Una vez creado el administrador, el formulario de instalación queda bloqueado y el archivo del código se elimina. No existe usuario ni contraseña predeterminado.

### Paso 7: configurar el negocio

- En **Ajustes**, cambia el nombre y logo de la empresa.
- En **Usuarios**, completa nombre comercial, teléfono, correo y cargo para la firma.
- En **Marcas**, carga logos si quieres reemplazar los incluidos.
- Guarda los ajustes.
- Crea tu primera tienda y selecciónala.
- Agrega productos, fija metas y empieza a registrar ventas.

El correo del administrador se guarda como dato de la cuenta. No se envía un correo de verificación ni se configura SMTP automáticamente.

## 5. Instalación B: Node.js sin Docker

### Paso 1: disponer de Node.js 24

Instala Node.js 24.x usando los paquetes oficiales o el método de tu proveedor. Comprueba:

```bash
node --version
```

Debe indicar `v24...`. El servidor utiliza `node:sqlite`, incluido en esa versión.

### Paso 2: colocar la carpeta

Descomprime la descarga en `/opt/control-ventas` (el contenido de la carpeta principal debe quedar directamente allí). Mantén los archivos fuera de la raíz pública de Apache/Nginx.

Ejemplo con un usuario de servicio dedicado en Linux:

```bash
sudo useradd --system --home /opt/control-ventas --shell /usr/sbin/nologin ventas
sudo chown -R ventas:ventas /opt/control-ventas
cd /opt/control-ventas
sudo -u ventas cp .env.example .env
```

Si el usuario `ventas` ya existe, omite su creación. Si usas otra ruta o usuario, reemplázalos también en el archivo de servicio.

### Paso 3: configurar el dominio y la base

Edita `/opt/control-ventas/.env`:

```text
APP_URL=https://ventas.tudominio.cl
PORT=3000
HOST=127.0.0.1
DATA_DIR=/opt/control-ventas/data
```

`DATA_DIR` debe ser una carpeta persistente donde el usuario del servicio pueda escribir. No uses un disco temporal ni una carpeta servida por HTTP.

Opcionalmente carga el archivo vacío:

```bash
sudo -u ventas node --env-file-if-exists=.env scripts/init-db.mjs --vacia
```

Para arrancar manualmente y comprobar errores:

```bash
sudo -u ventas node --env-file-if-exists=.env server/index.mjs
```

Se queda ejecutándose; Ctrl+C lo detiene. No hay que ejecutar `npm install` para usar la versión compilada.

### Paso 4: mantenerlo funcionando con systemd

Abre `docs/control-ventas.service`. Revisa `User`, `Group`, `WorkingDirectory`, `EnvironmentFile` y la ruta de `ExecStart`. Para saber la ruta de Node, ejecuta `command -v node` y úsala en `ExecStart` si es diferente de `/usr/bin/node`.

```bash
sudo cp docs/control-ventas.service /etc/systemd/system/control-ventas.service
sudo systemctl daemon-reload
sudo systemctl enable --now control-ventas
sudo systemctl status control-ventas
```

Ver errores:

```bash
sudo journalctl -u control-ventas -n 60 --no-pager
```

### Paso 5: conectar el servidor web

Configura el DNS del subdominio hacia tu servidor y obtén un certificado HTTPS mediante tu proveedor, Caddy o Nginx con su herramienta de certificados.

Si usas Caddy instalado directamente en el servidor, el bloque es:

```text
ventas.tudominio.cl {
    reverse_proxy 127.0.0.1:3000
}
```

No uses `app:3000` fuera de Docker; ese nombre pertenece a la red de contenedores. Si usas Nginx, adapta `docs/nginx.conf` dentro del bloque HTTPS de tu dominio.

### Paso 6: crear el administrador

```bash
sudo cat /opt/control-ventas/data/codigo-instalacion.txt
```

Abre el dominio HTTPS y completa el formulario como se explica en los pasos 5 y 6 de Docker. El mismo flujo sirve para ambas instalaciones.

## 6. Probar en tu computador antes de subirlo

Con Node.js 24 instalado, abre una terminal dentro de la carpeta descargada:

```bash
cp .env.example .env
npm start
```

En Windows puedes copiar `.env.example` y renombrar la copia a `.env` desde el explorador. Abre **exactamente** `http://localhost:3000`, busca el código en `data/codigo-instalacion.txt` y crea el administrador.

No subas después esa carpeta `data/` si quieres que la instalación del servidor también empiece vacía. Usa de nuevo el ZIP original. `APP_URL` debe coincidir con la dirección real del navegador, incluido puerto y HTTPS.

## 7. Usuarios y sesiones

- **Cuentas de acceso** aparece para administradores. Permite agregar administradores o vendedores, desactivar cuentas y restablecer contraseñas.
- Un vendedor puede trabajar con las ventas y el catálogo compartidos, pero no administrar cuentas ni guardar los ajustes globales.
- **Ajustes → Usuarios** contiene perfiles comerciales para firmas. Agregar solo un perfil no crea una contraseña: crea la cuenta en **Cuentas de acceso**. El administrador administra empresa, marcas, reglas y cuentas. El usuario normal puede realizar operaciones comerciales y personalizar su apariencia, navegación y su propia firma, pero no modificar la configuración compartida ni crear cuentas.
- Las contraseñas se guardan con hash scrypt y sal aleatoria; no en texto legible.
- La sesión usa una cookie HttpOnly/SameSite, Secure en HTTPS, y una clave temporal que solo vive en la memoria de la pestaña. Al abrir otra pestaña o recargar el sistema debes ingresar de nuevo. No hay “recordarme”; además, la sesión vence a las 8 horas. Cerrar sesión revoca el acceso inmediatamente. Las imágenes pueden usar la cookie durante la sesión para mostrarse en las fichas.
- No hay recuperación automática por correo. Otro administrador puede restablecer la contraseña. Conserva un acceso administrativo de respaldo bajo tu control.

## 8. Respaldo y restauración

La base y las imágenes forman una unidad: respalda ambas. No copies únicamente `ventas.sqlite` mientras el servidor escribe; SQLite puede tener cambios pendientes en archivos `-wal`.

**Node directo:**

```bash
npm run backup
```

Crea `backups/respaldo-FECHA/` con una copia coherente de la base y `uploads/`.

**Docker:**

```bash
docker compose exec app node scripts/backup.mjs /app/backups/respaldo-manual
docker compose cp app:/app/backups/respaldo-manual ./respaldo-manual
```

Para repetir, usa otro nombre. Guarda los respaldos fuera del servidor; incluyen datos y hashes de cuentas.

Para restaurar, detén el servicio, conserva una copia del directorio de datos actual y coloca el archivo `ventas.sqlite` del respaldo y su carpeta `uploads` en una **carpeta de datos vacía**. No mezcles el respaldo con archivos `ventas.sqlite-wal` o `ventas.sqlite-shm` antiguos. Restablece el propietario y arranca el servicio.

En Docker puedes copiar a un contenedor auxiliar con el volumen montado:

```bash
docker compose stop app
docker compose run --rm --user root -v "$(pwd)/respaldo-manual:/restore:ro" app sh -c 'test ! -e /app/data/ventas.sqlite || exit 1; cp /restore/ventas.sqlite /app/data/ventas.sqlite; if test -d /restore/uploads; then cp -R /restore/uploads /app/data/uploads; fi; chown -R node:node /app/data'
docker compose start app
```

Ese comando exige que el volumen de destino esté vacío; se detiene si ya tiene una base. Para una restauración sobre una instalación existente, pide a tu administrador que conserve y retire sus datos previos antes de copiar. No ejecutes `docker compose down -v`: elimina los volúmenes y sus datos.

## 9. Actualizar o cambiar el código

La carpeta `app/` contiene el código fuente. Para reconstruir la interfaz y las rutas necesitas internet y las dependencias de desarrollo:

```bash
npm install
npm run build
npm test
```

Las versiones directas están fijadas en `package.json`. Si mantienes cambios propios, conserva también el `package-lock.json` generado por tu instalación y usa `npm ci` en futuras compilaciones.

Después de compilar, reinicia el servicio. Con Docker, reconstruye con `docker compose --profile dominio up -d --build`. Conserva siempre los volúmenes o `data/` y realiza un respaldo antes de actualizar.

## 10. Problemas frecuentes

- **Origen no válido**: `APP_URL` no coincide con la dirección desde la que entras. Corrígela y reinicia. No alternes `www`, IP y subdominio.
- **No aparece Crear administrador**: la base ya contiene una instalación. Usa un directorio o volumen nuevo para otra instalación vacía; no borres la base del negocio para resolver un acceso.
- **Código no encontrado**: primero arranca la aplicación. Después de crear el administrador el código desaparece intencionalmente.
- **Permission denied / SQLITE_CANTOPEN**: el proceso no puede escribir en `DATA_DIR`. Revisa propietario, ruta y espacio libre.
- **Error de `node:sqlite`**: comprueba que estás usando Node.js 24.x.
- **No carga HTTPS**: revisa DNS, puertos 80/443 y que no haya otro proxy ocupándolos. Consulta los logs de Caddy.
- **Error 413 al subir fotos**: máximo 5 MB por foto y 6 MB por petición; ajusta el límite de tu proxy a 6 MB o más.
- **WhatsApp no adjunta automáticamente**: la función depende del menú de compartir del navegador/dispositivo. La ficha ofrece descargar el PDF y abrir el mensaje para adjuntarlo manualmente. El correo se abre con asunto y firma; adjunta el PDF descargado.
- **La letra se ve diferente sin internet**: el diseño pide DM Sans a Google Fonts y usa Arial como alternativa. La gestión de ventas funciona sin esa fuente.

## 11. Referencias y alcance de las pruebas

- Docker: https://docs.docker.com/engine/install/
- Node.js / SQLite: https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html
- Caddy / HTTPS: https://caddyserver.com/docs/automatic-https

Se probó el servidor con Node.js 24.22.1, SQLite temporal y solicitudes HTTP reales; se verificaron instalación, acceso, ventas, imágenes, roles y reinicio. El despliegue Docker y el DNS/HTTPS de tu servidor no se ejecutaron en este entorno. Consulta `VALIDACION.txt`.


## 16. Elección de base de datos y migración de los datos actuales

Lee primero `ESTADO_DE_LA_COPIA.txt`. No confundas una base vacía con una copia de tus registros.

- `INITIAL_DATABASE=vacia`: al arrancar por primera vez copia la base vacía.
- `INITIAL_DATABASE=actual`: si existe `database/ventas-actual.sqlite`, al arrancar por primera vez copia esa base y `database/uploads/`. Si ese archivo no está incluido, el sistema inicia vacío; el estado de la copia lo indica expresamente.
- Si `DATA_DIR/ventas.sqlite` ya existe, nunca se reemplaza automáticamente. Cambiar INITIAL_DATABASE después del primer arranque no borra ni cambia esa base.
- No se distribuyen contraseñas ni sesiones del sistema alojado. Incluso al cargar datos históricos, primero debes crear tu propio administrador.

### Importar un JSON exportado del sistema en línea

1. En el sistema original, entra en Ajustes → Datos → Exportar datos JSON.
2. Copia el archivo descargado a una carpeta privada del servidor nuevo.
3. Antes del primer arranque y con el servidor detenido, configura DATA_DIR en `.env` para una carpeta nueva.
4. Ejecuta:

```bash
node --env-file-if-exists=.env scripts/import-json.mjs /ruta/control-ventas-datos.json
```

5. Inicia el servidor y crea el administrador.
6. El JSON conserva registros activos y enlaces de fotos; **no contiene los archivos de fotos**. Consulta `data/archivos-por-copiar.json` y vuelve a cargar las imágenes que falten. Esta ruta no incluye productos archivados ni ventas eliminadas del sistema original.

El importador se niega a sobrescribir una base existente. Para conservar una instalación anterior, realiza primero un respaldo y usa otra carpeta DATA_DIR.

## 17. cPanel / Plesk / CloudLinux con Node.js

Este método depende de que el proveedor ofrezca Node.js **24.x**, acceso a disco persistente y soporte para módulos ECMAScript y `node:sqlite`. Un plan PHP/MySQL no ejecuta este servidor.

1. Comprueba en Terminal: `node --version` y `node -e "require('node:sqlite')"`. La versión debe empezar por v24.
2. Sube y descomprime la carpeta fuera de `public_html`.
3. En el administrador de aplicaciones Node, crea la aplicación en la raíz de un subdominio HTTPS.
4. Selecciona modo Production, raíz de la aplicación = carpeta del sistema y archivo de inicio = `app.cjs` (o `server/index.mjs` si el panel lo acepta).
5. Añade las variables `APP_URL=https://ventas.tudominio.cl`, `NODE_ENV=production`, `DATA_DIR=/ruta/privada/ventas-data` e `INITIAL_DATABASE=vacia` o `actual`.
6. Permite a la cuenta de la aplicación escribir en DATA_DIR. No des permisos 777.
7. Reinicia la aplicación desde el panel. Passenger puede gestionar el puerto de forma automática; no expongas un puerto adicional sin indicación del proveedor.
8. Abre el subdominio, consulta `DATA_DIR/codigo-instalacion.txt` por SFTP/Terminal y crea el administrador.
9. Comprueba una venta de prueba, vuelve a entrar y verifica que se conserva. Elimina la prueba desde el sistema si lo deseas.

Si solo hay Node 18/20/22, solicita un runtime compatible o utiliza la instalación Docker en un VPS. No cambies solamente el número de versión en package.json: el servidor usa funciones nativas de Node 24.

Los nombres y las pantallas del panel varían por proveedor. Esta guía contiene el procedimiento y los valores del paquete; la publicación en tu cuenta requiere configurar el dominio y los permisos de tu proveedor.

## 18. Windows Server con proceso permanente

Para probar en tu PC Windows, instala Node.js 24.x, descomprime la carpeta y abre `INICIAR_WINDOWS.bat`. Entra en `http://localhost:3000`. Si cierras la consola, el servidor se detiene.

Para un servidor Windows permanente:

1. Copia la carpeta a `C:\ControlVentas` y prepara `.env` con APP_URL HTTPS y DATA_DIR privado.
2. Ejecuta una vez `node --env-file-if-exists=.env server/index.mjs` desde esa carpeta para comprobar la configuración y luego detén con Ctrl+C.
3. En Programador de tareas, crea una tarea que se ejecute al iniciar Windows bajo una cuenta de servicio con permisos sobre DATA_DIR.
4. Programa = ruta completa a `node.exe`; argumentos = `--env-file-if-exists=.env server/index.mjs`; iniciar en = `C:\ControlVentas`.
5. Configura reinicio ante errores y que no se detenga por tiempo de ejecución. No uses una cuenta sin permisos sobre la carpeta privada.
6. Utiliza un proxy HTTPS ya administrado por tu proveedor para enviar el subdominio a `127.0.0.1:3000`. Si no hay proxy, puedes usar Caddy con el ejemplo siguiente, sustituyendo el dominio:

```text
ventas.tudominio.cl {
    encode gzip
    reverse_proxy 127.0.0.1:3000
}
```

7. Abre únicamente los puertos públicos requeridos para HTTPS/HTTP según tu configuración. El puerto interno 3000 permanece en la interfaz local.
8. Crea el administrador y las cuentas normales desde la aplicación.

Los ejemplos Docker y systemd corresponden a Linux; no ejecutes esos comandos directamente en PowerShell. Los certificados y el arranque de tu proxy deben gestionarse con el procedimiento de tu servidor.

## 19. Comprobación final

- Crear administrador exige usuario, correo, contraseña repetida y código de instalación.
- Tras crear el administrador, la instalación inicial se bloquea.
- Cada apertura/recarga muestra acceso; las credenciales de otra aplicación no sirven.
- Un usuario normal no puede consultar `/api/accounts` ni cambiar la empresa o las reglas compartidas.
- Los filtros, vistas guardadas, jerarquías y PDF funcionan sobre la base local.
- Fotos y boletas requieren una sesión autorizada y permanecen en uploads.
- Reiniciar el proceso conserva los registros.
- `database/`, `.env` y `data/` no son archivos públicos del sitio.
- El servidor no debe usar discos efímeros ni varias réplicas escribiendo simultáneamente archivos SQLite independientes. Para varios procesos, usa una arquitectura de base de datos apropiada; esta descarga está preparada para una instancia con almacenamiento persistente.

## 20. Fuentes oficiales y alcance de las pruebas

- Node.js 24 y SQLite nativo: https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html
- Instalación de Docker Compose: https://docs.docker.com/compose/install/
- Aplicaciones Node en cPanel: https://docs.cpanel.net/knowledge-base/web-services/how-to-install-a-node.js-application/

Se probaron las rutas de instalación inicial, inicio/cierre de sesión, petición de credenciales al recargar, roles, guardado de ventas, imágenes, persistencia y ajustes contra SQLite temporal. Los ejemplos de Docker, systemd, Windows y paneles son configuraciones incluidas para tu servidor; no equivalen a una prueba en tu proveedor, dominio, firewall o certificado.
