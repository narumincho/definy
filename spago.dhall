{ name = "my-project"
, dependencies =
  [ "console"
  , "effect"
  , "maybe"
  , "node-buffer"
  , "node-http"
  , "node-streams"
  , "prelude"
  , "psci-support"
  ]
, packages = ./packages.dhall
, sources = [ "src/**/*.purs" ]
}
