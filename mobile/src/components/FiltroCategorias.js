import { ScrollView, StyleSheet } from 'react-native';

import ChipCategoria from './ChipCategoria';

// Fila de chips con scroll horizontal para filtrar por categoría: "Todas" primero y luego
// `categorias` ([{ id, nombre }]). `seleccionada` es el id elegido o null para "Todas";
// `onSeleccionar(id | null)`. La fila llega hasta los bordes de la pantalla: `margen` es el
// padding horizontal del contenedor (20 en las pantallas con px-margin).
export default function FiltroCategorias({ categorias, seleccionada, onSeleccionar, margen = 20 }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.fila, { marginHorizontal: -margen }]}
      contentContainerStyle={[styles.chips, { paddingHorizontal: margen }]}
    >
      <ChipCategoria
        nombre="Todas"
        icono="view-grid-outline"
        seleccionado={seleccionada == null}
        onPress={() => onSeleccionar(null)}
      />
      {categorias.map((c) => (
        <ChipCategoria
          key={c.id}
          nombre={c.nombre}
          seleccionado={c.id === seleccionada}
          onPress={() => onSeleccionar(c.id)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexGrow: 0,
  },
  // gap-1.5 py-0.5 (como los chips de Nuevo gasto)
  chips: {
    gap: 6,
    paddingVertical: 2,
  },
});
