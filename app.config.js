// Extends app.json. When EXPO_BASE_URL is set at build time (e.g. "/ldn-map"
// for GitHub Pages, which serves the site from a subpath), inject it as the
// static web export's base URL. Local dev and native builds are unaffected.
module.exports = ({ config }) => {
  const experiments = { ...config.experiments };
  if (process.env.EXPO_BASE_URL) {
    experiments.baseUrl = process.env.EXPO_BASE_URL;
  }
  return { ...config, experiments };
};
