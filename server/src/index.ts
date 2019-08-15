import * as functions from "firebase-functions";
import * as graphqlExpress from "express-graphql";
import * as schema from "./lib/schema";
import * as libLogInCallback from "./lib/logInCallback";
import * as express from "express";

console.log("サーバーのプログラムが読み込まれた");
/* =====================================================================
 *                          API (GraphQL)
 * =====================================================================
 */

export const api = functions
    .runWith({ memory: "2GB" })
    .https.onRequest(graphqlExpress({ schema: schema.schema, graphiql: true }));

/* =====================================================================
 *              ソーシャルログインをしたあとのリダイレクト先
 * =====================================================================
 */
export const logInCallback = functions.https.onRequest(
    async (request, response) => {
        switch (request.path) {
            case "/google":
                sendResponseFromLogInCallbackResult(
                    await libLogInCallback.googleLogInReceiver(request.query),
                    response
                );
                return;
            case "/gitHub":
                sendResponseFromLogInCallbackResult(
                    await libLogInCallback.gitHubLogInReceiver(request.query),
                    response
                );
                return;
            case "/line":
                sendResponseFromLogInCallbackResult(
                    await libLogInCallback.lineLogInReceiver(request.query),
                    response
                );
                return;
            default:
                response
                    .status(400)
                    .send(
                        "Definy doesn't support anything other than Google, GitHub and LINE"
                    );
                return;
        }
    }
);

const sendResponseFromLogInCallbackResult = (
    result: libLogInCallback.Result,
    response: express.Response
): void => {
    switch (result.type) {
        case "error":
            response.status(400).send(result.message);
            return;
        case "redirect":
            response.send(result.url.toString());
    }
};
