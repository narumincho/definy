module TypeScript.ToString
  ( ModuleResult(..)
  , documentToString
  , typeScriptModuleMapToString
  ) where

import Data.Array as Array
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Set as Set
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import FileSystem.Path as Path
import Prelude as Prelude
import TypeScript.Data as Data
import TypeScript.Identifier as Identifier
import TypeScript.ModuleName as ModuleName
import TypeScript.ValidateAndCollect as ValidateAndCollect
import Util as Util

newtype ModuleResult
  = ModuleResult
  { code :: String
  , errorList :: Array ValidateAndCollect.ValidationErrorWithIndex
  }

typeScriptModuleMapToString ::
  Data.TypeScriptModuleMap ->
  Boolean ->
  (Map.Map Path.FilePath ModuleResult)
typeScriptModuleMapToString typeScriptModuleMap@(Data.TypeScriptModuleMap moduleMap) outputType =
  let
    collectResult :: Map.Map ModuleName.ModuleName ValidateAndCollect.ValidateAndCollectResult
    collectResult = ValidateAndCollect.validateAndCollect typeScriptModuleMap
  in
    Map.fromFoldable
      ( Array.mapMaybe
          ( \tuple@(Tuple.Tuple moduleName _) ->
              typeScriptModuleToString
                ( case Map.lookup moduleName collectResult of
                    Just r -> r
                    Nothing -> ValidateAndCollect.validateAndCollectResultEmpty
                )
                outputType
                tuple
          )
          ((Map.toUnfoldable moduleMap) :: Array _)
      )

typeScriptModuleToString ::
  ValidateAndCollect.ValidateAndCollectResult ->
  Boolean ->
  Tuple.Tuple ModuleName.ModuleName Data.Module ->
  Maybe (Tuple.Tuple Path.FilePath ModuleResult)
typeScriptModuleToString (ValidateAndCollect.ValidateAndCollectResult collectResult) outputType (Tuple.Tuple moduleName moduleContent) = case moduleName of
  ModuleName.NpmModule _ -> Nothing
  ModuleName.Local filePath ->
    Just
      ( Tuple.Tuple
          filePath
          ( ModuleResult
              { code:
                  typeScriptModuleContentToString
                    ( UsedNameSetAndModulePathSet
                        { usedNameSet: collectResult.usedNameSet
                        , modulePathSet: collectResult.modulePathSet
                        }
                    )
                    outputType
                    moduleContent
              , errorList: collectResult.errorList
              }
          )
      )

newtype UsedNameSetAndModulePathSet
  = UsedNameSetAndModulePathSet
  { usedNameSet :: Set.Set Identifier.TsIdentifier
  , modulePathSet :: Set.Set ModuleName.ModuleName
  }

typeScriptModuleContentToString ::
  UsedNameSetAndModulePathSet ->
  Boolean ->
  Data.Module ->
  String
typeScriptModuleContentToString usedNameSetAndModulePathSet outputType (Data.Module { exportDefinitionList, moduleDocument }) =
  let
    context :: Context
    context = usedNameSetAndModulePathSetToContext usedNameSetAndModulePathSet outputType
  in
    String.joinWith ""
      [ """/* eslint-disable */
/* generated by definy. Do not edit! */

"""
      , documentToString moduleDocument
      , String.joinWith
          "\n"
          ( Prelude.map
              ( \(Tuple.Tuple moduleName moduleNameSpace) ->
                  importStatementToString moduleNameSpace moduleName
              )
              (contextGetModuleNameNamespaceIdentifierList context)
          )
      , "\n"
      , String.joinWith "\n\n"
          ( Prelude.map
              (definitionToString context)
              exportDefinitionList
          )
      , "\n"
      ]

usedNameSetAndModulePathSetToContext :: UsedNameSetAndModulePathSet -> Boolean -> Context
usedNameSetAndModulePathSetToContext (UsedNameSetAndModulePathSet { usedNameSet, modulePathSet }) outputType =
  Context
    { moduleNameNamespaceIdentifyMap:
        usedNameSetAndModulePathSetToContextLoopItemGetList
          ( Array.foldl
              (usedNameSetAndModulePathSetToContextLoop usedNameSet)
              ( UsedNameSetAndModulePathSetToContextLoopItem
                  { list: []
                  , identifierIndex: Identifier.initialIdentifierIndex
                  }
              )
              ((Set.toUnfoldable modulePathSet) :: Array ModuleName.ModuleName)
          )
    , outputType
    }

newtype UsedNameSetAndModulePathSetToContextLoopItem
  = UsedNameSetAndModulePathSetToContextLoopItem
  { list :: Array (Tuple.Tuple ModuleName.ModuleName Identifier.TsIdentifier)
  , identifierIndex :: Identifier.IdentifierIndex
  }

usedNameSetAndModulePathSetToContextLoopItemGetList ::
  UsedNameSetAndModulePathSetToContextLoopItem ->
  Map.Map ModuleName.ModuleName Identifier.TsIdentifier
usedNameSetAndModulePathSetToContextLoopItemGetList (UsedNameSetAndModulePathSetToContextLoopItem { list }) = Map.fromFoldable list

usedNameSetAndModulePathSetToContextLoop ::
  Set.Set Identifier.TsIdentifier ->
  UsedNameSetAndModulePathSetToContextLoopItem ->
  ModuleName.ModuleName ->
  UsedNameSetAndModulePathSetToContextLoopItem
usedNameSetAndModulePathSetToContextLoop usedNameSet (UsedNameSetAndModulePathSetToContextLoopItem { list, identifierIndex }) moduleName =
  let
    { identifier, nextIdentifierIndex } = Identifier.createIdentifier identifierIndex usedNameSet
  in
    UsedNameSetAndModulePathSetToContextLoopItem
      { list: Array.snoc list (Tuple.Tuple moduleName identifier)
      , identifierIndex: nextIdentifierIndex
      }

importStatementToString :: Identifier.TsIdentifier -> ModuleName.ModuleName -> String
importStatementToString namespace moduleName =
  String.joinWith ""
    [ "import * as "
    , Identifier.toString namespace
    , " from \""
    , stringLiteralValueToString
        ( NonEmptyString.toString
            ( case moduleName of
                ModuleName.NpmModule packageName -> packageName
                ModuleName.Local filePath ->
                  -- TODO 相対パスの基準点が常にルートになってしまう
                  Path.filePathToString
                    filePath
                    Nothing
            )
        )
    ]

newtype Context
  = Context
  { moduleNameNamespaceIdentifyMap :: Map.Map ModuleName.ModuleName Identifier.TsIdentifier
  , outputType :: Boolean
  }

contextGetOutputType :: Context -> Boolean
contextGetOutputType (Context { outputType }) = outputType

contextGetModuleNameNamespaceIdentifierList :: Context -> Array (Tuple.Tuple ModuleName.ModuleName Identifier.TsIdentifier)
contextGetModuleNameNamespaceIdentifierList (Context { moduleNameNamespaceIdentifyMap }) = Map.toUnfoldable moduleNameNamespaceIdentifyMap

contextGetModuleNameNamespaceIdentifier :: ModuleName.ModuleName -> Context -> String
contextGetModuleNameNamespaceIdentifier moduleName (Context { moduleNameNamespaceIdentifyMap }) = case Map.lookup moduleName moduleNameNamespaceIdentifyMap of
  Just identifier -> Identifier.toString identifier
  Nothing -> "(logic error!)"

definitionToString :: Context -> Data.ExportDefinition -> String
definitionToString context = case _ of
  Data.ExportDefinitionTypeAlias typeAlias ->
    if contextGetOutputType context then
      typeAliasToString context typeAlias
    else
      ""
  Data.ExportDefinitionFunction func -> exportFunctionToString context func
  Data.ExportDefinitionVariable variable -> exportVariableToString context variable

typeAliasToString :: Context -> Data.TypeAlias -> String
typeAliasToString context (Data.TypeAlias rec) =
  String.joinWith ""
    [ documentToString rec.document
    , "export type "
    , Identifier.toString rec.name
    , typeParameterListToString rec.typeParameterList
    , " = "
    , typeToString context rec.type
    , ";"
    ]

exportFunctionToString :: Context -> Data.FunctionDeclaration -> String
exportFunctionToString context (Data.FunctionDeclaration func) =
  String.joinWith ""
    [ documentToString
        (Prelude.append func.document (parameterListToDocument func.parameterList))
    , "export const "
    , Identifier.toString func.name
    , " = "
    , if contextGetOutputType context then
        typeParameterListToString func.typeParameterList
      else
        ""
    , Util.joinWithCommaAndEncloseParenthesis
        ( Prelude.map
            ( \(Data.ParameterWithDocument parameter) ->
                Prelude.append
                  (Identifier.toString parameter.name)
                  (typeAnnotation context parameter.type)
            )
            func.parameterList
        )
    , typeAnnotation context func.returnType
    , " => "
    , lambdaBodyToString context func.statementList
    , ";"
    ]

exportVariableToString :: Context -> Data.VariableDeclaration -> String
exportVariableToString context (Data.VariableDeclaration rec) =
  String.joinWith ""
    [ documentToString rec.document
    , "export const "
    , Identifier.toString rec.name
    , typeAnnotation context rec.type
    , " = "
    , exprToString context rec.expr
    , ";"
    ]

parameterListToDocument :: Array Data.ParameterWithDocument -> String
parameterListToDocument = case _ of
  [] -> ""
  parameterList ->
    Prelude.append "\n"
      ( String.joinWith "\n"
          ( Prelude.map
              ( case _ of
                  Data.ParameterWithDocument { document: "" } -> ""
                  Data.ParameterWithDocument rec ->
                    String.joinWith ""
                      [ "@param "
                      , Identifier.toString rec.name
                      , " "
                      , rec.document
                      ]
              )
              parameterList
          )
      )

-- | 式をコードに変換する
exprToString :: Context -> Data.Expr -> String
exprToString context = case _ of
  Data.NumberLiteral value -> Util.numberToString value
  Data.StringLiteral value -> stringLiteralValueToString value
  Data.BooleanLiteral true -> "true"
  Data.BooleanLiteral false -> "false"
  Data.UndefinedLiteral -> "undefined"
  Data.NullLiteral -> "null"
  Data.ArrayLiteral arrayItemList ->
    arrayLiteralToString
      context
      arrayItemList
  Data.ObjectLiteral tsMemberList ->
    objectLiteralToString
      context
      tsMemberList
  Data.UnaryOperator (Data.UnaryOperatorExpr { operator, expr }) ->
    Util.encloseParenthesis
      ( Prelude.append
          (unaryOperatorToString operator)
          (exprToString context expr)
      )
  Data.BinaryOperator binaryOperatorExpr ->
    binaryOperatorExprToString
      context
      binaryOperatorExpr
  Data.ConditionalOperator conditionalOperatorExpr ->
    conditionalOperatorToString
      context
      conditionalOperatorExpr
  Data.Lambda (Data.LambdaExpr rec) ->
    String.joinWith ""
      [ typeParameterListToString rec.typeParameterList
      , Util.joinWithCommaAndEncloseParenthesis
          ( Prelude.map
              ( \(Data.Parameter { name, type: tsType }) ->
                  Prelude.append
                    (Identifier.toString name)
                    (typeAnnotation context tsType)
              )
              rec.parameterList
          )
      , typeAnnotation context rec.returnType
      , " => "
      , lambdaBodyToString context rec.statementList
      ]
  Data.Variable name -> Identifier.toString name
  Data.GlobalObjects name -> Prelude.append "globalThis." (Identifier.toString name)
  Data.ExprImportedVariable (Data.ImportedVariable rec) ->
    Util.append3
      (contextGetModuleNameNamespaceIdentifier rec.moduleName context)
      "."
      (Identifier.toString rec.name)
  Data.Get (Data.GetExpr { expr, propertyExpr }) ->
    Prelude.append
      (exprToString context expr)
      (indexAccessToString context propertyExpr)
  Data.Call callExpr -> callExprToString false context callExpr
  Data.New callExpr -> callExprToString true context callExpr
  Data.ExprTypeAssertion (Data.TypeAssertion { expr, type: tsType }) ->
    Util.encloseParenthesis
      ( Util.append3
          (exprToString context expr)
          " as "
          (typeToString context tsType)
      )

arrayLiteralToString :: Context -> Array Data.ArrayItem -> String
arrayLiteralToString context itemList =
  Util.append3
    "["
    ( Util.joinWithComma
        ( Prelude.map
            ( \(Data.ArrayItem { spread, expr }) ->
                Prelude.append
                  (if spread then "..." else "")
                  (exprToString context expr)
            )
            itemList
        )
    )
    "]"

objectLiteralToString :: Context -> Array Data.Member -> String
objectLiteralToString context memberList =
  Util.append3
    "{ "
    ( Util.joinWithComma
        ( Prelude.map
            ( case _ of
                Data.MemberSpread expr -> Prelude.append "..." (exprToString context expr)
                Data.MemberKeyValue kyeValue@(Data.KeyValue { key, value: Data.Variable valueIdentifier }) ->
                  if Prelude.eq key (Identifier.toString valueIdentifier) then
                    key
                  else
                    objectLiteralMemberKeyValueToString context kyeValue
                Data.MemberKeyValue kyeValue -> objectLiteralMemberKeyValueToString context kyeValue
            )
            memberList
        )
    )
    " }"

objectLiteralMemberKeyValueToString :: Context -> Data.KeyValue -> String
objectLiteralMemberKeyValueToString context (Data.KeyValue { key, value }) =
  Util.append3
    ( if Identifier.isSafePropertyName key then
        key
      else
        stringLiteralValueToString key
    )
    ": "
    (exprToString context value)

unaryOperatorToString :: Data.UnaryOperator -> String
unaryOperatorToString = case _ of
  Data.Minus -> "-"
  Data.BitwiseNot -> "~"
  Data.LogicalNot -> "!"

binaryOperatorExprToString :: Context -> Data.BinaryOperatorExpr -> String
binaryOperatorExprToString context (Data.BinaryOperatorExpr { left, operator, right }) =
  Util.encloseParenthesis
    ( Util.append3
        (exprToString context left)
        (binaryOperatorToString operator)
        (exprToString context right)
    )

binaryOperatorToString :: Data.BinaryOperator -> String
binaryOperatorToString = case _ of
  Data.Exponentiation -> "**"
  Data.Multiplication -> "*"
  Data.Division -> "/"
  Data.Remainder -> "%"
  Data.Addition -> "+"
  Data.Subtraction -> "-"
  Data.LeftShift -> "<<"
  Data.SignedRightShift -> ">>"
  Data.UnsignedRightShift -> ">>>"
  Data.LessThan -> "<"
  Data.LessThanOrEqual -> "<="
  Data.Equal -> "==="
  Data.NotEqual -> "!=="
  Data.BitwiseAnd -> "&"
  Data.BitwiseXOr -> "^"
  Data.BitwiseOr -> "|"
  Data.LogicalAnd -> "&&"
  Data.LogicalOr -> "||"

conditionalOperatorToString :: Context -> Data.ConditionalOperatorExpr -> String
conditionalOperatorToString context (Data.ConditionalOperatorExpr { condition, thenExpr, elseExpr }) =
  Util.encloseParenthesis
    ( String.joinWith ""
        [ exprToString context condition
        , "?"
        , exprToString context thenExpr
        , ":"
        , exprToString context elseExpr
        ]
    )

typeAnnotation :: Context -> Data.TsType -> String
typeAnnotation context tsType =
  if contextGetOutputType context then
    Prelude.append ": " (typeToString context tsType)
  else
    ""

typeToString :: Context -> Data.TsType -> String
typeToString context = case _ of
  Data.TsTypeNumber -> "number"
  Data.TsTypeString -> "string"
  Data.TsTypeBoolean -> "boolean"
  Data.TsTypeUndefined -> "undefined"
  Data.TsTypeNull -> "null"
  Data.TsTypeNever -> "never"
  Data.TsTypeVoid -> "void"
  Data.TsTypeUnknown -> "unknown"
  Data.TsTypeObject memberList -> typeObjectToString context memberList
  Data.TsTypeFunction functionType -> functionTypeToString context functionType
  Data.TsTypeUnion typeList ->
    String.joinWith
      " | "
      (Prelude.map (typeToString context) typeList)
  Data.TsTypeIntersection (Tuple.Tuple left right) ->
    Util.append3
      (typeToString context left)
      " & "
      (typeToString context right)
  Data.TsTypeImportedType (Data.ImportedType { typeNameAndTypeParameter, moduleName }) ->
    Util.append3
      (contextGetModuleNameNamespaceIdentifier moduleName context)
      "."
      (typeNameAndTypeParameterToString context typeNameAndTypeParameter)
  Data.TsTypeScopeInFile typeNameAndTypeParameter -> typeNameAndTypeParameterToString context typeNameAndTypeParameter
  Data.TsTypeScopeInGlobal typeNameAndTypeParameter ->
    Prelude.append
      "globalThis."
      (typeNameAndTypeParameterToString context typeNameAndTypeParameter)
  Data.TsTypeStringLiteral str -> stringLiteralValueToString str

typeObjectToString :: Context -> Array Data.TsMemberType -> String
typeObjectToString context memberList =
  Util.append3
    "{ "
    ( String.joinWith "; "
        ( Prelude.map
            ( \(Data.TsMemberType member) ->
                String.joinWith ""
                  [ documentToString member.document
                  , "readonly "
                  , if Identifier.isSafePropertyName member.name then
                      member.name
                    else
                      stringLiteralValueToString member.name
                  , if member.required then "" else "?"
                  , ": "
                  , typeToString context member.type
                  ]
            )
            memberList
        )
    )
    " }"

functionTypeToString :: Context -> Data.FunctionType -> String
functionTypeToString context (Data.FunctionType rec) =
  String.joinWith ""
    [ typeParameterListToString rec.typeParameterList
    , Util.joinWithCommaAndEncloseParenthesis
        ( Array.foldl
              ( \indexAndList parameterType ->
                  let
                    { identifier, nextIdentifierIndex } = Identifier.createIdentifier indexAndList.identifierIndex Set.empty
                  in
                    { list:
                        Array.snoc
                          indexAndList.list
                          (identifierAndTypeToString context identifier parameterType)
                    , identifierIndex: nextIdentifierIndex
                    }
              )
              { list: []
              , identifierIndex: Identifier.initialIdentifierIndex
              }
              rec.parameterList
          )
          .list
    , " => "
    , typeToString context rec.return
    ]

identifierAndTypeToString :: Context -> Identifier.TsIdentifier -> Data.TsType -> String
identifierAndTypeToString context identifier parameterType =
  Util.append3
    (Identifier.toString identifier)
    ": "
    (typeToString context parameterType)

typeNameAndTypeParameterToString :: Context -> Data.TypeNameAndTypeParameter -> String
typeNameAndTypeParameterToString context (Data.TypeNameAndTypeParameter { name, typeParameterList }) =
  Prelude.append
    (Identifier.toString name)
    ( if Array.null typeParameterList then
        ""
      else
        Util.append3
          "<"
          (Util.joinWithComma (Prelude.map (typeToString context) typeParameterList))
          ">"
    )

-- | 文字列を`"`で囲んでエスケープする
stringLiteralValueToString :: String -> String
stringLiteralValueToString value =
  Util.append3
    "\""
    ( String.replaceAll (String.Pattern "\n") (String.Replacement "\\n")
        ( String.replaceAll (String.Pattern "\r\n") (String.Replacement "\\n")
            ( String.replaceAll (String.Pattern "\"") (String.Replacement "\\\"")
                (String.replaceAll (String.Pattern "\\") (String.Replacement "\\\\") value)
            )
        )
    )
    "\""

-- | 型パラメーターを文字列にする `<T extends unknown>` `<ok extends unknown, error extends unknown>`
-- | extends unknown をつけた理由はJSXでも解釈できるようにするため
documentToString :: String -> String
documentToString document = case NonEmptyString.fromString (String.trim document) of
  Just nonEmptyDocument ->
    Util.append3
      """
/**
"""
      ( String.joinWith "\n"
          ( Prelude.map
              ( \line ->
                  Prelude.append
                    (if Prelude.eq line "" then " *" else " * ")
                    (String.replaceAll (String.Pattern "*/") (String.Replacement "* /") line)
              )
              (String.split (String.Pattern "\n") (NonEmptyString.toString nonEmptyDocument))
          )
      )
      """
 */
"""
  Nothing -> ""

typeParameterListToString :: Array Identifier.TsIdentifier -> String
typeParameterListToString = case _ of
  [] -> ""
  list ->
    Util.append3
      "<"
      ( Util.joinWithComma
          ( Prelude.map
              ( \typeParameter ->
                  Prelude.append
                    (Identifier.toString typeParameter)
                    " extends unknown"
              )
              list
          )
      )
      ">"

-- | ラムダ式の本体 文が1つでreturn exprだった場合、returnを省略する形になる
lambdaBodyToString :: Context -> Array Data.Statement -> String
lambdaBodyToString context statementList = case Array.uncons statementList of
  Just { head: Data.Return expr } -> exprToString context expr
  _ -> statementListToString context statementList

statementListToString :: Context -> Array Data.Statement -> String
statementListToString context statementList =
  Util.append3
    "{"
    ( String.joinWith "\n"
        ( Prelude.map
            (\statement -> statementToString context statement)
            statementList
        )
    )
    "}"

statementToString :: Context -> Data.Statement -> String
statementToString context = case _ of
  Data.EvaluateExpr expr ->
    Prelude.append
      (exprToString context expr)
      ";"
  Data.Set (Data.SetStatement { target, operatorMaybe, expr }) ->
    String.joinWith ""
      [ ( exprToString
            context
            target
        )
      , case operatorMaybe of
          Just operator -> binaryOperatorToString operator
          Nothing -> ""
      , "= "
      , exprToString context expr
      , ";"
      ]
  Data.If (Data.IfStatement { condition, thenStatementList }) ->
    String.joinWith ""
      [ "if ("
      , exprToString context condition
      , ") "
      , statementListToString context thenStatementList
      ]
  Data.ThrowError expr ->
    Util.append3
      "throw new Error("
      (exprToString context expr)
      ");"
  Data.Return expr ->
    Util.append3
      "return "
      (exprToString context expr)
      ";"
  Data.ReturnVoid -> "return;"
  Data.Continue -> "continue;"
  Data.VariableDefinition (Data.VariableDefinitionStatement { isConst, name, type: tsType, expr }) ->
    String.joinWith ""
      [ if isConst then "const" else "let"
      , " "
      , Identifier.toString name
      , typeAnnotation context tsType
      , " = "
      , exprToString context expr
      , ";"
      ]
  Data.FunctionDefinition functionDefinitionStatement -> functionDefinitionStatementToString context functionDefinitionStatement
  Data.For (Data.ForStatement rec) ->
    String.joinWith ""
      [ "for (let "
      , Identifier.toString rec.counterVariableName
      , " = 0; "
      , Identifier.toString rec.counterVariableName
      , " < "
      , exprToString context rec.untilExpr
      , "; "
      , Identifier.toString rec.counterVariableName
      , " += 1)"
      , statementListToString context rec.statementList
      ]
  Data.ForOf (Data.ForOfStatement rec) ->
    String.joinWith ""
      [ "for (const "
      , Identifier.toString rec.elementVariableName
      , " of "
      , exprToString context rec.iterableExpr
      , ")"
      , statementListToString context rec.statementList
      ]
  Data.WhileTrue statementList ->
    Prelude.append
      "while (true) "
      ( statementListToString
          context
          statementList
      )
  Data.Break -> "break;"
  Data.Switch switchStatement ->
    switchToString
      context
      switchStatement

functionDefinitionStatementToString :: Context -> Data.FunctionDefinitionStatement -> String
functionDefinitionStatementToString context (Data.FunctionDefinitionStatement rec) =
  String.joinWith ""
    [ "const "
    , Identifier.toString rec.name
    , " = "
    , typeParameterListToString rec.typeParameterList
    , Util.joinWithCommaAndEncloseParenthesis
        ( Prelude.map
            ( \(Data.ParameterWithDocument { name, type: tsType }) ->
                Prelude.append
                  (Identifier.toString name)
                  (typeAnnotation context tsType)
            )
            rec.parameterList
        )
    , typeAnnotation context rec.returnType
    , " => "
    , lambdaBodyToString context rec.statementList
    , ";"
    ]

switchToString :: Context -> Data.SwitchStatement -> String
switchToString context (Data.SwitchStatement { expr, patternList }) =
  String.joinWith ""
    [ "switch ("
    , exprToString context expr
    , ") {\n"
    , String.joinWith "\n"
        ( Prelude.map
            ( \(Data.Pattern pattern) ->
                String.joinWith ""
                  [ "case "
                  , stringLiteralValueToString pattern.caseString
                  , ": "
                  , statementListToString context pattern.statementList
                  ]
            )
            patternList
        )
    , "\n"
    , "}"
    ]

-- | ```ts
-- | list[0] // [0]
-- | data.name // .name
-- | ```
-- | の部分indexのExprがstringLiteralで識別子に使える文字なら`.name`のようになる
indexAccessToString :: Context -> Data.Expr -> String
indexAccessToString context indexExpr = case indexExpr of
  Data.StringLiteral indexName ->
    if Identifier.isSafePropertyName indexName then
      Prelude.append "." indexName
    else
      Util.append3 "[" (exprToString context indexExpr) "]"
  _ -> Util.append3 "[" (exprToString context indexExpr) "]"

callExprToString :: Boolean -> Context -> Data.CallExpr -> String
callExprToString isNew context (Data.CallExpr { expr, parameterList }) =
  Util.encloseParenthesis
    ( Util.append3
        (if isNew then "new " else "")
        (exprToString context expr)
        ( Util.joinWithCommaAndEncloseParenthesis
            ( Prelude.map
                (\parameter -> exprToString context parameter)
                parameterList
            )
        )
    )
