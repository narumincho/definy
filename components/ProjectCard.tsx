import * as React from "react";
import { Language, ProjectId } from "../common/zodType";
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
        <div css={{ padding: 8 }}>
          <Link
            language={props.language}
            location={{ type: "project", id: props.projectId }}
          >
            {project.data?.name}
          </Link>
        </div>
      );
  }
};
