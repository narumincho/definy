import * as d from "definy-core/source/data";

const callApi = <responseType extends unknown>(
  apiName: string,
  binary: ReadonlyArray<number>,
  codec: d.Codec<responseType>
): Promise<responseType> =>
  fetch(`https://definy.app/api/${apiName}`, {
    method: "POST",
    body: new Uint8Array(binary),
    headers: [["content-type", "application/octet-stream"]],
  })
    .then((response) => response.arrayBuffer())
    .then((response) => codec.decode(0, new Uint8Array(response)).result);

export const checkConnection = (): Promise<string> =>
  callApi("checkConnection", [], d.String.codec);

export const requestLogInUrl = (
  requestLogInUrlRequestData: d.RequestLogInUrlRequestData
): Promise<string> =>
  callApi(
    "requestLogInUrl",
    d.RequestLogInUrlRequestData.codec.encode(requestLogInUrlRequestData),
    d.String.codec
  );

export const getUserByAccountToken = (
  accountToken: d.AccountToken
): Promise<d.Maybe<d.IdAndData<d.UserId, d.Resource<d.User>>>> =>
  callApi(
    "getUserByAccountToken",
    d.AccountToken.codec.encode(accountToken),
    d.Maybe.codec(
      d.IdAndData.codec(d.UserId.codec, d.Resource.codec(d.User.codec))
    )
  );

export const getUser = (userId: d.UserId): Promise<d.Resource<d.User>> =>
  callApi(
    "getUser",
    d.UserId.codec.encode(userId),
    d.Resource.codec(d.User.codec)
  );

export const getImageFile = (
  imageToken: d.ImageToken
): Promise<d.Maybe<Uint8Array>> =>
  callApi(
    "getImageFile",
    d.ImageToken.codec.encode(imageToken),
    d.Maybe.codec(d.Binary.codec)
  );

export const createProject = (
  createProjectParameter: d.CreateProjectParameter
): Promise<d.Maybe<d.IdAndData<d.ProjectId, d.Resource<d.Project>>>> =>
  callApi(
    "createProject",
    d.CreateProjectParameter.codec.encode(createProjectParameter),
    d.Maybe.codec(
      d.IdAndData.codec(d.ProjectId.codec, d.Resource.codec(d.Project.codec))
    )
  );

export const getTop50Project = (): Promise<
  ReadonlyArray<d.IdAndData<d.ProjectId, d.Resource<d.Project>>>
> =>
  callApi(
    "getTop50Project",
    [],
    d.List.codec(
      d.IdAndData.codec(d.ProjectId.codec, d.Resource.codec(d.Project.codec))
    )
  );

export const getProject = (
  projectId: d.ProjectId
): Promise<d.Resource<d.Project>> =>
  callApi(
    "getProject",
    d.ProjectId.codec.encode(projectId),
    d.Resource.codec(d.Project.codec)
  );

export const getIdea = (ideaId: d.IdeaId): Promise<d.Resource<d.Idea>> =>
  callApi(
    "getIdea",
    d.IdeaId.codec.encode(ideaId),
    d.Resource.codec(d.Idea.codec)
  );

export const getIdeaAndIdListByProjectId = (
  projectId: d.ProjectId
): Promise<ReadonlyArray<d.IdAndData<d.IdeaId, d.Resource<d.Idea>>>> =>
  callApi(
    "getIdeaAndIdListByProjectId",
    d.ProjectId.codec.encode(projectId),
    d.List.codec(
      d.IdAndData.codec(d.IdeaId.codec, d.Resource.codec(d.Idea.codec))
    )
  );

export const createIdea = (
  createIdeaParameter: d.CreateIdeaParameter
): Promise<d.Maybe<d.IdAndData<d.IdeaId, d.Resource<d.Idea>>>> =>
  callApi(
    "createIdea",
    d.CreateIdeaParameter.codec.encode(createIdeaParameter),
    d.Maybe.codec(
      d.IdAndData.codec(d.IdeaId.codec, d.Resource.codec(d.Idea.codec))
    )
  );

export const addComment = (
  addCommentParameter: d.AddCommentParameter
): Promise<d.Maybe<d.Resource<d.Idea>>> =>
  callApi(
    "addComment",
    d.AddCommentParameter.codec.encode(addCommentParameter),
    d.Maybe.codec(d.Resource.codec(d.Idea.codec))
  );

export const getCommit = (
  commitId: d.CommitId
): Promise<d.Resource<d.Commit>> =>
  callApi(
    "getSuggestion",
    d.CommitId.codec.encode(commitId),
    d.Resource.codec(d.Commit.codec)
  );

export const getTypePartByProjectId = (
  projectId: d.ProjectId
): Promise<
  d.Resource<ReadonlyArray<d.IdAndData<d.TypePartHash, d.TypePart>>>
> =>
  callApi(
    "getTypePartByProjectId",
    d.ProjectId.codec.encode(projectId),
    d.Resource.codec(
      d.List.codec(d.IdAndData.codec(d.TypePartHash.codec, d.TypePart.codec))
    )
  );

export const addTypePart = (
  accountTokenAndProjectId: d.AccountTokenAndProjectId
): Promise<
  d.Resource<ReadonlyArray<d.IdAndData<d.TypePartHash, d.TypePart>>>
> =>
  callApi(
    "addTypePart",
    d.AccountTokenAndProjectId.codec.encode(accountTokenAndProjectId),
    d.Resource.codec(
      d.List.codec(d.IdAndData.codec(d.TypePartHash.codec, d.TypePart.codec))
    )
  );
