module Data.SocialLoginService exposing
    ( SocialLoginService(..)
    , serviceName
    )


type SocialLoginService
    = Google
    | GitHub
    | Line


serviceName : SocialLoginService -> String
serviceName service =
    case service of
        Google ->
            "Google"

        GitHub ->
            "GitHub"

        Line ->
            "LINE"
