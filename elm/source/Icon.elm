module Icon exposing (LogInButtonModel(..), gitHubIcon, googleIcon, lineIcon)

import Css
import Ui
import VectorImage


type LogInButtonModel
    = LogInButtonModelNone
    | LogInButtonModelHover
    | LogInButtonModelPressed


lineIcon : LogInButtonModel -> Ui.Panel msg
lineIcon logInButtonModel =
    Ui.imageFromUrl
        [ Ui.width 48
        , Ui.padding 4
        , Ui.border
            (Ui.BorderStyle
                { color =
                    case logInButtonModel of
                        LogInButtonModelNone ->
                            Css.rgb 0 179 0

                        LogInButtonModelHover ->
                            Css.rgb 0 201 0

                        LogInButtonModelPressed ->
                            Css.rgb 0 152 0
                , width = { top = 0, right = 1, left = 0, bottom = 0 }
                }
            )
        ]
        { fitStyle = Ui.Contain
        , alternativeText = "LINEのロゴ"
        , rendering = Ui.ImageRenderingAuto
        }
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAAB4CAYAAAA5ZDbSAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA3NpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNS1jMDIxIDc5LjE1NDkxMSwgMjAxMy8xMC8yOS0xMTo0NzoxNiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDphNTk0YTczYS0zNzEzLTRhMjktODgyYi0xYjg0ZWJkMjM5NGQiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6Q0MwNENBMzQ5M0YyMTFFNDk1OEFENjBBMUJBQjkyMzkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6Q0MwMEVBMTg5M0YyMTFFNDk1OEFENjBBMUJBQjkyMzkiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIChNYWNpbnRvc2gpIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6MDAwNGE4MWQtN2M4ZS00MjQxLTg1NDYtZTY5YzBhNDg0Njc0IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOmE1OTRhNzNhLTM3MTMtNGEyOS04ODJiLTFiODRlYmQyMzk0ZCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PhUqHtYAAAg1SURBVHja7F0JbFVFFJ0iSKEFigioRUREMIgLsrgGCW5ELKLiAokLIIrEgEqNuwY0oiGKJCqJSywILnGrKCBgkLiBiFWjEVGLJCIW0CLQCNTSeg9v0O/j9///5s3rm5l3T3IC/7/O+/Pn/Jm5c+feeXkNDQ2C4S6acROwwAwWmMECM1hgBgvMYIEZLDALzGCBGSwwgwVmsMAMFpjBArPADBaYwQIzWODY0JJYkDSBmzvyI+1BPJHYU/6/WLIDsYiY7ytTQ9xD3E7cSqwi/kz8kbiO+CWx2gWB8ywMusOP8gziEOKZxFOJbSL4nPXET4kfEZcSN7DA0aEV8SLiZcShxHYx1OF74lvE12QPZ4E1YABxghS2nUH1+pY4h/gC8Q8WOPiceinxduJAwzvILuI84gw5f7PAWYQdSZxG7GXZVFdPfJk41TShTRG4H/FpC3psNtQRn5BC17DA3hLmIeJNjq3JNxJvkwZZYgXGMmc+8TCH/QzlxLHEbXHOe3GsY9FrlzkuLjCC+JVctyeiB8Oz9CZxkEgWMDeXEme5LHA34nsWWsg6MZM4hdjgmsAnExcnYEjOBa8SryHWuiLwCcTlxENZ23+BaeoK4l7bjayjiYtY3AMAT91sdDCbBe4ovF2YLqxnWownPmzrEH2QFHcI65gVV8l52aoe/ACLmzOeE16ggjU9GIv6D2UvZuSGz4mnR2F06e7BiHt6lsUNDOx7T7ZhiEYle7NeSpgahZ9A5xANN2SlMCvywjZg9LvB1B48hcUNjTHSd2CcwIXC29NlhAN22m41UWD4VotYH229uNA0ga9TLFct5xxYkfeJ4A74l4QXGz2c+F2a6wif6SedCZU53rNMLvWwl7vWd+0v2cP6EI/JwoFyTlUZDUdq+7nAyArJHg3quNJ3r0cClF1FzEsp24VYl3K93HfvXsSdWe65wlemO3FvyvVShfZZqtAuSzToso86evCFIcqu8r3+JEBZZBykLgEQB/VryuvVvr9HSsrEgPVBdsOmlNcfKDoxguJsXcO0DoEvCDOA+F7XByhbl+V6unu9KJlrffz3qVVo33MVHUaDdVltodbRxNMsM2ImyvlRR2RJYYbvj4S38UI9FBiuy3fjFvgo4iGWCYx45VHElbKnhAHWrMsiqmdfE4ZoW92SSB4rNbyOvU0Q+EiL15tPCi9b0FQUCw0RH2GHaNuD6MYRT5FTjQpqpaXdmKFUHFIbRMVsibMH51sm6DDfa2QcjM7BIm8M6zI4OrpIB8zfcbZv0gSeLRs/Fcjivz+iz3tHeHnEqmgZt8A1lgnclvgK8WDf+48S34/oM3eEKLsrboF3CPvQnzg9jTPjauJmzZ/VSXh+cFXsjNvI2m6pcYUNAwTjL0x5DyftPKVgZN7SyDXsrl0cwhCt09G+YQX+xVKBsfwoI54k/u9rDmoQwcq9I6I6bjRhHbzO4iUSsi2Qn2xqgOBaEwTG4WF/WizyYOI9htZtjY6bhB2isfuCbbsSTV+qUlq0jc132ITXHfeFJdIK4cVyB8XWDPXtINfBnRTrtdwEgYHFGgXGYWN3ZrjejVhBbK9RYAzRiAxBiuvvActWZanvvbK+Rygsj1aaMEQDS5pw2NpAXBDBfYul0ZWnub2w7JqrUB8kyu8xRWD4YlWP9uuqUKaD/PdY3/utfT378DRr0kzD+zBxYEQj9ns7p7xWySHqqFCmTNtPV1PszyTFmKwKYnGAzxlHrJdlESs1Sr7fijjXd+/dxKHyelvighzqs4c4QpYpIM7xXa8k9gxQ3xJibcA22UxsoSsmS1dmQ5FcE6vEEdXLstkSr9o3MvdWifRHBu/HFlmv1gGH1jaNlGmQa9Rsa+Z8hbkXQGbmNG0Lfo2pK9OzGByM7IDnqrvQeFa1ztSVGcJe16UpmCE0H0SuU+BqWUGG+grhMd031Z0Ani8t6uNYr8CAFb9I90115wfvJl4vgsU3M4R4PgpxoxAYQHbCTNYsZ8B7Nzmqm0d1yg4iJhAvPIj1ywgksyHR7euoPiCqU3YQbThSaNrTdBToWWOjFDdKgQHstCAxbRtrmRZ3iwjPx4p6iE7FADlc8/EO/0H7WRxxCgwgSXshi7wPbwvvMUF7XRIY6CNF7ppgcbG1Olw00VHCUc/BfuBhUkiJrEiouFjnjmhKcZtaYGCTHK7LEiYuktwuEZ4jSLgssJBfEifJjE6Ihf0M8fKm7rlxCrwfeFIYcmBfd3idi+MJb2wqgypuIysTzic+TjzeEXERTwWf/Ly4K2LaswuRx4MwVpufzAIHD47s/9iEypj49FGEseIMDTwarq9l4lZIS9mYlB7Tnx98lvCy8OHXLjRcXAzH8E7tMqlStjwBHMFvJXLowxPA2xo2306S1rJxsEXgVCAbA+dPYitysPCcJ+1jqkultBvWmNpYNgqcDsXSAu8jxT9PqAWcBwFOzLtZGJ4E74rAfrQQ3pPFEMTWWfO9IShOy5tvQ0O4KvB+oDfjMFBdTxhbLS389bY0QDPhNr4Q6c+RDgocpzBNWvXrbWqA5sJ9bA1ZHrtgY0w2pJLcg4GCEL0Wyd39bRU3KT1YxZrGsI6AuM9s//Ku92BkWgQ5MBVbmfCF93VB3CT0YKTQ5HqKDo7rn0D8waUGcL0H53Lm8m/Ea4nnuCZuEnpwpv1lRFjMksufGlcbwHWB082/8Oy8QbyL+JPrFqbrAqcOuThyoZz4IPEbkRC47qrEDxhbjEhnxcFi1SJhcF3gxKMZNwELzGCBGSwwgwVmsMAMFpjBArPADBaYwQIzWGAGC8xggRkscFLxjwADAOgQ0qKDyuhmAAAAAElFTkSuQmCC"


gitHubIcon : Ui.Panel msg
gitHubIcon =
    Ui.vectorImage
        [ Ui.width 48, Ui.padding 8 ]
        { fitStyle = Ui.Contain
        , viewBox = { x = 0, y = 0, width = 20, height = 20 }
        , elements =
            [ VectorImage.path
                "M10 0C4.476 0 0 4.477 0 10c0 4.418 2.865 8.166 6.84 9.49.5.09.68-.218.68-.483 0-.237-.007-.866-.012-1.7-2.782.603-3.37-1.34-3.37-1.34-.454-1.157-1.11-1.464-1.11-1.464-.907-.62.07-.608.07-.608 1.003.07 1.53 1.03 1.53 1.03.893 1.53 2.342 1.087 2.912.83.09-.645.35-1.085.634-1.335-2.22-.253-4.555-1.11-4.555-4.943 0-1.09.39-1.984 1.03-2.683-.105-.253-.448-1.27.096-2.647 0 0 .84-.268 2.75 1.026C8.294 4.95 9.15 4.84 10 4.836c.85.004 1.705.115 2.504.337 1.91-1.294 2.747-1.026 2.747-1.026.548 1.377.204 2.394.1 2.647.64.7 1.03 1.592 1.03 2.683 0 3.842-2.34 4.687-4.566 4.935.36.308.678.92.678 1.852 0 1.336-.01 2.415-.01 2.743 0 .267.18.578.687.48C17.14 18.163 20 14.417 20 10c0-5.522-4.478-10-10-10"
                VectorImage.strokeNone
                (VectorImage.fillColor (Css.rgb 0 0 0))
            ]
        }


googleIcon : Ui.Panel msg
googleIcon =
    Ui.vectorImage
        [ Ui.width 48
        , Ui.height 48
        , Ui.padding 8
        ]
        { fitStyle = Ui.Contain
        , viewBox = { x = 0, y = 0, width = 20, height = 20 }
        , elements =
            [ VectorImage.path
                "M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z"
                VectorImage.strokeNone
                (VectorImage.fillColor (Css.rgb 66 133 244))
            , VectorImage.path
                "M13.46 15.13c-.83.59-1.96 1-3.46 1-2.64 0-4.88-1.74-5.68-4.15H1.07v2.52C2.72 17.75 6.09 20 10 20c2.7 0 4.96-.89 6.62-2.42l-3.16-2.45z"
                VectorImage.strokeNone
                (VectorImage.fillColor (Css.rgb 52 168 83))
            , VectorImage.path
                "M3.99 10c0-.69.12-1.35.32-1.97V5.51H1.07A9.973 9.973 0 0 0 0 10c0 1.61.39 3.14 1.07 4.49l3.24-2.52c-.2-.62-.32-1.28-.32-1.97z"
                VectorImage.strokeNone
                (VectorImage.fillColor (Css.rgb 251 188 5))
            , VectorImage.path
                "M10 3.88c1.88 0 3.13.81 3.85 1.48l2.84-2.76C14.96.99 12.7 0 10 0 6.09 0 2.72 2.25 1.07 5.51l3.24 2.52C5.12 5.62 7.36 3.88 10 3.88z"
                VectorImage.strokeNone
                (VectorImage.fillColor (Css.rgb 234 67 53))
            ]
        }
