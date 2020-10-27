import * as d from "definy-core/source/data";

const callApi = <requestType extends unknown, responseType extends unknown>(
  apiName: string,
  requestTypeCodec: d.Codec<requestType>,
  responseTypeCodec: d.Codec<responseType>
) => (requestData: requestType): Promise<responseType> =>
  fetch(`https://definy.app/api/${apiName}`, {
    method: "POST",
    body: new Uint8Array(requestTypeCodec.encode(requestData)),
    headers: [["content-type", "application/octet-stream"]],
  })
    .then((response) => response.arrayBuffer())
    .then(
      (response) => responseTypeCodec.decode(0, new Uint8Array(response)).result
    );

const unitCodec: d.Codec<undefined> = {
  encode: () => [],
  decode: (offset: number) => ({ result: undefined, nextIndex: offset }),
};

export const checkConnection = (): Promise<string> =>
  callApi("checkConnection", unitCodec, d.String.codec)(undefined);

export const requestLogInUrl = callApi(
  "requestLogInUrl",
  d.RequestLogInUrlRequestData.codec,
  d.String.codec
);

export const getUserByAccountToken = callApi(
  "getUserByAccountToken",
  d.AccountToken.codec,
  d.Maybe.codec(
    d.IdAndData.codec(d.UserId.codec, d.Resource.codec(d.User.codec))
  )
);

export const getUser = callApi(
  "getUser",
  d.UserId.codec,
  d.Resource.codec(d.User.codec)
);

export const getImageFile = callApi(
  "getImageFile",
  d.ImageToken.codec,
  d.Maybe.codec(d.Binary.codec)
);

export const createProject = callApi(
  "createProject",
  d.CreateProjectParameter.codec,
  d.Maybe.codec(
    d.IdAndData.codec(d.ProjectId.codec, d.Resource.codec(d.Project.codec))
  )
);

export const getTop50Project = (): Promise<
  d.List<d.IdAndData<d.ProjectId, d.Resource<d.Project>>>
> =>
  callApi(
    "getTop50Project",
    unitCodec,
    d.List.codec(
      d.IdAndData.codec(d.ProjectId.codec, d.Resource.codec(d.Project.codec))
    )
  )(undefined);

export const getProject = callApi(
  "getProject",
  d.ProjectId.codec,
  d.Resource.codec(d.Project.codec)
);

export const getIdea = callApi(
  "getIdea",
  d.IdeaId.codec,
  d.Resource.codec(d.Idea.codec)
);

export const getIdeaAndIdListByProjectId = callApi(
  "getIdeaAndIdListByProjectId",
  d.ProjectId.codec,
  d.List.codec(
    d.IdAndData.codec(d.IdeaId.codec, d.Resource.codec(d.Idea.codec))
  )
);

export const createIdea = callApi(
  "createIdea",
  d.CreateIdeaParameter.codec,
  d.Maybe.codec(
    d.IdAndData.codec(d.IdeaId.codec, d.Resource.codec(d.Idea.codec))
  )
);

export const addComment = callApi(
  "addComment",
  d.AddCommentParameter.codec,
  d.Maybe.codec(d.Resource.codec(d.Idea.codec))
);

export const getCommit = callApi(
  "getSuggestion",
  d.CommitId.codec,
  d.Resource.codec(d.Commit.codec)
);

export const getTypePartByProjectId = callApi(
  "getTypePartByProjectId",
  d.ProjectId.codec,
  d.Resource.codec(
    d.List.codec(d.IdAndData.codec(d.TypePartId.codec, d.TypePart.codec))
  )
);

export const addTypePart = callApi(
  "addTypePart",
  d.AccountTokenAndProjectId.codec,
  d.Resource.codec(
    d.List.codec(d.IdAndData.codec(d.TypePartId.codec, d.TypePart.codec))
  )
);
