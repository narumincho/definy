module ErrorMessage
  ( Above
  , Beside
  , ErrorMessage
  , QuoteLabel
  , Text
  , class ErrorMessageToTypeErrorDoc
  , class IsErrorMessage
  , reflectErrorMessage
  ) where

import Prim.TypeError as TypeError
import Type.Prelude (class IsSymbol, Proxy(..), reflectSymbol)
import Type.Prelude as Symbol

-- | `Prim.TypeError` の `Doc` には値での表現がなかったため, 別で作ることとなった
data ErrorMessage
  = Text String
  | QuoteLabel String
  | Beside ErrorMessage ErrorMessage
  | Above ErrorMessage ErrorMessage

foreign import data Text :: Symbol -> ErrorMessage

foreign import data QuoteLabel :: Symbol -> ErrorMessage

foreign import data Beside :: ErrorMessage -> ErrorMessage -> ErrorMessage

foreign import data Above :: ErrorMessage -> ErrorMessage -> ErrorMessage

class IsErrorMessage (errorMessage :: ErrorMessage) where
  reflectErrorMessage :: Proxy errorMessage -> ErrorMessage

instance isErrorMessageText :: (IsSymbol symbol) => IsErrorMessage (Text symbol) where
  reflectErrorMessage _ = Text (reflectSymbol (Proxy :: Proxy symbol))
else instance isErrorMessageQuoteLabel :: (IsSymbol symbol) => IsErrorMessage (QuoteLabel symbol) where
  reflectErrorMessage _ = QuoteLabel (reflectSymbol (Proxy :: Proxy symbol))
else instance isErrorMessageBeside ::
  ( IsErrorMessage a
  , IsErrorMessage b
  ) =>
  IsErrorMessage (Beside a b) where
  reflectErrorMessage _ =
    Beside
      (reflectErrorMessage (Proxy :: Proxy a))
      (reflectErrorMessage (Proxy :: Proxy b))
else instance isErrorMessageAbove ::
  ( IsErrorMessage a
  , IsErrorMessage b
  ) =>
  IsErrorMessage (Above a b) where
  reflectErrorMessage _ =
    Above
      (reflectErrorMessage (Proxy :: Proxy a))
      (reflectErrorMessage (Proxy :: Proxy b))

reifyErrorMessage :: forall r. ErrorMessage -> (forall o. IsErrorMessage o => Proxy o -> r) -> r
reifyErrorMessage message f = case message of
  Text str -> Symbol.reifySymbol str (reifyErrorMessageText f)
  QuoteLabel str -> Symbol.reifySymbol str (reifyErrorMessageQuoteLabel f)
  Beside a b -> reifyErrorMessage b (reifyErrorMessage a (reifyErrorMessageBeside f))
  Above a b -> reifyErrorMessage b (reifyErrorMessage a (reifyErrorMessageAbove f))

reifyErrorMessageText ::
  forall (r :: Type) (symbol :: Symbol).
  (IsSymbol symbol) =>
  ( forall (errorMessage :: ErrorMessage).
    IsErrorMessage errorMessage => Proxy errorMessage -> r
  ) ->
  Proxy symbol -> r
reifyErrorMessageText f _ = f (Proxy :: Proxy (Text symbol))

reifyErrorMessageQuoteLabel ::
  forall (r :: Type) (symbol :: Symbol).
  (IsSymbol symbol) =>
  ( forall (errorMessage :: ErrorMessage).
    IsErrorMessage errorMessage => Proxy errorMessage -> r
  ) ->
  Proxy symbol -> r
reifyErrorMessageQuoteLabel f _ = f (Proxy :: Proxy (QuoteLabel symbol))

reifyErrorMessageBeside ::
  forall (r :: Type) (a :: ErrorMessage) (b :: ErrorMessage).
  (IsErrorMessage a) =>
  (IsErrorMessage b) =>
  ( forall (errorMessage :: ErrorMessage).
    IsErrorMessage errorMessage => Proxy errorMessage -> r
  ) ->
  Proxy a -> Proxy b -> r
reifyErrorMessageBeside f _ _ = f (Proxy :: Proxy (Beside a b))

reifyErrorMessageAbove ::
  forall (r :: Type) (a :: ErrorMessage) (b :: ErrorMessage).
  (IsErrorMessage a) =>
  (IsErrorMessage b) =>
  ( forall (errorMessage :: ErrorMessage).
    IsErrorMessage errorMessage => Proxy errorMessage -> r
  ) ->
  Proxy a -> Proxy b -> r
reifyErrorMessageAbove f _ _ = f (Proxy :: Proxy (Beside a b))

class ErrorMessageToTypeErrorDoc (errorMessage :: ErrorMessage) (doc :: TypeError.Doc) | errorMessage -> doc

instance errorMessageToTypeErrorDocText :: ErrorMessageToTypeErrorDoc (Text symbol) (TypeError.Text symbol)
else instance errorMessageToTypeErrorDocQuoteLabel :: ErrorMessageToTypeErrorDoc (Text symbol) (TypeError.QuoteLabel symbol)
else instance errorMessageToTypeErrorDocBeside ::
  ( ErrorMessageToTypeErrorDoc a aDoc
  , ErrorMessageToTypeErrorDoc b bDoc
  ) =>
  ErrorMessageToTypeErrorDoc (Beside a b) (TypeError.Beside aDoc bDoc)
else instance errorMessageToTypeErrorDocAbove ::
  ( ErrorMessageToTypeErrorDoc a aDoc
  , ErrorMessageToTypeErrorDoc b bDoc
  ) =>
  ErrorMessageToTypeErrorDoc (Above a b) (TypeError.Above aDoc bDoc)
