export interface Usuario {
  id?: number;
  dni: string;
  contrasena: string;
  nombres: string;
  rol: string;
}

export interface LoginDTO {
  dni: string;
  contrasena: string;
}

export interface Libro {
  id: number;
  titulo: string;
  autor: string;
  genero: string;
  disp: number;
  img: string;
}

export interface LibroData {
  id: number;
  titulo: string;
  autor: string;
  categoria: string;
  disponibles: number;
  imagen_url: string | null;
}