const parcel = require("parcel-bundler");

new parcel(["./source/index.html"], {
  outDir: "debugDistribution"
}).serve(2520);
