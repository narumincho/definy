import { GraphQLError } from "npm:graphql";

export const accountTokenError = (message: string): GraphQLError =>
  new GraphQLError(message, {
    extensions: { code: "accountTokenError" },
  });

export const needAuthenticationError = (): GraphQLError =>
  new GraphQLError("認証が必要です", {
    extensions: { code: "needAuthenticationError" },
  });

export const accessDeniedError = (message: string): GraphQLError =>
  new GraphQLError(message, {
    extensions: { code: "accessDeniedError" },
  });

export const notFoundError = (message: string, id: string): GraphQLError =>
  new GraphQLError(message, {
    extensions: { code: "notFoundError", id },
  });

export const validationError = (message: string): GraphQLError =>
  new GraphQLError(message, {
    extensions: { code: "validationError" },
  });
