import { Socket } from "socket.io";

export type SocketCallData = {
  callerPublicId: string;
  remotePublicId: string;
};

interface EmitEvents {
  "incoming-call": (data: SocketCallData) => void;
  "incoming-call-sent": () => void;

  "call-ended": (data: SocketCallData) => void;
  "call-ended-sent": () => void;

  "call-accepted": (data: SocketCallData) => void;
  "call-accepted-sent": () => void;

  "call-declined": (data: SocketCallData) => void;
  "call-declined-sent": () => void;

  "call-cancelled": (data: SocketCallData) => void;
  "call-cancelled-sent": () => void;

  "call-not-connected": (data: SocketCallData) => void;
  "call-not-found": (reasonPhrase: string, data: SocketCallData) => void;

  "call-unmuted": (data: SocketCallData) => void;
  "call-muted": (data: SocketCallData) => void;
  "off-camera": (data: SocketCallData) => void;
  "onn-camera": (data: SocketCallData) => void;
}

interface ListenEvents {
  "mute-call": (data: SocketCallData) => void;
  "unmute-call": (data: SocketCallData) => void;
  "off-camera": (data: SocketCallData) => void;
  "onn-camera": (data: SocketCallData) => void;

  "end-call": (data: SocketCallData) => void;
  "accept-call": (data: SocketCallData) => void;
  "request-call": (data: SocketCallData) => void;
  "decline-call": (data: SocketCallData) => void;
  "cancel-call": (
    data: SocketCallData,
    cancelledBy: "caller" | "remote"
  ) => void;
}

export type CallSocket = Socket<ListenEvents, EmitEvents>;

export type CallType = "audio" | "video";

export interface SocketUser {
  name: string;
  avatar: string;
  public_id: string;
  socketId: string;
}

export interface CallUser {
  name: string;
  public_id: string;
}

export interface MediaCallData {
  type: CallType;
  roomId: string;
  callerId: string;
  remoteUser: CallUser;
  localUser: CallUser;
}
