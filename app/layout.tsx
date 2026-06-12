"use client"; 

import "@/app/globals.css";
import Navbar from "@/app/components/Navbar";
import CarritoPrestamos from "@/app/components/CarritoPrestamos";
import { Toaster } from "react-hot-toast";


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-lib-cream text-gray-900">
        <Navbar />
        {/* Aquí es donde el contenido de cada página decide su estructura */}
        {children}
        <CarritoPrestamos />
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}