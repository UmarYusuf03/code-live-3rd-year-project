export const environment = {
  apiUrl: "http://localhost:5000",
  hubUrl: "http://localhost:5000/hubs/collaboration",
  yjsUrl: "ws://localhost:5000/ws/yjs",
};

export type Role = "lecturer" | "student";
export type LanguageId = "javascript" | "python" | "cpp";

export interface LanguageOption {
  id: LanguageId;
  label: string;
  judge0Id: number;
  monacoId: string;
}

export const LANGUAGES: LanguageOption[] = [
  {
    id: "javascript",
    label: "JavaScript",
    judge0Id: 63,
    monacoId: "javascript",
  },
  { id: "python", label: "Python", judge0Id: 71, monacoId: "python" },
  { id: "cpp", label: "C++", judge0Id: 54, monacoId: "cpp" },
];

export interface Participant {
  connectionId: string;
  name: string;
  role: Role;
  canEdit: boolean;
}

export interface RoomState {
  roomId: string;
  globalEdit: boolean;
  participants: Participant[];
  self: Participant;
}

export interface ExecutionResult {
  output: string;
  isError: boolean;
  status: string;
}

export interface SharedTerminal {
  from: string;
  output: string;
}
