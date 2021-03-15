import React from 'react';
import { io, Socket } from 'socket.io-client';

interface BattleRoyaleLandingState {
  showRoomCode: boolean;
  username: string;
  roomCode: string;

  shakeUsername: boolean;
  shakeRoomCode: boolean;
}

export default class BattleRoyaleLanding extends React.Component<any, BattleRoyaleLandingState> {
  socket: Socket | undefined = undefined;

  constructor(props: any) {
    super(props);

    this.state = {
      showRoomCode: false,
      username: '',
      roomCode: '',

      shakeUsername: false,
      shakeRoomCode: false,
    };
  }

  componentDidMount() {
    this.socket = io();

    this.socket.on('join', this.joinRoom.bind(this));
  }

  render() {
    return (
      <div className="App">
        <div className="header">
          <div className="title">GeoGuessr Pro Max+</div>
        </div>
        <div className="landing-header">BATTLE ROYALE</div>
        <div className="play">
          <div className="gamemode-wrapper" onClick={this.create.bind(this)}>
            <div className="gamemode">
              <div className="gamemode-lbl">CREATE</div>
              <div className="img-create gamemode-img"></div>
            </div>
          </div>
          <div className="gamemode-wrapper" onClick={this.join.bind(this)}>
            <div className="gamemode">
              <div className="gamemode-lbl">JOIN</div>
              <div className="img-join gamemode-img"></div>
            </div>
          </div>
        </div>
        <div className="push" style={{ height: '5vmin', width: '100%' }}></div>
        <input
          className={'input-username' + (this.state.shakeUsername ? ' shake' : '')}
          placeholder={'Username'}
          maxLength={7}
          value={this.state.username}
          onAnimationEnd={() => this.setState({ shakeUsername: false })}
          onChange={(e) => this.setState({ username: e.target.value })}
        ></input>
        {this.state.showRoomCode && (
          <input
            className={'input-room-code' + (this.state.shakeRoomCode ? ' shake' : '')}
            placeholder={'Room Code'}
            maxLength={8}
            value={this.state.roomCode}
            onAnimationEnd={() => this.setState({ shakeRoomCode: false })}
            onChange={(e) => this.setState({ roomCode: e.target.value })}
          ></input>
        )}
      </div>
    );
  }

  create() {
    this.socket?.emit('create-room');
  }

  join() {
    if (this.state.showRoomCode) {
      this.joinRoom(this.state.roomCode);
    }
    this.setState({ showRoomCode: true });
  }

  joinRoom(id: string) {
    if (this.state.username.length < 1) {
      this.setState({ shakeUsername: true });
      return;
    }

    if (id.length !== 8) {
      this.setState({ shakeRoomCode: true });
      return;
    }

    localStorage.setItem('username', this.state.username);
    window.location.href = '/br/' + id;
  }
}
