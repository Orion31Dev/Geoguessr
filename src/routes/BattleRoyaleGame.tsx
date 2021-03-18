import React from 'react';
import { MapContainer } from '../components/MapContainer';
import { StreetViewContainer } from '../components/StreetViewContainer';
import { io } from 'socket.io-client';

interface BattleRoyaleGameState {
  roomState: RoomState;

  roundNum: number;

  loc: { lat: number; lng: number } | undefined;
  wrongGuesses: string[];

  host: string;
  id: string;

  players: any[];

  winnerCount: number;
  winners: string[];

  countdown: number;
  timer: number;

  showEndRoundBox: boolean;

  gameWinner: string;
}

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

export default class BattleRoyaleGame extends React.Component<any, BattleRoyaleGameState> {
  map: any;
  socket: any;

  constructor(props: any) {
    super(props);

    this.map = React.createRef();
    this.state = {
      roundNum: 0,
      loc: { lat: 45, lng: -30 },
      wrongGuesses: [],

      players: [],
      roomState: RoomState.LOBBY,
      host: '',
      id: '',

      winnerCount: 0,
      winners: [],

      gameWinner: '',

      countdown: -1,
      timer: -1,

      showEndRoundBox: false,
    };
  }

  componentDidMount() {
    let username = localStorage.getItem('username');
    if (!username) {
      window.location.href = '/user/' + this.props.match.params.room;
      return;
    }

    this.socket = io();
    this.socket.emit('join', this.props.match.params.room);
    this.socket.emit('username', username);

    this.socket.on('id', (id: string) => this.setState({ id: id }));
    this.socket.on('host', (id: string) => this.setState({ host: id }));
    this.socket.on('players', (p: any[]) => this.setState({ players: p }));

    this.socket.on('round', (round: number) => {
      this.setState({ roundNum: round, showEndRoundBox: false });
    });

    this.socket.on('state', (state: RoomState) => this.setState({ roomState: state }));

    this.socket.on('loc', (loc: { lat: number; lng: number }) => {
      this.setState({ loc: loc });
      console.log('loc:');
      console.log(loc);
    });
    
    this.socket.on('block', (arr: string[]) => {
      this.setState({ wrongGuesses: arr });
      this.map.current.updateBlockedCountries();
    });

    this.socket.on('winners', (w: string[]) => this.setState({ winners: w }));
    this.socket.on('winner-count', (c: number) => this.setState({ winnerCount: c }));
    this.socket.on('game-winner', (w: string) => this.setState({ gameWinner: w }));
    this.socket.on('showEndGame', () => this.setState({ showEndRoundBox: true }));

    this.socket.on('countdown', (c: number) => this.setState({ countdown: c }));
    this.socket.on('timer', (c: number) => this.setState({ timer: c }));
  }

  render() {
    return (
      <div className="App">
        <div className="header">
          <div className="title">GeoGuessr Pro Max+</div>
        </div>
        {this.state.roomState === RoomState.ROOM_404 && (
          <div>
            <div className="r404">404</div>
            <div className="r404-desc">ROOM NOT FOUND</div>
          </div>
        )}
        {this.state.roomState === RoomState.LOBBY && this.renderLobby()}
        {this.state.roomState === RoomState.GAME_OVER && this.renderWinnerScreen()}
        {this.state.roomState === RoomState.GAME && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '84%' }}>
              <progress value={this.state.timer} max={60}></progress>
              {this.renderWinners()}
              <MapContainer
                center={{ lat: 45, lng: 45 }}
                zoom={0}
                guessCallback={this.guess.bind(this)}
                ref={this.map}
                key={this.state.roundNum}
                right={'18vw'}
                block={this.state.wrongGuesses}
              ></MapContainer>
              {this.state.loc && (
                <StreetViewContainer
                  center={{ lat: 41.157398, lng: -73.356401 }}
                  zoom={0}
                  key={this.state.roundNum + 1}
                  loc={this.state.loc}
                ></StreetViewContainer>
              )}
            </div>
            {this.renderRoundResultBox()}
            <div className="room-info">
              <div className="players">
                <div className="players-header">Players</div>
                {this.renderPlayers()}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  guess(guess: string) {
    this.socket.emit('guess', guess);
    this.map.current.resetSelected();
  }

  streetViewDone() {}

  renderRoundResultBox() {
    if (!this.state.showEndRoundBox) return;

    if (this.state.winners.includes(this.state.id)) {
      return (
        <div className="round-result-container" style={{ width: '84%' }}>
          <div className="round-result correct">
            <div className="round-result-header correct">CORRECT</div>
            <div className="round-result-desc">
              {this.state.countdown === -1 ? 'Waiting for others...' : `Next round in ${this.state.countdown}`}
            </div>
          </div>
        </div>
      );
    }

    let guesses;
    this.state.players.forEach((p) => {
      if (p.id === this.state.id) guesses = p.lives;
    });

    if (guesses === 0) {
      return (
        <div className="round-result-container" style={{ width: '84%' }}>
          <div className="round-result incorrect">
            <div className="round-result-header incorrect" style={{ fontSize: '3vw' }}>
              OUT OF GUESSES
            </div>
            <div className="round-result-desc">
              {this.state.countdown === -1
                ? this.state.winners.length > 0
                  ? "You're out"
                  : "If nobody guesses it, you're still in"
                : `Next round in ${this.state.countdown}`}
            </div>
          </div>
        </div>
      );
    }

    if (this.state.winners.length === 0) {
      return (
        <div className="round-result-container" style={{ width: '84%' }}>
          <div className="round-result correct">
            <div className="round-result-header correct">NO WINNERS</div>
            <div className="round-result-desc">
              {this.state.countdown === -1 ? 'Nobody is out this round' : `Next round in ${this.state.countdown}`}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="round-result-container" style={{ width: '84%' }}>
        <div className="round-result incorrect">
          <div className="round-result-header incorrect">YOU'RE OUT</div>
          <div className="round-result-desc">
            {this.state.countdown === -1 ? 'All winners have been decided' : `Next round in ${this.state.countdown}`}
          </div>
        </div>
      </div>
    );
  }

  renderPlayers() {
    let i = 0;
    return this.state.players.map((p) => (
      <div key={i++} className={'player' + (p.state === PlayerState.WAITING ? ' waiting' : p.state === PlayerState.OUT ? ' out' : '')}>
        <div
          className={'game-player-circle' + (p.id === this.state.host ? ' host' : '')}
          style={{ background: p.iconColor, color: getColorByBgColor(p.iconColor) }}
        >
          {p.username.charAt(0)}
        </div>
        {p.username}
        <div className="game-player-lives">{p.state === PlayerState.OUT ? '-' : `${p.lives}/3`}</div>
      </div>
    ));
  }

  renderWinnerScreen() {
    const p = this.state.players.filter((p) => p.id === this.state.gameWinner)[0];
    if (!p) return <div></div>;

    return (
      <div className="game-winner">
        <div className="lobby-header">BATTLE ROYALE</div>
        <div className="lobby-room-code">Room Code: {this.props.match.params.room}</div>
        <div className="game-winner">
          <div
            className={'game-winner-circle' + (p.id === this.state.host ? ' host' : '')}
            style={{ background: p.iconColor, color: getColorByBgColor(p.iconColor) }}
          >
            {p.username.charAt(0)}
          </div>
          <div className="game-winner-name">{p.username} Wins!</div>
        </div>
        {this.state.host === this.state.id ? (
          <div
            className={'lobby-btn-start active'}
            onClick={() => {
              this.socket.emit('lobby');
            }}
          >
            Return to Lobby
          </div>
        ) : (
          <div className="lobby-waiting">Waiting for Host...</div>
        )}
      </div>
    );
  }

  renderLobby() {
    return (
      <div className="lobby">
        <div className="lobby-header">BATTLE ROYALE</div>
        <div className="lobby-room-code">Room Code: {this.props.match.params.room}</div>
        <div className="lobby-row">{this.renderLobbyRow(0, 4)}</div>
        <div className="lobby-row">{this.renderLobbyRow(4, 8)}</div>
        {this.state.host === this.state.id ? (
          <div
            className={'lobby-btn-start' + (this.state.players.length > 1 ? ' active' : '')}
            onClick={() => {
              this.socket.emit('start');
            }}
          >
            {this.state.players.length > 1 ? 'Start Game' : 'Waiting for Players'}
          </div>
        ) : (
          <div className="lobby-waiting">Waiting for Host...</div>
        )}
      </div>
    );
  }

  renderLobbyRow(min: number, max: number) {
    let arr = [];
    for (let i = min; i < max; i++) arr.push(this.renderLobbyPlayer(i));
    return arr;
  }

  renderLobbyPlayer(index: number) {
    if (this.state.players[index]) {
      return (
        <div className="lobby-player" key={index}>
          <div
            className={'lobby-player-circle' + (this.state.players[index].id === this.state.host ? ' host' : '')}
            style={{ background: this.state.players[index].iconColor, color: getColorByBgColor(this.state.players[index].iconColor) }}
          >
            {this.state.players[index].username.charAt(0)}
          </div>
          <div className="lobby-player-name">{this.state.players[index].username}</div>
        </div>
      );
    } else {
      return (
        <div className="lobby-player" key={index}>
          <div className="lobby-player-circle empty"></div>
        </div>
      );
    }
  }

  renderWinners() {
    let arr = [];
    for (let i = 0; i < this.state.winnerCount; i++) arr.push(this.renderWinnerCircle(i));
    return <div className="winners">{arr}</div>;
  }

  renderWinnerCircle(index: number) {
    if (this.state.winners.length <= index) {
      return (
        <div className="winner empty" key={index}>
          {index + 1}
        </div>
      );
    } else {
      let p = this.state.players.filter((p) => p.id === this.state.winners[index])[0];
      if (!p) return <div>Error</div>;

      return (
        <div className="winner" style={{ background: p.iconColor, color: getColorByBgColor(p.iconColor) }} key={index}>
          {p.username.charAt(0)}
        </div>
      );
    }
  }
}

function getColorByBgColor(bgColor: string) {
  if (!bgColor) {
    return '';
  }
  return parseInt(bgColor.replace('#', ''), 16) > 0xffffff / 2 ? '#000' : '#fff';
}
