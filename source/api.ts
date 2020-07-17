import {
  AddCommentParameter,
  AddSuggestionParameter,
  Binary,
  Codec,
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
  Suggestion,
  SuggestionId,
  User,
  UserId,
} from "definy-core/source/data";

const callApi = <responseType extends unknown>(
  apiName: string,
  binary: ReadonlyArray<number>,
  codec: Codec<responseType>
): Promise<responseType> =>
  fetch(`https://us-central1-definy-lang.cloudfunctions.net/api/${apiName}`, {
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
): Promise<Resource<IdAndData<ProjectId, Project>>> =>
  callApi(
    "createProject",
    CreateProjectParameter.codec.encode(createProjectParameter),
    Resource.codec(IdAndData.codec(ProjectId.codec, Project.codec))
  );

export const getAllProject = (): Promise<
  ReadonlyArray<IdAndData<ProjectId, Resource<Project>>>
> =>
  callApi(
    "getAllProject",
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

export const getSuggestion = (
  suggestionId: SuggestionId
): Promise<Resource<Suggestion>> =>
  callApi(
    "getSuggestion",
    SuggestionId.codec.encode(suggestionId),
    Resource.codec(Suggestion.codec)
  );

export const addSuggestion = (
  addSuggestionParameter: AddSuggestionParameter
): Promise<Maybe<IdAndData<SuggestionId, Resource<Suggestion>>>> =>
  callApi(
    "addSuggestion",
    AddSuggestionParameter.codec.encode(addSuggestionParameter),
    Maybe.codec(
      IdAndData.codec(SuggestionId.codec, Resource.codec(Suggestion.codec))
    )
  );
