import * as React from "react";
import { ProjectId } from "../common/zodType";
import { trpc } from "../hooks/trpc";

export const ProjectCard = (props: {
  readonly projectId: ProjectId;
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
      return <div>{project.data?.name}</div>;
  }
};
