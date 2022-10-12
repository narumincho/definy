import * as React from "react";
import { Link } from "../components/Link";
import { trpc } from "../client/hook/trpc";
import { zodType } from "../deno-lib/npm";

export const ProjectCard = (props: {
  readonly projectId: zodType.ProjectId;
  readonly language: zodType.Language;
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
  readonly language: zodType.Language;
  readonly projectId: zodType.ProjectId;
  readonly data:
    | {
        readonly name: string;
        readonly imageHash: zodType.ImageHash;
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
          src={`/api/image/${props.data.imageHash}`}
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
