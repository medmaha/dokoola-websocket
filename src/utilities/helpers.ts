import { format } from "date-fns";
import { Server } from "socket.io";

export async function getSocketRoomMembers(roomId: string, io: Server) {
  const _sockets = await io.in(roomId).fetchSockets();

  const members = [];

  for (const s of _sockets) {
    members.push(s.data.user);
  }

  return members;
}

// prettier-ignore
export function loggerSocketRequest(socketId: string, path: string, method: string, arg?:any) {
  const timestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss");
    
  console.log(`<{${timestamp}}> - ${method.toUpperCase()} ${path} - ${socketId} [[ ${JSON.stringify(arg, null, 3)} ]]`);
}
