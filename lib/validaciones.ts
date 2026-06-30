// lib/validaciones.ts
import React from 'react';

export const manejarCambioDni = (
  e: React.ChangeEvent<HTMLInputElement>,
  setDni: (valor: string) => void,
  setErrorMensaje: (mensaje: string) => void
) => {
  // 1. Si detecta letra, lanza error, si no, lo limpia
  if (/\D/.test(e.target.value)) {
    setErrorMensaje('Credencial incorrecta: Solo se pueden ingresar números en el DNI.');
  } else {
    setErrorMensaje('');
  }
  
  // 2. Borra la letra físicamente de la caja y guarda en el estado
  e.target.value = e.target.value.replace(/\D/g, '');
  setDni(e.target.value);
};