
# Interactive Timeline

Este proyecto es una aplicación web de línea de tiempo interactiva creada con Vite, React y TypeScript. Permite agregar eventos con fecha y descripción, y se actualizará en tiempo real. El despliegue se realiza en GitHub Pages.

## Scripts principales

- `npm run dev`: Ejecuta la app en modo desarrollo.
- `npm run build`: Compila la app para producción.
- `npm run deploy`: Publica la app en GitHub Pages (usa la rama `gh-pages`).

## Despliegue en GitHub Pages

1. Asegúrate de que el archivo `vite.config.ts` tenga el campo `base` configurado como `/interactive-timeline/`.
2. Ejecuta:
  ```sh
  npm run deploy
  ```
3. La app estará disponible en `https://<TU_USUARIO>.github.io/interactive-timeline/`.

## Personalización

Puedes modificar la funcionalidad y el diseño editando los archivos en `src/`.
