# QA: HU-57 — Registro de gastos por voz (RF12)

Fecha: 2026-11-10. Criterio de aceptación: «ochenta pesos en comida» llena monto 80
y Comida; el usuario corrige antes de guardar; sin permiso o sin reconocimiento la
captura manual sigue.

## Qué hace la app

- En **Nuevo gasto** (y al editar un gasto) aparece un botón de micrófono a la
  izquierda de **Confirmar gasto**. Solo aparece si el binario trae el módulo
  nativo de `expo-speech-recognition`: **en Expo Go no se muestra** y la hoja
  funciona igual que antes.
- Al tocarlo pide el permiso de micrófono y de reconocimiento de voz (solo la
  primera vez lo pregunta el sistema). Con permiso, el teclado se cambia por la
  vista de escucha: «Escuchando…», micrófono con anillos de pulso coral,
  transcripción en vivo y botón **Detener**. Con «Reducir movimiento» los anillos
  quedan quietos. Vibra al empezar y al terminar.
- Escucha una frase en español de México (`es-MX`). Termina sola al dejar de
  hablar o al tocar Detener (o el micrófono grande).
- Al terminar **llena** lo que entendió: monto, categoría y, si la nota estaba
  vacía, una nota sugerida (lo que sobra de la frase: «gasté 85 en tacos» → nota
  «Tacos»). **Nunca guarda solo**: el usuario revisa, corrige con el teclado o los
  chips y toca Confirmar. El gasto se guarda con el `POST /gastos` normal.
- Lo que no entendió se queda como estaba y la hoja lo dice debajo del teclado:
  - sin monto → «No entendí el monto, escríbelo.»
  - sin categoría → «No entendí la categoría, elígela.»
  - no se oyó nada → «No te escuché. Intenta de nuevo o escribe el monto.»
- Sin permiso → «Sin permiso de micrófono. Actívalo en Ajustes o escribe el
  monto.» Sin reconocimiento en el teléfono (o sin el idioma) → «El
  reconocimiento de voz no está disponible en este teléfono. Escribe el monto.»
  También hay avisos para sin red y micrófono ocupado. En todos los casos el
  teclado sigue funcionando. El aviso se quita al escribir con el teclado.
- Mientras escucha, Confirmar está desactivado. Cerrar la hoja corta el dictado.
- Lector de pantalla: al terminar anuncia lo que entendió («Monto $80.00, categoría
  Comida. Revisa y confirma el gasto.») o el aviso.
- **Modo visitante (HU-50):** en ese modo Nuevo gasto ya es la hoja «Crea tu
  cuenta para guardar», así que el micrófono no llega a mostrarse. HU-50 aún no
  está en `develop`: revisar este caso cuando se fusionen las dos ramas.

### Qué entiende

- Montos en dígitos («80», «80.50», «$1,200») y en palabras hasta millones
  («ciento cincuenta», «doscientos treinta y cinco», «mil quinientos»), con
  centavos («ochenta y cinco con cincuenta», «80 punto 50», «cien pesos con
  veinte centavos»).
- Categoría por su nombre (también las personalizadas del usuario) o por
  palabras: Comida (comí, restaurante, tacos, súper, café…), Transporte (uber,
  gasolina, camión, taxi…), Entretenimiento (cine, netflix, concierto…), Servicios
  (luz, agua, internet, teléfono…), Salud (farmacia, doctor, médico…) y Otros.
- **Nunca adivina:** con varias cifras y sin «pesos» o «$» que diga cuál es el
  monto («dos tacos ochenta»), con «un» suelto («un café») o con dos categorías
  distintas («comí en el cine») ese campo queda sin llenar.

Código: `mobile/src/utils/voz.js` (interpretación, con pruebas en `npm test`),
`mobile/src/services/reconocimientoVoz.js` (módulo nativo y `useDictado`),
`mobile/src/components/EscuchaVoz.js`, `mobile/src/components/BotonMicrofono.js` y
`mobile/src/screens/NuevoGastoScreen.js`.

## Requisito: development build

`expo-speech-recognition` no viene en Expo Go. Para probar la voz hace falta el
development build de SDK 58 (el módulo y sus permisos ya están en `app.json`
desde HU-23). Si ya tienes un development build de SDK 58 donde **Perfil ›
Laboratorio › Voz** funciona, sirve tal cual. Si no:

```bash
cd mobile
npx eas-cli build --profile development --platform android
npm run start:dev-client
```

En iOS se necesita un development build propio con las credenciales de Apple. En
Android el reconocimiento usa el servicio de Google del teléfono: requiere la app
de Google y, sin el paquete de idioma sin conexión, internet.

## Casos de prueba

| ID | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| VOZ-01 | Expo Go | Abrir la app en Expo Go › + (Nuevo gasto) | No hay botón de micrófono; no hay pantalla roja; el gasto se registra con el teclado como antes |
| VOZ-02 | Aceptación | Development build › + › micrófono › decir «ochenta pesos en comida» | Monto **$80**, chip **Comida** seleccionado, nota vacía. No se guarda hasta tocar Confirmar |
| VOZ-03 | Corregir antes de guardar | Tras VOZ-02, cambiar el monto con el teclado y elegir otra categoría › Confirmar | Se guarda el gasto corregido; aparece en Inicio y Movimientos |
| VOZ-04 | Palabras con centenas | Decir «ciento cincuenta en transporte» | $150 y Transporte |
| VOZ-05 | Centavos | Decir «ochenta y cinco con cincuenta en farmacia» | $85.50 y Salud, nota «Farmacia» |
| VOZ-06 | Nota sugerida | Con la nota vacía, decir «gasté 85 en tacos con mis amigos» | $85, Comida, nota «Tacos con mis amigos». Si ya había nota, no se reemplaza |
| VOZ-07 | Sin monto | Decir «en el cine» | Entretenimiento seleccionado, monto sin cambios y aviso «No entendí el monto, escríbelo.» |
| VOZ-08 | Sin categoría | Decir «doscientos pesos» | $200, categoría sin cambios y aviso «No entendí la categoría, elígela.» |
| VOZ-09 | Ruido | Decir «eh este pues» | Nada cambia; aviso de monto no entendido |
| VOZ-10 | Silencio | Tocar el micrófono y no hablar | Termina solo; «No te escuché…»; teclado de vuelta |
| VOZ-11 | Detener | Empezar a hablar y tocar Detener | Se interpreta lo dicho hasta ese momento |
| VOZ-12 | Permiso negado | Primera vez: negar el permiso de micrófono | Aviso «Sin permiso de micrófono…»; el teclado funciona y el gasto se puede guardar |
| VOZ-13 | Permiso negado después | Quitar el permiso en Ajustes › volver a tocar el micrófono | Mismo aviso, sin pantalla roja |
| VOZ-14 | Sin reconocimiento | Teléfono sin app de Google o sin internet ni idioma sin conexión | Aviso de reconocimiento no disponible o sin conexión; captura manual sigue |
| VOZ-15 | Cerrar la hoja escuchando | Tocar el micrófono › cerrar la hoja con la X | La hoja se cierra; el micrófono deja de escuchar (el indicador del sistema se apaga) |
| VOZ-16 | Confirmar mientras escucha | Tocar el micrófono › intentar Confirmar | Confirmar está desactivado hasta terminar |
| VOZ-17 | Reducir movimiento | Activar «Reducir movimiento» / «Quitar animaciones» › dictar | Anillos quietos, sin pulso |
| VOZ-18 | Temas | Dictar en tema claro y oscuro | Anillos coral, orbe, burbuja y aviso legibles en ambos |
| VOZ-19 | Lector de pantalla | Con TalkBack/VoiceOver: micrófono › dictar | El botón se anuncia «Dictar gasto»; al terminar anuncia monto y categoría o el aviso |
| VOZ-20 | Categoría personalizada | Con una categoría propia (p. ej. «Mascotas»), decir «trescientos de mascotas» | $300 y esa categoría |
| VOZ-21 | Modo visitante (al fusionar HU-50) | Explorar sin cuenta › + | Se abre la invitación a crear cuenta; no hay micrófono ni se pide permiso |

Las reglas del parser (montos, sinónimos, ambigüedades) se prueban en
`npm test` (`src/utils/voz.test.mjs`); en el teléfono basta con los casos de arriba.
