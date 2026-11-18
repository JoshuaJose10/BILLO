# HU-79: bitácora de la primera tanda en APK

Fecha local: 2026-11-18, America/Mexico_City; horas de las SS entre 02:24 y 02:33.
Archivos nombrados con hora UTC. Las acciones se ejecutaron mediante ADB y las
capturas se abrieron para revisión visual. Se conservan imágenes intermedias;
solo las seleccionadas aquí sustentan los dictámenes del reporte.

## CP-HU71-01 y CP-HU71-02

El usuario registró A/B/C. Se abrió Suscripciones, se revisaron fechas/importes,
se cerró el proceso con `am force-stop`, se reabrió y se volvió a Suscripciones.

- [Totales iniciales: 400/4800/1300](CP-HU71-01/01-datos-registrados-20261118T082451789Z-a30c46.png).
- [Lista: 100 al 20/11, 1200 anual al 22/11, 2400 anual al 20/12](CP-HU71-01/02-lista-fechas-20261118T082516229Z-5b58e5.png).
- [Mismos totales y tres activas tras reabrir](CP-HU71-01/03-tras-reabrir-20261118T082611248Z-77523f.png).

## CP-HU72-01

Se abrió Agregar, se enfocó el buscador y se consultaron spo y SPO. Se ocultó
el teclado para ver resultados; luego se sustituyó por zzzzqa79 y se limpió.
Se cerró el formulario sin guardar.

- [Catálogo antes de buscar](CP-HU72-01/01-catalogo-20261118T082706955Z-4af516.png).
- [SPO: planes Spotify](CP-HU72-01/04-resultados-SPO-20261118T082756816Z-937254.png).
- [spo: mismos planes](CP-HU72-01/05-resultados-spo-20261118T082800589Z-dd7934.png).
- [zzzzqa79: Sin coincidencias](CP-HU72-01/06-sin-coincidencias-20261118T082822309Z-1388df.png).
- [Consulta vacía: catálogo restaurado](CP-HU72-01/07-limpiar-20261118T082825287Z-0f3a57.png).

Las SS 02/03 de esta carpeta muestran entrada de texto con el teclado sobre los
resultados; las SS 04/05 permiten comprobar el filtrado.

## CP-HU72-02

Desde Fecha se eligió Costo, se desplazó la lista para ver los tres registros,
se eligió Frecuencia y se volvió a Fecha. Se observaron las tres selecciones.

- [Costo: C, A, B por aporte mensual](CP-HU72-02/01-orden-costo-20261118T082639326Z-3b795f.png).
- [Frecuencia: una mensual y dos anuales](CP-HU72-02/02-orden-frecuencia-20261118T082700773Z-4c5002.png).
- [Fecha: A, B, C, sin perder registros](CP-HU72-02/03-vuelta-fecha-20261118T082703083Z-e59dde.png).

## CP-HU73-01

Se abrió Inicio con A/B/C activas. A aparece en Próximo cobro por 100 y B en
También esta semana por 1200; C no aparece en la tarjeta semanal.

- [Inicio con ambos cobros próximos sin duplicar](CP-HU73-01/01-inicio-20261118T082538154Z-2829e7.png).

## CP-HU73-02

Para producir el estado sin cobros en siete días, se pausaron A y B, conservando
fechas. Se abrió Inicio; la próxima activa era C, a 32 días, sin tarjeta semanal.
Después se reactivó B y luego A, y se volvió a Inicio para comprobar el regreso.

- [B seleccionada antes de pausar](CP-HU73-02/01-detalle-anual-20261118T083137300Z-45bd47.png).
- [Sin tarjeta semanal; próxima C a 32 días](CP-HU73-02/02-sin-cobros-semanales-20261118T083157760Z-192041.png).
- [A y B pausadas](CP-HU73-02/03-cartera-dos-pausadas-20261118T083200625Z-b97295.png).
- [A y B reactivadas: Próximo y También esta semana restaurados](CP-HU73-02/04-cobros-restaurados-20261118T083325360Z-f74795.png).

## CP-REG-SUS-01

Se compararon Cartera y Reportes de noviembre antes/después de cerrar y reabrir
el proceso. El usuario confirmó que había limpiado los gastos anteriores: la
base esperada de esta tanda es variable 0, fijo 400 y total 400.

- [Reportes cargados: 0/400/400](CP-REG-SUS-01/02-reportes-cargados-20261118T082535109Z-96cf3a.png).
- [Mismos valores tras reabrir](CP-REG-SUS-01/03-reportes-tras-reabrir-20261118T082910565Z-ec29b1.png).

La SS 01 de esta carpeta se tomó inmediatamente al entrar y mostró ceros antes
de terminar la carga; se esperó y se tomó la SS 02 para evaluar el resultado.

## CP-HU75-01

Se abrió A, se pausó y se revisaron Cartera/Inicio/Reportes. Se volvió a Cartera
y se reprodujo la fecha incorrecta; después se cerró y reabrió el proceso para
comprobar persistencia. La variante de A/B pausadas se comparte con CP-HU73-02.
Finalmente se reactivaron B y A, y se comprobaron los totales restaurados.

- [Detalle de A e historial vacío](CP-HU75-01/01-detalle-20261118T083001561Z-4cd3ea.png).
- [Pausa: 300/3600/1200; próximo cobro 20 nov incorrecto](CP-HU75-01/02-pausa-20261118T083015278Z-dd02ae.png).
- [Inicio: próxima activa B a cuatro días](CP-HU75-01/03-inicio-pausada-20261118T083036681Z-4a97fc.png).
- [Reportes con A pausada: 0/300/300](CP-HU75-01/05-reportes-pausada-20261118T083111780Z-a7ef21.png).
- [Fecha incorrecta tras navegar y volver](CP-HU75-01/06-pausa-persistente-20261118T083114491Z-21fb7d.png).
- [A con opción Reactivar; B ya reactivada](CP-HU75-01/07-reactivar-mensual-20261118T083220943Z-fa110b.png).
- [Pausa y fallo de fecha tras cerrar y reabrir el proceso](CP-HU75-01/08-pausa-tras-reabrir-20261118T083243007Z-a191be.png).
- [A/B/C activas: 400/4800/1300 restaurados](CP-HU75-01/09-restauradas-20261118T083246890Z-624d79.png).
- [Reportes restaurados: 0/400/400](CP-HU75-01/10-reportes-restaurados-20261118T083328884Z-7c8578.png).

La SS 04 de esta carpeta corresponde a una navegación que abrió Nuevo gasto;
se cerró sin guardar y se corrigió la navegación. No se usa para evaluar Reportes.
Defecto asociado: [HU79-BUG-01](../bugs/HU79-BUG-01-proximo-cobro-pausada.md).

Aclaración posterior del usuario, 2026-11-18: el defecto ya se corrigió en un
APK más nuevo. Estas SS pertenecen al APK 1.0.1/versionCode 2 probado; se
conservan como antecedente. La reprueba del APK corregido está pendiente y
deberá añadir su identificación y nuevas capturas.
El usuario decidió no repetir este caso en este momento; esa reprueba queda diferida.
