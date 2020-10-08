import {
  AccountToken,
  AccountTokenAndProjectId,
  AddCommentParameter,
  Binary,
  Codec,
  Commit,
  CommitId,
  CreateIdeaParameter,
  CreateProjectParameter,
  IdAndData,
  Idea,
  IdeaId,
  ImageToken,
  List,
  Maybe,
  Project,
  ProjectId,
  RequestLogInUrlRequestData,
  Resource,
  String,
  TypePart,
  TypePartHash,
  User,
  UserId,
} from "definy-core/source/data";

const callApi = <responseType extends unknown>(
  apiName: string,
  binary: ReadonlyArray<number>,
  codec: Codec<responseType>
): Promise<responseType> =>
  fetch(`https://definy.app/api/${apiName}`, {
    method: "POST",
    body: new Uint8Array(binary),
    headers: [["content-type", "application/octet-stream"]],
  })
    .then((response) => response.arrayBuffer())
    .then((response) => codec.decode(0, new Uint8Array(response)).result);

export const checkConnection = (): Promise<string> =>
  callApi("checkConnection", [], String.codec);

export const requestLogInUrl = (
  requestLogInUrlRequestData: RequestLogInUrlRequestData
): Promise<string> =>
  callApi(
    "requestLogInUrl",
    RequestLogInUrlRequestData.codec.encode(requestLogInUrlRequestData),
    String.codec
  );

export const getUserByAccountToken = (
  accountToken: AccountToken
): Promise<Maybe<IdAndData<UserId, Resource<User>>>> =>
  callApi(
    "getUserByAccountToken",
    AccountToken.codec.encode(accountToken),
    Maybe.codec(IdAndData.codec(UserId.codec, Resource.codec(User.codec)))
  );

export const getUser = (userId: UserId): Promise<Resource<User>> =>
  callApi("getUser", UserId.codec.encode(userId), Resource.codec(User.codec));

export const getImageFile = (
  imageToken: ImageToken
): Promise<Maybe<Uint8Array>> =>
  callApi(
    "getImageFile",
    ImageToken.codec.encode(imageToken),
    Maybe.codec(Binary.codec)
  );

export const createProject = (
  createProjectParameter: CreateProjectParameter
): Promise<Maybe<IdAndData<ProjectId, Resource<Project>>>> =>
  callApi(
    "createProject",
    CreateProjectParameter.codec.encode(createProjectParameter),
    Maybe.codec(IdAndData.codec(ProjectId.codec, Resource.codec(Project.codec)))
  );

export const getTop50Project = (): Promise<
  ReadonlyArray<IdAndData<ProjectId, Resource<Project>>>
> =>
  callApi(
    "getTop50Project",
    [],
    List.codec(IdAndData.codec(ProjectId.codec, Resource.codec(Project.codec)))
  );

export const getProject = (projectId: ProjectId): Promise<Resource<Project>> =>
  callApi(
    "getProject",
    ProjectId.codec.encode(projectId),
    Resource.codec(Project.codec)
  );

export const getIdea = (ideaId: IdeaId): Promise<Resource<Idea>> =>
  callApi("getIdea", IdeaId.codec.encode(ideaId), Resource.codec(Idea.codec));

export const getIdeaAndIdListByProjectId = (
  projectId: ProjectId
): Promise<ReadonlyArray<IdAndData<IdeaId, Resource<Idea>>>> =>
  callApi(
    "getIdeaAndIdListByProjectId",
    ProjectId.codec.encode(projectId),
    List.codec(IdAndData.codec(IdeaId.codec, Resource.codec(Idea.codec)))
  );

export const createIdea = (
  createIdeaParameter: CreateIdeaParameter
): Promise<Maybe<IdAndData<IdeaId, Resource<Idea>>>> =>
  callApi(
    "createIdea",
    CreateIdeaParameter.codec.encode(createIdeaParameter),
    Maybe.codec(IdAndData.codec(IdeaId.codec, Resource.codec(Idea.codec)))
  );

export const addComment = (
  addCommentParameter: AddCommentParameter
): Promise<Maybe<Resource<Idea>>> =>
  callApi(
    "addComment",
    AddCommentParameter.codec.encode(addCommentParameter),
    Maybe.codec(Resource.codec(Idea.codec))
  );

export const getCommit = (commitId: CommitId): Promise<Resource<Commit>> =>
  callApi(
    "getSuggestion",
    CommitId.codec.encode(commitId),
    Resource.codec(Commit.codec)
  );

export const getTypePartByProjectId = (
  projectId: ProjectId
): Promise<Resource<ReadonlyArray<IdAndData<TypePartHash, TypePart>>>> =>
  callApi(
    "getTypePartByProjectId",
    ProjectId.codec.encode(projectId),
    Resource.codec(
      List.codec(IdAndData.codec(TypePartHash.codec, TypePart.codec))
    )
  );

export const addTypePart = (
  accountTokenAndProjectId: AccountTokenAndProjectId
): Promise<Resource<ReadonlyArray<IdAndData<TypePartHash, TypePart>>>> =>
  callApi(
    "addTypePart",
    AccountTokenAndProjectId.codec.encode(accountTokenAndProjectId),
    Resource.codec(
      List.codec(IdAndData.codec(TypePartHash.codec, TypePart.codec))
    )
  );
