import * as g from "graphql";
import type { NextApiRequest, NextApiResponse } from "next";
import {
  getGraphQLParameters,
  processRequest,
  renderGraphiQL,
  sendResult,
  shouldRenderGraphiQL,
} from "graphql-helix";
import { VERCEL_GIT_COMMIT_SHA } from "../../functions/environmentVariables";

export default (request: NextApiRequest, response: NextApiResponse): void => {
  const requestObject = {
    body: request.body,
    headers: request.headers,
    method: request.method ?? "",
    query: request.query,
  };

  if (shouldRenderGraphiQL(requestObject)) {
    response.send(renderGraphiQL({ endpoint: "/api/graphql" }));
    return;
  }
  const { operationName, query, variables } =
    getGraphQLParameters(requestObject);

  processRequest({
    operationName: operationName ?? "unknownOperationName",
    query: query ?? "unknown query...",
    variables: variables ?? {},
    request: requestObject,
    schema: new g.GraphQLSchema({
      query: new g.GraphQLObjectType({
        name: "Query",
        fields: {
          gitCommitSha: {
            type: g.GraphQLString,
            description:
              "ビルド元となった GitHub の Commit SHA. 開発時には null になる",
            resolve: (): string => {
              return VERCEL_GIT_COMMIT_SHA;
            },
          },
        },
      }),
    }),
  }).then((result) => {
    sendResult(result, response);
  });
};
