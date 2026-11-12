// Completa app.json con el archivo de Firebase para las notificaciones push de Android (HU-47).
// google-services.json NO está en el repo: en el build de EAS llega como variable de tipo archivo
// GOOGLE_SERVICES_JSON; en local se puede dejar como mobile/google-services.json (está en
// .gitignore). Sin ninguno de los dos la app compila igual, solo que sin push (Expo Go no las trae).
const fs = require('fs');

module.exports = ({ config }) => {
  const archivo =
    process.env.GOOGLE_SERVICES_JSON ||
    (fs.existsSync('./google-services.json') ? './google-services.json' : null);

  if (!archivo) return config;
  return { ...config, android: { ...config.android, googleServicesFile: archivo } };
};
