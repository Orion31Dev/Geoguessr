const express = require('express');
const app = express();

const path = require('path');
const nodeFetch = require('node-fetch');

const countryCodes = require('./country-codes.json');

require('dotenv').config();

var http = require('http').createServer(app);
const io = require('socket.io')(http);

const dist = path.resolve(__dirname, '../dist');

enum RoomState {
  LOBBY,
  GAME,
  ROOM_404,
  GAME_OVER,
}

enum PlayerState {
  WAITING,
  OUT,
  WINNER,
  IN,
}

app.use(express.static(dist));

app.get('*', (_req: any, res: any) => {
  res.sendFile('./index.html', { root: dist });
});

io.on('connection', (socket: any) => {
  console.log('Connection Received');

  socket.on('create-room', () => {
    console.log('Create Room cmd Received');
    socket.emit('join', RoomManager.createRoom());
  });

  socket.on('join', (id: string) => {
    console.log('join ' + id);
    if (!RoomManager.getRoom(id)) {
      socket.emit('state', RoomState.ROOM_404);
      return;
    }

    let p = PlayerManager.addPlayer(socket);

    p?.joinRoom(id);
  });

  socket.on('request-loc', (used: { lat: number; lng: number }[]) => {
    let loc = getRandomLatLng(used);
    socket.emit('loc', loc);
    getCountryInfo(loc).then((c) => socket.emit('country', c));
  });

  socket.on('disconnect', () => {
    if (PlayerManager.fromSocket(socket)) PlayerManager.removePlayer(PlayerManager.fromSocket(socket)!.id); // ! = assert not null
  });

  socket.on('start', () => {
    let p = PlayerManager.fromSocket(socket);
    if (p) RoomManager.getRoom(p.roomId)?.start(p.id);
  });

  socket.on('lobby', () => {
    let p = PlayerManager.fromSocket(socket);
    if (p) RoomManager.getRoom(p.roomId)?.lobby(p.id);
  });

  socket.on('guess', (guess: string) => {
    let p = PlayerManager.fromSocket(socket);
    if (p) RoomManager.getRoom(p.roomId)?.guess(guess, p);
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
  host: string;
  state: RoomState;
  round: number;
  loc: { lat: number; lng: number };
  usedLocs: { lat: number; lng: number }[];
  rightCountryCode: string;
  rightCountry: string;
  block: string[];
  winnerCount: number;
  winners: string[];

  gameWinner: string;

  roundCountdown: number;
  cdInterval: any;

  roundTimer: number;
  tInterval: any;

  constructor(roomId: string) {
    this.roomId = roomId;
    this.players = [];
    this.host = '';
    this.state = RoomState.LOBBY;
    this.round = -1;
    this.loc = { lat: 0, lng: 0 };
    this.rightCountry = '';
    this.rightCountryCode = '';
    this.usedLocs = [];
    this.block = [];
    this.winnerCount = 1;
    this.winners = [];
    this.gameWinner = '';
    this.roundCountdown = 0;
    this.roundTimer = 60;
  }

  addPlayer(player: Player) {
    this.players.push(player);
    if (this.state === RoomState.GAME) {
      player.state = PlayerState.OUT;

      this.broadcast('loc', this.loc);
      this.broadcast('block', this.block);
      this.broadcast('round', this.round);
      this.broadcast('winners', this.winners);
      this.broadcast('winner-count', this.winnerCount);
      this.broadcastPlayers();
    }

    if (this.state === RoomState.GAME_OVER) {
      this.broadcast('game-winner', this.gameWinner);
    }

    player.msg('state', this.state);

    if (this.host === '') this.host = this.players[0].id;

    this.broadcastPlayers();
  }

  removePlayer(player: Player) {
    this.players = this.players.filter((p) => p !== player);

    // Update host if the current host leaves
    if (this.host === player.id) {
      if (this.players.length > 0) this.host = this.players[0].id;
      else this.host = '';
    }

    if (this.state === RoomState.GAME) {
      if (player.state === PlayerState.WINNER) {
        this.winners = this.winners.filter((i) => i !== player.id);
        this.winnerCount--;

        this.broadcast('winners', this.winners);
        this.broadcast('winner-count', this.winnerCount);
      }

      let arr = this.players.filter((p) => p.state === PlayerState.WINNER || p.state === PlayerState.IN);
      if (arr.length === 1) {
        this.changeState(RoomState.GAME_OVER);
        this.gameWinner = arr[0].id;
        this.broadcast('game-winner', this.gameWinner);
      } else if (this.players.length < 2) {
        this.changeState(RoomState.LOBBY);
      }
    }

    this.broadcastPlayers();
  }

  changeState(state: RoomState) {
    this.state = state;
    this.broadcast('state', state);
  }

  start(id: string) {
    if (this.state !== RoomState.LOBBY) return;

    if (this.players.length < 2) return;
    if (id === this.host) {
      this.changeState(RoomState.GAME);
    }

    this.players.forEach((p) => {
      p.state = PlayerState.IN;
    });

    this.round = -1;
    this.block = [];

    this.newRound();
  }

  lobby(id: string) {
    if (this.state !== RoomState.GAME_OVER) return;

    if (id === this.host) {
      this.changeState(RoomState.LOBBY);
    }
  }

  guess(guess: string, player: Player) {
    if (player.lives < 1 || player.state === PlayerState.WAITING || player.state === PlayerState.OUT || this.state !== RoomState.GAME)
      return;

    if (guess !== this.rightCountryCode) {
      player.lives--;
      this.broadcastPlayers();
      this.block.push(guess);
      this.broadcast('block', this.block);
      if (player.lives === 0) {
        player.msg('showEndGame', '');
        player.state = PlayerState.WAITING;
        this.broadcastPlayers();
      }
    } else {
      this.winners.push(player.id);
      this.broadcast('winners', this.winners);
      player.msg('showEndGame', '');
      player.state = PlayerState.WINNER;
    }

    if (this.winnerCount === this.winners.length || this.players.filter((p) => p.state !== PlayerState.IN).length === this.players.length)
      this.endRound();
  }

  endRound() {
    clearInterval(this.tInterval);
    this.tInterval = undefined;

    this.players.forEach((p) => {
      if (this.winners.length > 0) {
        if (p.state !== PlayerState.WINNER) p.state = PlayerState.OUT;
      }
      p.lives = 3;
      p.msg('showEndGame', '');
    });

    if (this.winners.length === 1) {
      this.changeState(RoomState.GAME_OVER);
      this.gameWinner = this.winners[0];
      this.broadcast('game-winner', this.gameWinner);
    }

    // TODO: Msg players that lost on time that the round is over
    this.roundCountdown = 4;
    this.cdInterval = setInterval(() => {
      this.roundCountdown--;
      this.broadcast('countdown', this.roundCountdown);

      if (this.roundCountdown === -1) this.newRound();
    }, 1000);
  }

  newRound() {
    this.round += 1;
    this.loc = getRandomLatLng(this.usedLocs);
    this.usedLocs.push(this.loc);
    this.block = [];

    clearInterval(this.cdInterval);
    this.cdInterval = undefined;

    clearInterval(this.tInterval);
    this.tInterval = undefined;

    getCountryInfo(this.loc).then((c: any) => {
      this.rightCountryCode = c.countryCode;
      this.rightCountry = c.country;
    });

    if (this.round === 0) this.winnerCount = this.players.length;
    else this.winnerCount = this.players.filter((p) => p.state !== PlayerState.OUT).length - 1;

    this.winners = [];

    this.players.forEach((p) => {
      if (p.state !== PlayerState.OUT) p.state = PlayerState.IN;
    });

    this.roundTimer = 60;
    this.tInterval = setInterval(() => {
      this.roundTimer--;
      this.broadcast('timer', this.roundTimer);
      if (this.roundTimer < 0) this.endRound();
    }, 1000);

    this.broadcast('loc', this.loc);
    this.broadcast('block', this.block);
    this.broadcast('round', this.round);
    this.broadcast('winners', this.winners);
    this.broadcast('winner-count', this.winnerCount);
    this.broadcastPlayers();
  }

  broadcastPlayers() {
    let playerArr = deepCopy(this.players); // Copy Arr

    this.broadcast('players', playerArr);
    this.broadcast('host', this.host);
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

const MAX_GUESSES = 3;

// Player
class Player {
  socket: any;
  id: string;
  roomId: string;
  iconColor: string;
  state: PlayerState;
  guesses: number;
  lives: number;

  constructor(id: string, socket: any) {
    this.id = id;
    this.socket = socket;
    this.roomId = '';

    this.state = PlayerState.IN;

    this.msg('id', id);

    this.iconColor = iconColors[Math.floor(randomRange(0, iconColors.length))];
    this.guesses = MAX_GUESSES;
    this.lives = 3;
  }

  joinRoom(roomId: string) {
    if (!RoomManager.getRoom(roomId)) return;

    RoomManager.getRoom(roomId).addPlayer(this);
    this.roomId = roomId;
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
    return this.players[id];
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

function getRandomLatLng(used: { lat: number; lng: number }[]) {
  let l;
  do l = locations[Math.floor(randomRange(0, locations.length))];
  while (used.includes(l) && used.length < locations.length);

  return l;
}

const iconColors = ['#dd6622', '#aa66ff', '#55cc55', '#55aaff', '#7777ff', '#ff77dd', '#ffccee'];

const locations = [
  { lat: 64.9296689, lng: -147.629437 },
  { lat: -12.9594884, lng: -38.483756 },
  { lat: -17.7832528, lng: -63.1891003 },
  { lat: -25.2959187, lng: -57.5798229 },
  { lat: -33.4369638, lng: -70.6583966 },
  { lat: -33.4369638, lng: -70.6583966 },
  { lat: -35.1746662, lng: -58.2285172 },
  { lat: 49.9102813, lng: -97.1710041 },
  { lat: 41.3634072, lng: -73.3975717 },
  { lat: 44.9192292, lng: -62.532586 },
  { lat: 40.1207131, lng: -8.0118417 },
  { lat: 67.8798408, lng: 12.9867343 },
  { lat: -17.5604385, lng: -63.1365314 },
  { lat: -26.8529941, lng: 31.4497908 },
  { lat: 40.3464178, lng: -8.1551664 },
  { lat: 49.3928488, lng: 18.7088397 },
  { lat: 40.9810828, lng: 27.5556263 },
  { lat: 64.1731608, lng: -51.7343051 },
  { lat: 41.7157167, lng: 21.770502 },
  { lat: 14.9706254, lng: 104.9803361 },
  { lat: 43.2078441, lng: 21.6482873 },
  { lat: 25.5544837, lng: 55.6787714 },
  { lat: 14.4455392, lng: -17.0187311 },
  { lat: -36.0325905, lng: 144.5291183 },
  { lat: 1.3833601, lng: 103.7749793 },
  { lat: 63.4455214, lng: 10.4253912 },
  { lat: 57.7078598, lng: -3.4348632 },
  { lat: 51.5145124, lng: -0.0969188 },
  { lat: 48.6476029, lng: 2.3356988 },
  { lat: 48.7117689, lng: 1.5395125 },
  { lat: 40.6293196, lng: -3.1639421 },
  { lat: 39.3628123, lng: -8.224751 },
  { lat: 46.7218692, lng: 25.59772 },
  { lat: 36.3043785, lng: 127.443642 },
  { lat: 52.7915305, lng: 6.4563205 },
  { lat: 51.555913, lng: 4.4618603 },
  { lat: 44.9329369, lng: 25.4406563 },
  { lat: 65.7219523, lng: -16.7882051 },
  { lat: 8.4753209, lng: 6.9431227 },
  { lat: 35.0334123, lng: 135.7707912 },
  { lat: 40.9021596, lng: 140.5511731 },
  { lat: 17.4227965, lng: 102.8131674 },
  { lat: 40.9348461, lng: -73.9977961 },
  { lat: 5.6459816, lng: 100.4881779 },
  { lat: -27.5313287, lng: 153.0331429 },
  { lat: 18.3866107, lng: -66.0545161 },
  { lat: 39.9018582, lng: 41.2385735 },
  { lat: -0.1215951, lng: 117.3735366 },
  { lat: -3.8242125, lng: 122.006225 },
  { lat: 37.4859607, lng: 127.0252618 },
  { lat: 66.6193681, lng: 26.1815723 },
  { lat: 79.7554944, lng: 12.1160326 },
  { lat: 66.4422695, lng: -136.7109915 },
  { lat: 66.5184298, lng: 25.7510254 },
  { lat: 42.8791291, lng: 74.6080211 },
  { lat: 38.7850038, lng: -95.9647475 },
  { lat: -34.5880647, lng: -56.2508323 },
  { lat: -2.631324, lng: 37.8572428 },
  { lat: 44.9345995, lng: 110.1354978 },
  { lat: 5.6119329, lng: 100.4827722 },
  { lat: 46.3547242, lng: 108.3678171 },
  { lat: 46.0155517, lng: 9.2870717 },
  { lat: 41.5024773, lng: -73.9623352 },
  { lat: 38.9089947, lng: -94.6561954 },
];

function randomRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function deepCopy(inObject: any) {
  let outObject: any, value, key;

  if (typeof inObject !== 'object' || inObject === null) {
    return inObject; // Return the value if inObject is not an object
  }

  // Create an array or object to hold the values
  outObject = Array.isArray(inObject) ? [] : {};

  for (key in inObject) {
    if (key === 'socket' || typeof inObject[key] === 'function') continue; // don't copy sockets and functions

    value = inObject[key];

    // Recursively (deep) copy for nested objects, including arrays
    outObject[key] = deepCopy(value);
  }

  return outObject;
}

// Country Codes
async function getCountryInfo(loc: { lat: number; lng: number }) {
  let r;
  await nodeFetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${loc.lat},${loc.lng}&key=${process.env.REACT_APP_API_KEY}`)
    .then((res: any) => res.json())
    .then((data: any) => {
      data.results.forEach((obj: any) => {
        if (obj.types.includes('country')) {
          r = { country: obj.formatted_address, countryCode: isoA2ToA3(obj.address_components[0].short_name) };
        }
      });
    });
  return r;
}

const cArr: { [key: string]: any } = [];

for (let c of countryCodes) {
  let cc = c as any;

  cArr[cc['Alpha-2 code']] = cc['Alpha-3 code'];
}

function isoA2ToA3(a2: string) {
  return cArr[a2];
}
