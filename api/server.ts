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

  socket.on('username', (username: string) => {
    let p = PlayerManager.fromSocket(socket);
    if (p) {
      p.username = username;
      RoomManager.getRoom(p.roomId)?.broadcastPlayers();
    }
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

    if (this.players.length === 0) {
      RoomManager.removeRoom(this.roomId);
      return;
    }

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
    this.broadcast('countdown', -1);

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
  static rooms: { [key: string]: Room | undefined } = {};

  static createRoom() {
    let id = generateId(8);
    while (this.rooms[id]) id = generateId(8);

    this.rooms[id] = new Room(id);
    return id;
  }

  static removeRoom(id: string) {
    this.rooms[id] = undefined;
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
  username: string;
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

    this.username = '';

    this.iconColor = iconColors[Math.floor(randomRange(0, iconColors.length))];
    this.guesses = MAX_GUESSES;
    this.lives = 3;
  }

  joinRoom(roomId: string) {
    if (!RoomManager.getRoom(roomId)) return;

    RoomManager.getRoom(roomId)?.addPlayer(this);
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
  if (used.length >= locations.length) used = [];

  let l;
  do l = locations[Math.floor(randomRange(0, locations.length))];
  while (used.includes(l));

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
  { lat: 30.4699788, lng: -97.7618805 },
  { lat: 53.1365905, lng: -0.92663512 },
  { lat: 47.552129, lng: 13.95193872 },
  { lat: 49.1662855, lng: 5.14713202 },
  { lat: 43.28008447961967, lng: -99.73762240543297 },
  { lat: 17.57960226098695, lng: 120.4509846974125 },
  { lat: 51.11826313809533, lng: 5.207149887597875 },
  { lat: 52.57070834800131, lng: 59.50667269938214 },
  { lat: 36.07608218902786, lng: -89.42627370363243 },
  { lat: 46.80416390986412, lng: 5.064903058195188 },
  { lat: 56.45139071936001, lng: 26.37907626745615 },
  { lat: 57.20362107937941, lng: 15.34790935890979 },
  { lat: 31.36674038339918, lng: -97.20776616587622 },
  { lat: 22.82892950431066, lng: 120.6334826850971 },
  { lat: 56.39720810179995, lng: 16.43647399471503 },
  { lat: 56.95106226391989, lng: 35.43144495137396 },
  { lat: 31.88469255705521, lng: -87.73022573848762 },
  { lat: 45.13521419762469, lng: 8.932960454576605 },
  { lat: 44.06274199870204, lng: 1.692666127935904 },
  { lat: 40.09931924113906, lng: -2.78764672445505 },
  { lat: -3.94726509781709, lng: 122.1292982382173 },
  { lat: 42.4548615593857, lng: -94.85678061909664 },
  { lat: 40.72348386851774, lng: -77.01588848506594 },
  { lat: 48.23982761543226, lng: 13.02387929105931 },
  { lat: 39.82485631847231, lng: -92.50141882842443 },
  { lat: 47.84675590957358, lng: -122.5854060628111 },
  { lat: 37.37677657535039, lng: 127.8863556748702 },
  { lat: 59.72645339531636, lng: 17.36683486507804 },
  { lat: 43.76071148695109, lng: -71.69100086757754 },
  { lat: -36.81813166653519, lng: 143.127385916258 },
  { lat: 44.08008739952123, lng: -93.94530981106138 },
  { lat: 52.87449032095197, lng: -8.315019308372355 },
  { lat: 33.30641005756819, lng: -81.45019648134881 },
  { lat: 59.84369682805963, lng: 9.313627664422258 },
  { lat: 46.59783776586332, lng: 15.75148893055406 },
  { lat: 38.75133467707743, lng: -79.13048604643153 },
  { lat: -29.87765577058637, lng: 30.49607967002716 },
  { lat: -41.59585633171642, lng: 146.6013289867074 },
  { lat: 45.22487236583733, lng: 8.720072553744652 },
  { lat: 5.349153607603285, lng: 116.2148264937846 },
  { lat: 45.59027104346513, lng: -91.60143302802337 },
  { lat: 38.94115294170928, lng: -76.45053784220799 },
  { lat: 54.78102209806535, lng: 22.50563291654961 },
  { lat: 49.83774831165681, lng: -119.6874025651477 },
  { lat: -27.69736634065423, lng: 151.4634918375089 },
  { lat: 37.61649189297648, lng: 14.12453203696969 },
  { lat: 45.32025796794879, lng: 27.88092988042033 },
  { lat: 58.44947992879801, lng: 50.49947863876208 },
  { lat: -31.31700785048669, lng: 116.8456724205837 },
  { lat: -11.52734904032634, lng: -76.28466863432443 },
  { lat: 52.41853031166438, lng: -112.1881490054564 },
  { lat: 55.7080976387974, lng: 41.69482012359587 },
  { lat: 45.00620416552458, lng: -92.759267622156 },
  { lat: -36.30274100688877, lng: 146.2026758309656 },
  { lat: -6.770321336931048, lng: 110.9985425772172 },
  { lat: 44.58062548489888, lng: 0.8132393857328881 },
  { lat: 39.46662742059993, lng: -1.128236838289495 },
  { lat: 46.01758148550744, lng: -103.2105834431364 },
  { lat: 34.50612162403392, lng: -78.65445975536129 },
  { lat: 41.51122829634356, lng: -81.41231035099005 },
  { lat: 36.07494710927381, lng: 140.2803767951914 },
  { lat: 50.94637748225738, lng: 32.00217875078203 },
  { lat: -16.28473140487104, lng: -49.46699422553765 },
  { lat: 35.97972256465744, lng: 140.0855963133244 },
  { lat: 45.72468091139101, lng: -121.5900360057594 },
  { lat: 42.18135399002288, lng: -94.9092537106554 },
  { lat: 42.34116747174, lng: -92.06473842687076 },
  { lat: -34.78618831996548, lng: -58.43553210304988 },
  { lat: 62.68861723427079, lng: 23.91654208765136 },
  { lat: 38.35351878124635, lng: -87.29300513848719 },
  { lat: 56.20644220291641, lng: 96.45814989090482 },
  { lat: 33.49522616172819, lng: -88.8020784790361 },
  { lat: 49.49809260367304, lng: 16.25674508655838 },
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
