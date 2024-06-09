import { Server, type Socket } from "socket.io";

type User = {
  name: string;
  avatar: string;
  username: string;
  profile: string;
  socketId: string;
};
export interface IncomingCall {
  peerId: string;
  type: "video" | "audio";
  user: User;
  otherUser: User;
}
export interface OutGoingCall {
  peerId: string;
  type: "video" | "audio";
  caller: User;
}

const DB = new Map<string, User>();

export class InitializeSocketIOServer {
  // Initialize a new socket io instance

  static initialize(httpServer: any) {
    const io = new Server(httpServer, {
      cors: {
        origin: "*",
      },
      connectionStateRecovery: {
        // the backup duration of the sessions and the packets
        maxDisconnectionDuration: 2 * 60 * 1000,
        // whether to skip middlewares upon successful recovery
        skipMiddlewares: true,
      },
    });

    io.on("connection", (socket) => {
      if (socket.recovered) {
        // recovery was successful: socket.id, socket.rooms and socket.data were restored
      } else {
        // new or unrecoverable session
      }

      socket.on("login", (user: User) => {
        DB.set(user.username, {
          ...user,
          socketId: socket.id,
        });
        identifier = user.username;
        socket.data = { user: user };
        socket.emit("logged-in", user);
      });

      socket.on("logout", (user: User) => {
        DB.delete(user.username);
        socket.emit("logged-out", user);
      });

      socket.on("request-call", (data: IncomingCall) => {
        console.log("peerId", data.peerId);
        const _otherUser = DB.get(data.otherUser?.username);
        if (!_otherUser) return;
        switch (data.type) {
          case "video":
            const _otherUserSocket = io.sockets.sockets.get(
              _otherUser.socketId
            );
            if (_otherUserSocket) {
              const _data: OutGoingCall = {
                peerId: data.peerId,
                type: data.type,
                caller: data.otherUser,
              };
              _otherUserSocket.emit("incoming-call", _data);
              return;
            }
            socket.emit("call-not-found", data);
            break;

          default:
            break;
        }
      });

      // Rooms

      async function getMembers(roomId: string) {
        const _sockets = await io.in(roomId).fetchSockets();

        const members = [];

        for (const s of _sockets) {
          members.push(s.data.user);
        }

        return members;
      }

      let identifier = "";

      // Event to dispatch a new-message to all rooms in corresponding room
      socket.on("dispatch", function (roomId: string, data: any) {
        socket.emit("dispatched", roomId);
        socket.to(roomId).emit("new-dispatch", data);
      });

      socket.on("join", async (roomId: string, user: any) => {
        //
        // Making the sure a socket can only join a room once
        const _sockets = Array.from(await io.fetchSockets());
        if (_sockets.find((s) => s.data?.user?.id === user?.id)) return;

        socket.join(roomId);
        socket.data.user = user;

        socket.emit("joined", roomId);
        socket.broadcast.to(roomId).emit("joined-group", user);

        const members = await getMembers(roomId);
        io.to(roomId).emit("room-members", members);
      });

      socket.on("leave", (roomId: string, user: any) => {
        socket.emit("leaved", roomId);
        socket.to(roomId).emit("leaved-group", user);
        socket.leave(roomId);
      });

      socket.on("disconnect", () => {
        const rooms = Array.from(socket.rooms);
        socket.rooms.clear();
        DB.delete(identifier);
        const user: User | undefined = socket.data.user;

        console.log("disconnect:", user?.username);
        socket.emit("disconnected", user?.username);
        // socket.emit("disconnected");
      });
    });
    return io;
  }
}
