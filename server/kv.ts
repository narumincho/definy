export type Idea = {
  readonly title: string;
  readonly createAccountId: string;
  readonly createDateTime: Date;
  readonly tags: ReadonlyArray<string>;
};
