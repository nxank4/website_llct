declare module "@ai-sdk/react" {
  export type Role = "user" | "assistant" | "system" | "tool";

  export type ChatMessagePart =
    | string
    | {
      type?: string;
      text?: string;
    };

  export interface ChatMessage {
    id: string;
    role: Role;
    content?: string;
    parts?: ChatMessagePart[];
  }

  export interface UseChatOptions {
    transport?: unknown;
    api?: string;
    body?: Record<string, unknown>;
  }

  export function useChat(options?: UseChatOptions): {
    messages: ChatMessage[];
    input: string;
    submit?: (e: Event | React.FormEvent<HTMLFormElement>) => void;
    handleSubmit?: (e: Event | React.FormEvent<HTMLFormElement>) => void;
    sendMessage: (
      message: string | { id: string; role: Role; parts: Array<{ type?: string; text?: string } | string> },
      options?: { body?: Record<string, unknown>; api?: string; headers?: Record<string, string> }
    ) => void;
    isLoading: boolean;
    setMessages: (msgs: ChatMessage[]) => void;
    stop?: () => void;
    error?: Error & { status?: number };
  };
}


