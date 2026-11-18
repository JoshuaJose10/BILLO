// Sin Fragments: la librería no los soporta.
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { MONEDA } from '../utils/formato';
import { TEXTO_SIN_DATOS } from '../utils/widgetResumen';
import { etiqueta, pastilla, titulo } from './estilos';
import {
  ALTO,
  esMediano,
  FUENTE_BOTON,
  FUENTE_CHIP,
  GAP,
  medidasMediano,
  medidasPequeno,
} from './medidas';
import { abrirHoja, Acciones, Icono, Logo, Mic, Tarjeta } from './piezas';

// Qué cabe (texto de botones, chips, categorías, cobro) lo decide widget/medidas: en botones y
// chips nunca hay «…»; si no cabe, se simplifica o se oculta.

// «Saldo disponible» con los centavos y MXN chicos, o «Abre Billo para ver tu saldo».
function Saldo({ colors, vista, tamano }) {
  const saldo = vista?.saldo;
  return (
    <FlexWidget style={{ width: 'match_parent' }}>
      <TextWidget text="Saldo disponible" style={etiqueta(colors, FUENTE_CHIP)} />
      {saldo ? (
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <TextWidget text={saldo.entero} maxLines={1} style={titulo(colors, tamano)} />
          <TextWidget text={saldo.centavos} style={etiqueta(colors, tamano * 0.55)} />
          <TextWidget text={` ${MONEDA}`} style={etiqueta(colors, FUENTE_CHIP)} />
        </FlexWidget>
      ) : (
        <TextWidget text={TEXTO_SIN_DATOS} maxLines={2} truncate="END" style={titulo(colors, 13)} />
      )}
    </FlexWidget>
  );
}

// «↗ +$X este mes» ('completo') o «↗ +$X» ('corto'): ingresos del mes, como TarjetaSaldo.
function Chip({ colors, ingresos, modo }) {
  if (!modo) return null;
  return (
    <FlexWidget style={pastilla(colors.exitoSuave)}>
      <Icono nombre="tendencia" color={colors.exitoTexto} lado={12} />
      <TextWidget
        text={modo === 'completo' ? `${ingresos} este mes` : ingresos}
        maxLines={1}
        style={{ fontSize: FUENTE_CHIP, color: colors.exitoTexto }}
      />
    </FlexWidget>
  );
}

// Pastilla con punto de color: categoría (texto completo, ya medido) o próximo cobro (`monto`; el
// nombre del servicio sí puede recortarse para que el monto siempre se lea).
function Pastilla({ colors, punto, texto, monto, extra }) {
  return (
    <FlexWidget style={pastilla(colors.surfaceHigh, extra)}>
      <FlexWidget style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: punto }} />
      <TextWidget
        text={texto}
        maxLines={1}
        {...(monto ? { truncate: 'END' } : null)}
        style={{ ...etiqueta(colors, FUENTE_CHIP), ...(monto ? { flex: 1 } : null) }}
      />
      {monto ? <TextWidget text={monto} maxLines={1} style={titulo(colors, FUENTE_CHIP)} /> : null}
    </FlexWidget>
  );
}

// 2×2: logo, saldo, chip del mes y Gasto / Ingreso / Voz (solo íconos si los textos no caben).
function Pequeno({ colors, vista, ancho, alto }) {
  const m = medidasPequeno({ ancho, alto, ingresos: vista?.ingresos });
  return (
    <Tarjeta
      colors={colors}
      clic={{ clickAction: 'OPEN_APP' }}
      style={{ justifyContent: 'space-between' }}
    >
      <Logo colors={colors} />
      <Saldo colors={colors} vista={vista} tamano={26} />
      <Chip colors={colors} ingresos={vista?.ingresos} modo={m.chip} />
      <Acciones colors={colors} acciones={['gasto', 'ingreso', 'voz']} conTexto={m.textoBotones} />
    </Tarjeta>
  );
}

// 4×2: izquierda (~58%) saldo, chip y las categorías que caben; derecha (~42%), tras una línea
// fina, «Dictar gasto» (o solo «Voz»), Gasto e Ingreso apilados y el próximo cobro si hay alto.
function Mediano({ colors, oscuro, vista, ancho, alto }) {
  const m = medidasMediano({
    ancho,
    alto,
    ingresos: vista?.ingresos,
    categorias: (vista?.categorias ?? []).map((c) => c.nombre),
    cobro: vista?.cobro,
  });
  const columna = { height: 'match_parent', justifyContent: 'space-between' };
  return (
    <Tarjeta colors={colors} clic={{ clickAction: 'OPEN_APP' }} style={{ flexDirection: 'row' }}>
      <FlexWidget style={{ ...columna, width: m.izquierda }}>
        <Logo colors={colors} />
        <Saldo colors={colors} vista={vista} tamano={30} />
        <Chip colors={colors} ingresos={vista?.ingresos} modo={m.chip} />
        {m.categorias.length ? (
          <FlexWidget style={{ flexDirection: 'row', flexGap: GAP }}>
            {vista.categorias.slice(0, m.categorias.length).map((c) => (
              <Pastilla
                key={c.nombre}
                colors={colors}
                punto={oscuro ? c.oscuro : c.claro}
                texto={c.nombre}
              />
            ))}
          </FlexWidget>
        ) : null}
      </FlexWidget>
      <FlexWidget
        style={{
          width: 1,
          height: 'match_parent',
          marginHorizontal: 12,
          backgroundColor: colors.border,
        }}
      />
      <FlexWidget
        style={{
          ...columna,
          width: m.derecha,
          justifyContent: m.cobro ? 'space-between' : 'flex-start',
          flexGap: GAP,
        }}
      >
        <FlexWidget
          {...abrirHoja('gasto', true)}
          accessibilityLabel="Dictar gasto"
          style={{
            width: 'match_parent',
            height: ALTO.dictar,
            flexDirection: 'row',
            alignItems: 'center',
            flexGap: 10,
            paddingHorizontal: 8,
            borderRadius: 16,
            backgroundColor: colors.acentoSuave,
          }}
        >
          <Mic colors={colors} lado={36} />
          {m.dictarCompleto ? (
            <FlexWidget>
              <TextWidget text="Dictar gasto" maxLines={1} style={titulo(colors, FUENTE_BOTON)} />
              <TextWidget text="Voz rápida" maxLines={1} style={etiqueta(colors, FUENTE_CHIP)} />
            </FlexWidget>
          ) : (
            <TextWidget text="Voz" maxLines={1} style={titulo(colors, FUENTE_BOTON)} />
          )}
        </FlexWidget>
        <Acciones colors={colors} acciones={['gasto', 'ingreso']} apiladas />
        {m.cobro ? (
          <Pastilla
            colors={colors}
            punto={colors.exito}
            texto={vista.cobro.texto}
            monto={vista.cobro.monto}
            extra={{ width: 'match_parent', height: ALTO.cobro, borderRadius: ALTO.cobro / 2 }}
          />
        ) : null}
      </FlexWidget>
    </Tarjeta>
  );
}

// HU-58 (RF13): widget «Billo». `vista` sale de utils/widgetResumen.vistaWidget (null sin datos:
// «Abre Billo para ver tu saldo»; los botones siguen funcionando). `ancho` y `alto` son su tamaño
// real (dp) y eligen el diseño (medidas.esMediano); `oscuro` lo pone estilos.conTemas. Tocar
// fuera de los botones abre la app. Este archivo importa react-native-android-widget, que falla
// en Expo Go: solo se carga con require desde modulosNativos.js o widgetTaskHandler.js.
export default function ResumenMesWidget({ colors, oscuro, vista = null, ancho = 0, alto = 0 }) {
  const Diseno = esMediano(ancho) ? Mediano : Pequeno;
  return <Diseno colors={colors} oscuro={oscuro} vista={vista} ancho={ancho} alto={alto} />;
}
