# Decisiones técnicas — Billo (app móvil)

## DT-01 · Librerías de UI y gráficas

| Campo | Valor |
|---|---|
| Responsable | Fernando (frontend) |
| Fecha | 2 de octubre de 2026 |
| Estado | Propuesta → pendiente de confirmación de Iker |
| Tarea ClickUp | Investigar y decidir las librerías de UI y gráficas para React Native |

### Contexto

Necesitamos **una sola** librería de componentes y **una sola** de gráficas, para que los tres desarrolladores usen lo mismo y para que Iker diseñe pensando en lo que realmente se puede construir.

**Restricciones del proyecto:**
- App en **Expo** (plantilla blank) y desarrollo con **Expo Go**, sin development build.
- Plataforma objetivo: **Android** (RNF1).
- La app debe mostrar el **gasto agrupado por categoría** (RF8).

---

## 1. Librería de componentes

### Comparativa

| Criterio | React Native Paper | Tamagui |
|---|---|---|
| Compatible con Expo / Expo Go | ✅ Sí, sin configuración extra | ✅ Sí, pero recomienda plugin de Babel y archivo de configuración propio |
| Soporte Android | ✅ Declarado (Android, iOS, Web) | ✅ Declarado (Android, iOS, Web) |
| Mantenimiento | ✅ Activo: 5.15.3 estable (mayo 2026), 6.0 en alpha | ✅ Activo |
| Documentación | ✅ Clara, con ejemplo por componente | ⚠️ Extensa, pero más enfocada a monorepos y web |
| Cambiar colores y tipografía | ✅ Un objeto `theme` (Material Design 3) | ✅ Sistema de *tokens* muy potente, con más curva de aprendizaje |
| Curva de aprendizaje | Baja | Media/alta |
| Probada en Expo Snack | ✅ [enlace Snack Paper] | ✅ [enlace Snack Tamagui] |

### ✅ Decisión: **React Native Paper 5.15.x**

**Justificación:** funciona en Expo Go sin configurar Babel ni Metro, trae listos los componentes que necesitamos (botones, inputs, tarjetas, diálogos, FAB) y se adapta a la identidad de Billo cambiando un solo objeto `theme`. Al seguir Material Design, se ve nativa en Android, que es nuestra plataforma objetivo.

> Usamos la rama estable **5.15.x**. No usamos la **6.0 alpha** por ser pre-release.

**Plan B:** si Paper no cubre algún componente o diseño de Iker, armamos ese componente con `react-native` puro usando los colores del tema. Si el problema fuera general, migramos a **Tamagui**.

---

## 2. Librería de gráficas

### Comparativa

| Criterio | react-native-gifted-charts | react-native-chart-kit | Victory Native (XL) |
|---|---|---|---|
| Renderiza con | `react-native-svg` | `react-native-svg` | Skia (GPU) |
| Compatible con Expo Go | ✅ Sí | ✅ Sí | ⚠️ Requiere Skia + Reanimated + Gesture Handler; varias guías indican que necesita development build |
| Soporte Android | ✅ Declarado | ✅ Declarado | ✅ Declarado |
| Mantenimiento | ✅ Activo, actualizaciones frecuentes | ⚠️ Estable, pero se mueve lento | ✅ Activo (v42) |
| Documentación | ✅ Clara, con ejemplos | ✅ Clara | ⚠️ Buena, pero más técnica |
| Pastel / dona por categoría (RF8) | ✅ `PieChart` con prop `donut` | ✅ `PieChart` | ✅ `Pie` (Polar chart) |
| Personalizar colores y fuentes | ✅ Por props, color por cada dato | ⚠️ Limitado a un `chartConfig` | ✅ Total (canvas Skia) |
| Probada en Expo Snack | ✅ [enlace Snack gifted-charts] | ✅ [enlace Snack chart-kit] | — (descartada por dependencias) |

### ✅ Decisión: **react-native-gifted-charts 1.4.x**

**Justificación:** corre en Expo Go con dependencias que Expo ya incluye (`react-native-svg` y `expo-linear-gradient`). Su `PieChart` en modo dona muestra el gasto por categoría (RF8) con un color por categoría y texto al centro (por ejemplo, el total del mes). Cubre también barras y líneas, por si después piden historial mensual.

**Plan B:** **react-native-chart-kit**, que usa la misma base (`react-native-svg`) y también corre en Expo Go, así que el cambio sería solo en los componentes de gráfica. Victory Native queda reservada por si algún día se necesitan gráficas muy interactivas o con miles de datos.

---

## 3. Versiones e instalación

```bash
cd mobile
npx expo install react-native-paper react-native-safe-area-context
npx expo install react-native-gifted-charts react-native-svg expo-linear-gradient
```

| Paquete | Versión fijada |
|---|---|
| react-native-paper | `5.15.x` ← anotar la exacta del `package.json` |
| react-native-gifted-charts | `1.4.x` ← anotar la exacta del `package.json` |
| react-native-svg | La que indique `npx expo install` |
| expo-linear-gradient | La que indique `npx expo install` |

> Se instalan con `npx expo install` para que Expo elija versiones compatibles con nuestro SDK.

---

## 4. Validaciones

- [x] Ambas librerías declaran soporte para **Android** (RNF1).
- [x] La librería de gráficas muestra **gasto agrupado por categoría** (RF8).
- [x] Ambas probadas en **Expo Snack**.
- [ ] **Iker** confirmó que puede diseñar con estas librerías (#frontend-diseño).
