# Mundial 2026 Companion

Aplicación web inspirada en **Pasaporte Nuevo León** que centraliza información turística y logística para aficionados del Mundial FIFA 2026. Incluye clima en tiempo real, horarios oficiales de partidos, mapa interactivo con Google Maps y un asistente conversacional con voz conectado a ElevenLabs.

## Características principales

- Geolocalización automática con actualización en vivo.
- Consulta de clima actual utilizando OpenWeather.
- Horarios de partidos del Mundial 2026 ordenados por cercanía a tu ubicación.
- Mapa interactivo con Google Maps que muestra hoteles, restaurantes, zonas de interés, cajeros ATM y transporte público.
- Capa de tránsito para visualizar rutas locales.
- Integración con el Conversational AI de ElevenLabs para resolver dudas por voz.
- Experiencia responsive optimizada para pantallas móviles y de escritorio.

## Requisitos previos

- Node.js 18 o superior.
- Claves de API para los servicios externos:
  - Google Maps JavaScript API (incluyendo Places y Geocoding).
  - OpenWeather API.
  - ElevenLabs Conversational AI (API key y Agent ID).

## Variables de entorno

Crea un archivo `.env.local` dentro de la carpeta `web/` con las claves correspondientes:

```
VITE_GOOGLE_MAPS_API_KEY=tu_api_key_de_google
VITE_OPENWEATHER_API_KEY=tu_api_key_de_openweather
VITE_ELEVENLABS_API_KEY=tu_api_key_de_elevenlabs
VITE_ELEVENLABS_AGENT_ID=tu_agent_id_de_elevenlabs
```

## Instalación

```bash
cd web
npm install
```

## Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

## Construcción para producción

```bash
npm run build
npm run preview
```

## Notas sobre la integración con ElevenLabs

- La llamada de voz utiliza WebRTC y requiere permisos de micrófono en el navegador.
- Asegúrate de que tu plan de ElevenLabs tenga acceso a Conversational AI y que el agente esté configurado para español.
- El flujo de señalización sigue el endpoint `conversation` descrito en la documentación pública de ElevenLabs.
- Los eventos y errores de la integración se almacenan en `localStorage` bajo la clave `mundial_elevenlabs_logs`. En la UI
  del asistente encontrarás un botón para visualizar y limpiar estos registros.

## Estructura principal del proyecto

```
web/
├── public/
├── src/
│   ├── components/
│   ├── data/
│   ├── hooks/
│   ├── styles/
│   ├── utils/
│   └── App.tsx
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Licencia

Este proyecto se entrega como referencia técnica dentro del contexto solicitado y no incluye activos ni marcas oficiales de FIFA.
