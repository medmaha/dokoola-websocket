export type CallType = "audio" | "video";

export interface SocketUser {
  name: string;
  avatar: string;
  public_id: string;
  profile: string;
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
