const parcel = require("parcel-bundler");

new parcel(["./index.html"], {
  outDir: "debugDistribution"
}).serve(2520);
