const express = require('express');
const app = express();

const path = require('path');
require('dotenv').config();

var http = require('http').createServer(app);
const io = require('socket.io')(http);

const dist = path.resolve(__dirname, '../dist');

app.use(express.static(dist));

app.get('*', (_req: any, res: any) => {
  res.sendFile('./index.html', { root: dist });
});

io.on('connection', (socket: any) => {
  console.log("Connection Received");

  PlayerManager.addPlayer(socket);

  socket.on('create-room', () => {
    console.log("Create Room cmd Received");
    PlayerManager.fromSocket(socket)?.joinRoom(RoomManager.createRoom());
  });
});

http.listen(process.env.PORT || 8080);

function generateId(length: number) {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

  var result = '';
  for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

// Everything has to go in one file because if I use export and import, I get "import cannot be used outside a module"
// But if I set type to module in package.json, I get "unknown file extension: .ts" because of a ts-node bug? idk

// Room
class Room {
  roomId: string;
  players: Player[];

  constructor(roomId: string) {
    this.roomId = roomId;
    this.players = [];
  }

  addPlayer(player: Player) {
    this.players.push(player);
  }

  removePlayer(player: Player) {
    this.players = this.players.filter((p) => p !== player);
  }

  broadcastPlayers() {
    let playerArr: any[] = [];
    Object.assign(playerArr, this.players);

    playerArr.forEach((o: any) => delete o.socket);

    this.broadcast('players', playerArr);
  }

  broadcast(topic: string, msg: any) {
    this.players.forEach((p) => p.msg(topic, msg));
  }
}

class RoomManager {
  static rooms: { [key: string]: Room } = {};

  static createRoom() {
    let id = generateId(8);
    while (this.rooms[id]) id = generateId(8);

    this.rooms[id] = new Room(id);
    return id;
  }

  static getRoom(id: string) {
    return this.rooms[id];
  }
}

// Player
class Player {
  socket: any;
  id: string;
  roomId: string;

  constructor(id: string, socket: any) {
    this.id = id;
    this.socket = socket;
    this.roomId = '';
  }

  joinRoom(roomId: string) {
    if (!RoomManager.getRoom(roomId)) return;

    RoomManager.getRoom(roomId).addPlayer(this);
    this.roomId = roomId;
    this.msg('join', roomId);
  }

  msg(topic: string, msg: any) {
    this.socket.emit(topic, msg);
  }
}

class PlayerManager {
  static players: { [key: string]: Player } = {};

  static addPlayer(socket: any) {
    let id = generateId(6);
    while (this.players[id]) id = generateId(6);

    this.players[id] = new Player(id, socket);
    return id;
  }

  static removePlayer(id: string) {
    if (!this.players[id]) return;

    RoomManager.getRoom(this.players[id].roomId)?.removePlayer(this.players[id]);
    delete this.players[id];
  }

  static fromSocket(socket: any) {
    for (let p in this.players) if (this.players[p].socket === socket) return this.players[p];

    return undefined;
  }
}
