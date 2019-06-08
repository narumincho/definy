module Data.SocialLoginService exposing (SocialLoginService(..), serviceName)


type SocialLoginService
    = Google
    | GitHub
    | Twitter
    | Line


serviceName : SocialLoginService -> String
serviceName service =
    case service of
        Google ->
            "Google"

        GitHub ->
            "GitHub"

        Twitter ->
            "Twitter"

        Line ->
            "LINE"
