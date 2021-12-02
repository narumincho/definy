import * as d from "../localData";

export type GetCodecType<codec> = codec extends d.Codec<infer t> ? t : never;

export type ApiCodec<Request, Response> = {
  readonly request: d.Codec<Request>;
  readonly response: d.Codec<Response>;
};

const createApiCodec = <Request, Response>(
  request: d.Codec<Request>,
  response: d.Codec<Response>
): ApiCodec<Request, Response> => {
  return {
    request,
    response,
  };
};

export type ApiCodecType = typeof apiCodec;

export const apiCodec = {
  requestLogInUrl: createApiCodec(
    d.RequestLogInUrlRequestData.codec,
    d.String.codec
  ),
  getAccountByAccountToken: createApiCodec(
    d.AccountToken.codec,
    d.Maybe.codec(d.Account.codec)
  ),
  getAccountTokenAndUrlDataByCodeAndState: createApiCodec(
    d.CodeAndState.codec,
    d.Maybe.codec(d.AccountTokenAndUrlDataAndAccount.codec)
  ),
  getAccount: createApiCodec(
    d.AccountId.codec,
    d.WithTime.codec(d.Maybe.codec(d.Account.codec))
  ),
  getImageFile: createApiCodec(d.ImageHash.codec, d.Binary.codec),
  createProject: createApiCodec(
    d.CreateProjectParameter.codec,
    d.Maybe.codec(d.Project.codec)
  ),
  getTop50Project: createApiCodec(
    d.Unit.codec,
    d.WithTime.codec(d.List.codec(d.Project.codec))
  ),
  getProject: createApiCodec(
    d.ProjectId.codec,
    d.WithTime.codec(d.Maybe.codec(d.Project.codec))
  ),
  getTypePartByProjectId: createApiCodec(
    d.ProjectId.codec,
    d.WithTime.codec(d.Maybe.codec(d.List.codec(d.TypePart.codec)))
  ),
  addTypePart: createApiCodec(
    d.AccountTokenAndProjectId.codec,
    d.WithTime.codec(d.Maybe.codec(d.TypePart.codec))
  ),
  setTypePart: createApiCodec(
    d.SetTypePartParameter.codec,
    d.WithTime.codec(d.Maybe.codec(d.TypePart.codec))
  ),
  getTypePart: createApiCodec(
    d.TypePartId.codec,
    d.WithTime.codec(d.Maybe.codec(d.TypePart.codec))
  ),
} as const;
