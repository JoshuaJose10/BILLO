# Project Brief: Sistema de Diseño & Nuevo Tema "Billo Luminal Glow"

## 1. Visión General del Proyecto
**Billo** es una aplicación móvil premium de gestión y registro de finanzas personales diseñada para iPhone (iOS), con soporte nativo en español y moneda en pesos mexicanos (MXN).

El nuevo tema visual evoluciona la interfaz desde una estética monocromática minimalista hacia una experiencia **"Obsidian & Luminal Glow"**, caracterizada por:
- Una base sobria y estructurada en neutros profundos (modo oscuro) y superficies níveas luminosas (modo claro).
- Una **atmósfera lumínica envolvente** con degradados mesh y mallas de luz índigo/violeta/lavanda.
- Acentos cromáticos vivos aplicados de forma semántica y jerarquizada (categorías, estado financiero, tarjetas bancarias y retroalimentación háptica/voz).

---

## 2. Pilares de Diseño y Dirección Visual

### A. Atmósfera Lumínica ("Atmospheric Depth")
- **Modo Oscuro (*Obsidian Glow*):** Fondo base `#0B0B0E` a `#131313` complementado con halos superiores difusos en índigo (`rgba(79, 70, 229, 0.35)`) y violeta (`rgba(124, 58, 237, 0.25)`), generando profundidad sin comprometer la legibilidad ni la sobriedad financiera.
- **Modo Claro (*Opalescent Glow*):** Fondo base `#FAF8FF` con suaves resplandores celestes (`rgba(147, 197, 253, 0.55)`) y lavanda (`rgba(196, 181, 253, 0.45)`), eliminando la frialdad de los grises planos.
- **Transiciones y Modales:** En hojas emergentes (*bottom sheets*), los fondos de la pantalla principal quedan desenfocados (*frosted backdrop blur*) y los paneles interiores integran un leve degradado superior que funde el modal con la atmósfera general.

### B. Sistema Semántico de Color

#### 1. Estados Financieros
- **En meta / Al día (*On track*):** `#10B981` (Esmeralda puro).
- **Límite mensual excedido (*Over limit*):** `#FF453A` (Rojo puro / *Apple system red*), con clara diferenciación visual frente a categorías de gasto.
- **Ingresos registrados:** `#10B981` / `#34C77B` con signos positivos explícitos (`+$600.00`).
- **Gastos ordinarios:** Tipografía monotipo o regular en blanco (`#FFFFFF`) o carbón oscuro (`#111114`) con signo negativo (`-$85.00`).

#### 2. Categorías de Gastos & Micro-dots
- **Transporte & Movilidad:** `#4F7FFF` (Azul eléctrico vibrante).
- **Comida & Bebidas:** `#FF3B69` (Coral cálido vibrante).
- **Gaming & Ocio / Suscripciones:** `#7C3AED` (Púrpura / Lavanda neón).
- **Salud & Bienestar:** `#F472B6` (Rosa vibrante / *Rose pink*).
- **Servicios & Hogar:** `#10B981` / `#00C288` (Menta / Verde esmeralda).
- **Compras & Retail:** `#F59E0B` (Ámbar / Naranja dorado).

> **Regla de Interacción:** 
> - *Chip seleccionado:* Fondo sólido en el color de su categoría + glifo e inscripción en blanco nítido.
> - *Chip no seleccionado:* Superficie neutra (`#F4F4F7` en claro / `#1C1B1F` en oscuro) acompañada por un micro-punto indicador (*micro-dot*) en el tono de la categoría.

#### 3. Tarjetas de Pago y Cartera (*Vivid Mesh Gradient*)
- **Tarjeta Débito:** Gradiente vibrante cian y azul cobalto (`#00A3FF` → `#0066FF`).
- **Tarjeta Crédito Principal:** Gradiente fucsia, magenta y violeta (`#8A2BE2` → `#E01A79`).
- **Saturación refinada:** Calibrada con un brillo contenido y reflexiones de luz especular superior (*bloom* difuso), garantizando contraste AAA sobre datos de numeración (`•••• 4417`) y titular.

---

## 3. Componentes y Patrones UI Específicos

### 1. Barra de Navegación Píldora Flotante (*Floating Pill Navbar*)
- Elemento desacoplado de los bordes del dispositivo con efecto translúcido (*frosted glass*).
- **Pestaña Activa:** Cápsula sólida de máximo contraste (Negro `#111114` en modo claro; Blanco puro `#FFFFFF` en modo oscuro) con texto e icono invertidos.
- **Acción Central `+`:** Botón circular destacado con micro-halo para inserción rápida de gastos o activación de menú radial por pulsación prolongada (*long press*).

### 2. Bottom Sheet de "Nuevo Gasto"
- Cabecera con selector segmentado de alta precisión (*Gasto | Ingreso*) y cierre directo.
- **Modo Teclado:** Teclas numéricas sobre superficies táctiles neutras con retroalimentación lumínica y halo radial suave (*28% en oscuro, 18% en claro*) detrás del monto según la categoría activa.
- **Modo Voz ("Escuchando…"):**
  - Anillos concéntricos de pulso auditivo en coral `#FF3B69` (25% y 12% opacidad).
  - Botón de micrófono central con halo radial y sombra proyectada coral.
  - Visualizador de ondas sonoras dinámico (*waveform*) sincronizado con la transcripción inteligente en tiempo real y detección automática de categoría.

### 3. Tarjetas Asomadas (*Peeking Elements*)
- En la vista de Inicio, la tarjeta principal muestra un apilamiento en perspectiva en el margen derecho (~70% visible con indicador de tarjetas acumuladas `+2`), comunicando tridimensionalidad y fluidez sin saturar el espacio vertical.

---

## 4. Tipografía y Microcopia
- **Familia Tipográfica:** Inter / SF Pro Rounded para números e importes.
- **Tono de Voz:** Minimalista, cercano y profesional. Textos directos en español neutro (*"Hola, Fer"*, *"Gastado este mes"*, *"Próximo cobro"*, *"Confirmar gasto"*).

---

## 5. Próximos Pasos Recomendados
1. Extender este tema atmosférico a las pantallas secundarias restantes (**Reportes analíticos**, **Ajustes de cuenta**, **Historial filtrado de movimientos**).
2. Crear la guía de especificaciones de animación y microinteracciones (*radial menu springs*, *voice pulse timings*).
3. Documentar los tokens CSS / Tailwind tokens del tema para entrega a desarrollo frontend.
