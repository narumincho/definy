import * as React from "react";
import { ImageHash, Language, ProjectId } from "../common/zodType";
import { Link } from "../components/Link";
import { trpc } from "../hooks/trpc";

export const ProjectCard = (props: {
  readonly projectId: ProjectId;
  readonly language: Language;
}): React.ReactElement => {
  const project = trpc.useQuery(["getProjectById", props.projectId]);

  switch (project.status) {
    case "error":
      return <div>error...</div>;
    case "idle":
      return <div>....</div>;
    case "loading":
      return <div>..</div>;
    case "success":
      return (
        <ProjectCardLoaded
          data={project.data}
          language={props.language}
          projectId={props.projectId}
        />
      );
  }
};

const ProjectCardLoaded = (props: {
  readonly language: Language;
  readonly projectId: ProjectId;
  readonly data:
    | {
        readonly name: string;
        readonly imageHash: ImageHash;
      }
    | undefined;
}) => {
  if (props.data === undefined) {
    return <div>プロジェクトが見つからなかった</div>;
  }
  return (
    <div css={{ padding: 8 }}>
      <Link
        language={props.language}
        location={{ type: "project", id: props.projectId }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={"/api/image/" + props.data.imageHash}
          css={{
            width: 160,
            height: 90,
            objectFit: "contain",
          }}
        />
        {props.data.name}
      </Link>
    </div>
  );
};
