const parcel = require("parcel");

new parcel(["./index.html"], {
  outDir: "debugDistribution"
}).serve(2520);
