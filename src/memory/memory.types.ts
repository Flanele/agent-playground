export type Meta = {
  name?: string;
  username?: string;
};

export type StoredMessage = {
  role: 'user' | 'assistant';
  meta?: Meta;
  text: string;
};
