import React from 'react';
import { io, Socket } from 'socket.io-client';

export default class Home extends React.Component<any, any> {
  socket: Socket | undefined = undefined;

  componentDidMount() {
    this.socket = io();

    this.socket.on('join', this.join);
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
          <div className="gamemode-wrapper">
            <div className="gamemode">
              <div className="gamemode-lbl">JOIN</div>
              <div className="img-join gamemode-img"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  create() {
    this.socket?.emit('create-room');
  }

  join(msg: string) {
    console.log("Create Room cmd Received: " + msg);
    window.location.href = '/br/' + msg;
  }
}
