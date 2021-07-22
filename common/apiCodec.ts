import * as d from "../localData";

export type GetCodecType<codec> = codec extends d.Codec<infer t> ? t : never;

export type ApiCodec<Request, Response> = {
  request: d.Codec<Request>;
  response: d.Codec<Response>;
};

export const requestLogInUrl: ApiCodec<d.RequestLogInUrlRequestData, d.String> =
  {
    request: d.RequestLogInUrlRequestData.codec,
    response: d.String.codec,
  };

export const getAccountByAccountToken: ApiCodec<
  d.AccountToken,
  d.Maybe<d.Account>
> = {
  request: d.AccountToken.codec,
  response: d.Maybe.codec(d.Account.codec),
};

export const getAccount: ApiCodec<
  d.AccountId,
  d.WithTime<d.Maybe<d.Account>>
> = {
  request: d.AccountId.codec,
  response: d.WithTime.codec(d.Maybe.codec(d.Account.codec)),
};

export const getImageFile: ApiCodec<d.ImageHash, d.Binary> = {
  request: d.ImageHash.codec,
  response: d.Binary.codec,
};

export const createProject: ApiCodec<
  d.CreateProjectParameter,
  d.Maybe<d.Project>
> = {
  request: d.CreateProjectParameter.codec,
  response: d.Maybe.codec(d.Project.codec),
};

export const getTop50Project: ApiCodec<
  d.Unit,
  d.WithTime<ReadonlyArray<d.Project>>
> = {
  request: d.Unit.codec,
  response: d.WithTime.codec(d.List.codec(d.Project.codec)),
};

export const getProject: ApiCodec<
  d.ProjectId,
  d.WithTime<d.Maybe<d.Project>>
> = {
  request: d.ProjectId.codec,
  response: d.WithTime.codec(d.Maybe.codec(d.Project.codec)),
};

export const getTypePartByProjectId: ApiCodec<
  d.ProjectId,
  d.WithTime<d.Maybe<d.List<d.TypePart>>>
> = {
  request: d.ProjectId.codec,
  response: d.WithTime.codec(d.Maybe.codec(d.List.codec(d.TypePart.codec))),
};

export const addTypePart: ApiCodec<
  d.AccountTokenAndProjectId,
  d.WithTime<d.Maybe<d.TypePart>>
> = {
  request: d.AccountTokenAndProjectId.codec,
  response: d.WithTime.codec(d.Maybe.codec(d.TypePart.codec)),
};

export const setTypePart: ApiCodec<
  d.SetTypePartParameter,
  d.WithTime<d.Maybe<d.TypePart>>
> = {
  request: d.SetTypePartParameter.codec,
  response: d.WithTime.codec(d.Maybe.codec(d.TypePart.codec)),
};

export const getTypePart: ApiCodec<
  d.TypePartId,
  d.WithTime<d.Maybe<d.TypePart>>
> = {
  request: d.TypePartId.codec,
  response: d.WithTime.codec(d.Maybe.codec(d.TypePart.codec)),
};
