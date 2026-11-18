// Almacén compartido con la tarea de Android. Las mutaciones se ordenan para que un borrado
// siempre termine después de cualquier escritura que ya estuviera en curso.
export function crearAlmacenWidget({ leer, guardar, borrar, leerSesion }) {
  let sesionActiva;
  let revision = 0;
  let cola = Promise.resolve();

  const encolar = (operacion) => {
    const resultado = cola.then(operacion);
    cola = resultado.catch(() => {});
    return resultado;
  };

  const establecerSesion = (sesion) => {
    if (sesionActiva === sesion) return;
    sesionActiva = sesion;
    revision += 1;
  };

  return {
    establecerSesion,
    async leer() {
      const inicio = revision;
      if (sesionActiva === null) return null;
      const [sesion, dato] = await Promise.all([leerSesion(), leer()]);
      if (inicio !== revision || !sesion || dato?.sesion !== sesion) return null;
      if (sesionActiva !== undefined && sesion !== sesionActiva) return null;
      return dato;
    },
    guardar(dato, sesion) {
      const inicio = revision;
      return encolar(async () => {
        if (!sesion || sesion !== sesionActiva || inicio !== revision) return null;
        await guardar({ ...dato, sesion });
        return inicio === revision ? dato : null;
      });
    },
    limpiar() {
      // Se invalida antes del primer await, aunque el borrado de SecureStore tarde.
      establecerSesion(null);
      return encolar(borrar);
    },
  };
}
