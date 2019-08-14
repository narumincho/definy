import * as functions from "firebase-functions";
import * as graphqlExpress from "express-graphql";
import * as schema from "./lib/schema";
import * as libLogInCallback from "./lib/logInCallback";

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
        let result: libLogInCallback.Response;
        switch (request.path) {
            case "/google":
                result = await libLogInCallback.googleLogInReceiver(
                    request.query
                );
                break;
            case "/gitHub":
                result = await libLogInCallback.gitHubLogInReceiver(
                    request.query
                );
                break;
            case "/line":
                result = await libLogInCallback.lineLogInReceiver(
                    request.query
                );
                break;
            default:
                response
                    .status(400)
                    .send(
                        "Definy doesn't support anything other than Google, GitHub and LINE"
                    );
                return;
        }
        switch (result.type) {
            case "error":
                response.status(400).send(result.message);
                return;
            case "redirect":
                response.send(result.url.toString());
        }
    }
);
