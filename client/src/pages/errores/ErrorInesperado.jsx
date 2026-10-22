import { Component } from 'react';
import PaginaError, { Plato } from './PaginaError';

const BOTON = 'inline-flex h-11 items-center rounded-full px-6';

export function ErrorInesperado() {
  return (
    <PaginaError codigo={<>5<Plato platillo="tortillas" /><Plato platillo="rellenitos" /></>} titulo="Algo salió mal"
      acciones={<>
        <button onClick={() => window.location.reload()} className={`${BOTON} bg-primario-600 text-white hover:bg-primario-700`}>Recargar</button>
        <a href="/" className={`${BOTON} border border-linea bg-white hover:border-primario-400 hover:text-primario-700`}>Volver al inicio</a>
      </>}>
      Ocurrió un error inesperado al mostrar esta pantalla. Recarga la página; si se repite, avisa a administración.
    </PaginaError>
  );
}

// Atrapa errores de render para no dejar la página en blanco
export class AtraparErrores extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error(error, info.componentStack); }
  render() { return this.state.error ? <ErrorInesperado /> : this.props.children; }
}

// Solo en desarrollo: /prueba-error para ver la pantalla
export function LanzarError() {
  throw new Error('Error de prueba');
}
