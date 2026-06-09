# Roadmap

Este documento contiene las tareas pendientes y futuras mejoras para el proyecto.

## Despliegue y Configuración

- [ ] **Configurar conexión Backend - Frontend en Producción:**
  - Crear el Space en Hugging Face (tipo Docker -> Blank).
  - Poner los secretos `HF_USERNAME` y `HF_SPACE_NAME` en GitHub.
  - Hacer commit y push del código actual para activar las GitHub Actions.
  - Configurar el secreto `FRONTEND_ORIGIN` en Hugging Face con la URL de Vercel.
  - Configurar la variable `VITE_API_URL` en Vercel con la URL del Space de Hugging Face.
