// Allow side-effect CSS imports (used by the web-only Leaflet map components).
// Metro handles these on web; native builds never import these files.
declare module '*.css';
