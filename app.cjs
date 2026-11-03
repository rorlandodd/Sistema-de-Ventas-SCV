// Inicio alternativo para paneles que requieren un archivo .js/.cjs.
import('./server/index.mjs').catch(error=>{console.error(error);process.exit(1)});
