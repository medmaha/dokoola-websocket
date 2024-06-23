export type CallType = "audio" | "video";

export interface SocketUser {
  name: string;
  avatar: string;
  username: string;
  profile: string;
  socketId: string;
}

export interface CallRequest {
  type: CallType;
  peerId: string;
  caller: SocketUser;
  remoteUser: SocketUser;
}

export interface IncomingCall {
  type: CallType;
  peerId: string;
  localUser: SocketUser;
  remoteUser: SocketUser;
}

export interface OutGoingCall {
  type: CallType;
  initiator: "local" | "remote";
  caller: SocketUser;
  remoteUser: SocketUser;
  callerPeerId: string;
  remotePeerId: string;
}
