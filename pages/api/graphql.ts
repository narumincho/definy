import * as g from "graphql";
import type { NextApiRequest, NextApiResponse } from "next";
import {
  getGraphQLParameters,
  processRequest,
  renderGraphiQL,
  sendResult,
  shouldRenderGraphiQL,
} from "graphql-helix";

export default (request: NextApiRequest, response: NextApiResponse): void => {
  const requestObject = {
    body: request.body,
    headers: request.headers,
    method: request.method ?? "",
    query: request.query,
  };

  if (shouldRenderGraphiQL(requestObject)) {
    response.send(renderGraphiQL());
    return;
  }
  const { operationName, query, variables } =
    getGraphQLParameters(requestObject);

  processRequest({
    operationName: operationName ?? "",
    query: query ?? "unknown query...",
    variables: variables ?? {},
    request: requestObject,
    schema: new g.GraphQLSchema({
      query: new g.GraphQLObjectType({
        name: "Query",
        fields: {
          hello: {
            type: new g.GraphQLNonNull(g.GraphQLString),
            resolve: () => "ok!",
          },
        },
      }),
    }),
  }).then((result) => {
    sendResult(result, response);
  });
};
