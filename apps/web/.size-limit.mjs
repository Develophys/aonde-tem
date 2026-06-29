export default [
  {
    name: "Initial JS (gzip)",
    path: "dist/assets/index-*.js",
    gzip: true,
    limit: "150 kB",
  },
  {
    name: "Initial critical transfer (HTML+CSS+JS)",
    path: ["dist/index.html", "dist/assets/index-*.css", "dist/assets/index-*.js"],
    gzip: true,
    limit: "250 kB",
  },
];
